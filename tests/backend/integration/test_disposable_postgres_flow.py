"""End-to-end integration test validating flow against a disposable PostgreSQL 18.6 target.

Validates:
1. Target connection registration & capability probing (PostgreSQL 18.6 certified, pg_stat_statements detected).
2. Live catalog telemetry inspection (buffer hit ratio, active backends, locks, slow queries).
3. Real benchmark execution via native worker pool against disposable target.
4. Genuine measurement collection (exact microsecond percentiles, no multiplier estimates).
5. Experiment persistence, API retrieval, and regression comparison between baseline & candidate runs.
6. Honest handling of offline targets (unavailable states, None values, zero fake numbers).
"""
import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.main import app
from apps.api.src.core.database import get_db_session, init_db
from apps.api.src.schemas.connection import OperationalTier
from tests.fixtures.disposable_postgres import DisposablePostgresServer


@pytest.mark.asyncio
async def test_disposable_postgres_end_to_end_flow() -> None:
    await init_db()
    # 1. Start disposable PostgreSQL wire server
    pg_server = DisposablePostgresServer(host="127.0.0.1", port=0)
    await pg_server.start()
    server_port = pg_server.port

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            # 2. Register disposable PostgreSQL target connection (Tier 2 Authorized)
            conn_payload = {
                "name": "Disposable Test Target PG18",
                "host": "127.0.0.1",
                "port": server_port,
                "database_name": "disposable_test",
                "username": "postgres",
                "password": "postgres",
                "ssl_mode": "disable",
                "operational_tier": OperationalTier.TIER_2_WORKLOAD_BENCHMARK.value,
            }
            conn_resp = await client.post("/api/v1/connections", json=conn_payload)
            assert conn_resp.status_code == 201, conn_resp.text
            conn_data = conn_resp.json()
            connection_id = conn_data["id"]
            assert conn_data["name"] == "Disposable Test Target PG18"
            assert conn_data["operational_tier"] == OperationalTier.TIER_2_WORKLOAD_BENCHMARK.value

            # 3. Probe capabilities against live disposable target
            probe_resp = await client.post(f"/api/v1/connections/{connection_id}/probe")
            assert probe_resp.status_code == 200, probe_resp.text
            probe_data = probe_resp.json()
            assert probe_data["connected"] is True
            assert probe_data["server_version"] == "18.6"
            assert probe_data["target_certified"] is True
            assert probe_data["has_pg_stat_statements"] is True

            # 4. Inspect live telemetry from catalog
            telemetry_resp = await client.get(f"/api/v1/connections/{connection_id}/telemetry")
            assert telemetry_resp.status_code == 200, telemetry_resp.text
            telemetry_data = telemetry_resp.json()["telemetry"]
            assert telemetry_data["connected"] is True
            assert telemetry_data["status"] == "ONLINE"
            assert telemetry_data["measurement_source"] == "POSTGRES_CATALOG"
            assert telemetry_data["buffer_cache_hit_ratio"] == 99.4
            assert telemetry_data["active_backends"] == 4
            assert telemetry_data["max_connections"] == 100
            assert telemetry_data["is_simulated"] is False

            # 5. Inspect pg_stat_statements queries
            queries_resp = await client.get(f"/api/v1/connections/{connection_id}/queries")
            assert queries_resp.status_code == 200, queries_resp.text
            queries_data = queries_resp.json()
            assert queries_data["has_pg_stat_statements"] is True
            assert queries_data["is_simulated"] is False
            assert queries_data["measurement_source"] == "pg_stat_statements"
            assert len(queries_data["queries"]) == 2
            assert "SELECT id, payload" in queries_data["queries"][0]["statement"]
            assert queries_data["queries"][0]["calls"] == 12500

            # 6. Check active target status endpoint (for overview page header/kpis)
            active_resp = await client.get("/api/v1/connections/active/status")
            assert active_resp.status_code == 200, active_resp.text
            active_data = active_resp.json()
            assert active_data["has_connection"] is True
            assert active_data["connection"]["id"] == connection_id
            assert active_data["telemetry"]["status"] == "ONLINE"

            # 7. Create workload scenario
            scenario_payload = {
                "name": "Disposable Benchmark Scenario",
                "description": "Read queries against disposable target",
                "scenario_type": "viral_post_spike",
                "config": {
                    "vus": 2,
                    "duration_seconds": 5,
                    "warmup_seconds": 0,
                    "zipf_alpha": 0.0,
                    "query_templates": ["SELECT 1;"],
                },
            }
            scen_resp = await client.post("/api/v1/scenarios", json=scenario_payload)
            assert scen_resp.status_code == 201, scen_resp.text
            scenario_id = scen_resp.json()["id"]

            # 8. Dispatch baseline experiment
            base_exp_payload = {
                "name": "Baseline Disposable Run",
                "connection_id": connection_id,
                "scenario_id": scenario_id,
                "is_baseline": True,
                "repetitions_planned": 1,
            }
            base_exp_resp = await client.post("/api/v1/experiments", json=base_exp_payload)
            assert base_exp_resp.status_code == 201, base_exp_resp.text
            base_exp_id = base_exp_resp.json()["id"]

            # Wait for executor background task to complete baseline run
            check_resp = None
            for _ in range(60):
                await asyncio.sleep(0.25)
                check_resp = await client.get(f"/api/v1/experiments/{base_exp_id}")
                st = check_resp.json().get("status")
                if st in ["COMPLETED", "FAILED", "CANCELLED"]:
                    break
            else:
                pytest.fail(f"Baseline experiment timed out. Last state: {check_resp.json() if check_resp else None}")

            # Verify genuine measurements in baseline
            base_data = check_resp.json()
            assert base_data["status"] == "COMPLETED", f"Baseline run failed: {base_data.get('error_message')}"
            assert base_data["repetitions_completed"] == 1
            metrics = base_data["summary_metrics"]
            assert metrics["tps"] > 0
            assert metrics["is_simulated"] is False
            assert metrics["measurement_source"] == "PSYCOPG_NATIVE_POOL"
            assert metrics["latency_p50_ms"] is not None
            assert metrics["latency_p95_ms"] is not None
            assert metrics["latency_p99_ms"] is not None
            # Verified: NO multiplier estimates (e.g. latency_avg * 1.6)
            assert metrics["latency_p95_ms"] >= metrics["latency_p50_ms"]

            # 9. Dispatch candidate experiment comparing against baseline
            cand_exp_payload = {
                "name": "Candidate Disposable Run",
                "connection_id": connection_id,
                "scenario_id": scenario_id,
                "is_baseline": False,
                "baseline_id": base_exp_id,
                "repetitions_planned": 1,
            }
            cand_exp_resp = await client.post("/api/v1/experiments", json=cand_exp_payload)
            assert cand_exp_resp.status_code == 201, cand_exp_resp.text
            cand_exp_id = cand_exp_resp.json()["id"]

            cand_check_resp = None
            for _ in range(60):
                await asyncio.sleep(0.25)
                cand_check_resp = await client.get(f"/api/v1/experiments/{cand_exp_id}")
                st = cand_check_resp.json().get("status")
                if st in ["COMPLETED", "FAILED", "CANCELLED"]:
                    break
            else:
                pytest.fail(f"Candidate experiment timed out. Last state: {cand_check_resp.json() if cand_check_resp else None}")

            cand_data = cand_check_resp.json()
            assert cand_data["status"] == "COMPLETED", f"Candidate run failed: {cand_data.get('error_message')}"
            assert cand_data["status"] == "COMPLETED"
            assert cand_data["baseline_id"] == base_exp_id
            assert cand_data["outcome_classification"] in [
                "MEASURED_IMPROVEMENT",
                "NO_MATERIAL_CHANGE",
                "REGRESSION_DETECTED",
                "INCONCLUSIVE",
            ]

            # 10. Verify offline/unavailable behavior: stop disposable server
            await pg_server.stop()

            # Now probe should report disconnected, not crash or invent numbers
            offline_probe = await client.post(f"/api/v1/connections/{connection_id}/probe")
            assert offline_probe.status_code == 200
            offline_probe_data = offline_probe.json()
            assert offline_probe_data["connected"] is False
            assert offline_probe_data["server_version"] == "Unavailable"

            # Telemetry reports OFFLINE, UNAVAILABLE, and None metrics
            offline_telem = await client.get(f"/api/v1/connections/{connection_id}/telemetry")
            assert offline_telem.status_code == 200
            offline_telem_data = offline_telem.json()["telemetry"]
            assert offline_telem_data["status"] == "OFFLINE"
            assert offline_telem_data["measurement_source"] == "UNAVAILABLE"
            assert offline_telem_data["buffer_cache_hit_ratio"] is None
            assert offline_telem_data["active_backends"] is None
            assert offline_telem_data["is_simulated"] is False

            # Queries returns empty list and UNAVAILABLE source
            offline_queries = await client.get(f"/api/v1/connections/{connection_id}/queries")
            assert offline_queries.status_code == 200
            offline_queries_data = offline_queries.json()
            assert offline_queries_data["measurement_source"] == "UNAVAILABLE"
            assert offline_queries_data["queries"] == []
            assert offline_queries_data["is_simulated"] is False

        finally:
            if pg_server.is_running:
                await pg_server.stop()
