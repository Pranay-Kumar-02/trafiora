"""Protocol-emulator resilience and wire-protocol handling test suite.

Validates client protocol negotiation, network failure resilience, and API error states
using the in-process mock wire server DisposablePostgresServer.

IMPORTANT:
These tests exercise the wire protocol emulator. Canned emulator responses are strictly
labelled as WIRE_EMULATOR_SANDBOX / is_simulated=True and are NEVER claimed as real PostgreSQL
database performance measurements.
"""
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from apps.api.src.main import app
from apps.api.src.core.database import init_db
from apps.api.src.schemas.connection import OperationalTier
from tests.fixtures.disposable_postgres import DisposablePostgresServer

pytestmark = [pytest.mark.emulator]


@pytest.mark.asyncio
async def test_wire_emulator_protocol_resilience_and_lifecycle() -> None:
    """Verifies that the API handles wire-protocol emulation, labels canned data honestly,

    and gracefully degrades when the emulator is terminated.
    """
    await init_db()
    # 1. Start disposable PostgreSQL wire-protocol emulator
    pg_server = DisposablePostgresServer(host="127.0.0.1", port=0)
    await pg_server.start()
    server_port = pg_server.port

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            # 2. Register target connection pointing to the wire-protocol emulator
            conn_payload = {
                "name": "Protocol Emulator Sandbox Target",
                "host": "127.0.0.1",
                "port": server_port,
                "database_name": "disposable_test",
                "username": "postgres",
                "password": "postgres",
                "ssl_mode": "disable",
                "operational_tier": OperationalTier.TIER_2_WORKLOAD_BENCHMARK.value,
                "is_disposable_sandbox": True,
            }
            conn_resp = await client.post("/api/v1/connections", json=conn_payload)
            assert conn_resp.status_code == 201, conn_resp.text
            conn_data = conn_resp.json()
            connection_id = conn_data["id"]

            # 3. Probe capabilities against wire emulator
            probe_resp = await client.post(f"/api/v1/connections/{connection_id}/probe")
            assert probe_resp.status_code == 200, probe_resp.text
            probe_data = probe_resp.json()
            assert probe_data["connected"] is True
            assert "18" in probe_data["server_version"]
            assert probe_data["is_wire_emulator"] is True
            assert probe_data["has_pg_stat_statements"] is True

            # 4. Inspect live telemetry - MUST be labelled as WIRE_EMULATOR_SANDBOX
            telemetry_resp = await client.get(f"/api/v1/connections/{connection_id}/telemetry")
            assert telemetry_resp.status_code == 200, telemetry_resp.text
            telemetry_data = telemetry_resp.json()["telemetry"]
            assert telemetry_data["connected"] is True
            assert telemetry_data["status"] == "ONLINE"
            assert telemetry_data["measurement_source"] == "WIRE_EMULATOR_SANDBOX"
            assert telemetry_data["is_simulated"] is True
            assert telemetry_data["buffer_cache_hit_ratio"] == 99.4

            # 5. Inspect slow queries - MUST be labelled as WIRE_EMULATOR_SANDBOX
            queries_resp = await client.get(f"/api/v1/connections/{connection_id}/queries")
            assert queries_resp.status_code == 200, queries_resp.text
            queries_data = queries_resp.json()
            assert queries_data["has_pg_stat_statements"] is True
            assert queries_data["is_simulated"] is True
            assert queries_data["measurement_source"] == "WIRE_EMULATOR_SANDBOX"
            assert len(queries_data["queries"]) == 2

            # 6. Check active target status endpoint
            active_resp = await client.get("/api/v1/connections/active/status")
            assert active_resp.status_code == 200, active_resp.text
            active_data = active_resp.json()
            assert active_data["has_connection"] is True
            assert active_data["connection"]["id"] == connection_id

            # 7. Create workload scenario
            scenario_payload = {
                "name": "Emulator Resilience Scenario",
                "description": "Wire protocol workload test",
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

            # 8. Dispatch baseline experiment against wire emulator
            base_exp_payload = {
                "name": "Emulator Baseline Run",
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

            # Verify emulator results are labelled honestly (is_simulated=True, WIRE_EMULATOR_SANDBOX)
            base_data = check_resp.json()
            assert base_data["status"] == "COMPLETED", f"Baseline run failed: {base_data.get('error_message')}"
            assert base_data["repetitions_completed"] == 1
            metrics = base_data["summary_metrics"]
            assert metrics["tps"] > 0
            assert metrics["is_simulated"] is True
            assert metrics["measurement_source"] == "WIRE_EMULATOR_SANDBOX"
            assert metrics["latency_p50_ms"] is not None
            assert metrics["latency_p90_ms"] is not None
            assert metrics["latency_p95_ms"] is not None
            assert metrics["latency_p99_ms"] is not None

            # 9. Verify offline/unavailable behavior: stop wire emulator
            await pg_server.stop()

            # Now probe should report disconnected, never invent numbers
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

            # Queries returns empty list and UNAVAILABLE source
            offline_queries = await client.get(f"/api/v1/connections/{connection_id}/queries")
            assert offline_queries.status_code == 200
            offline_queries_data = offline_queries.json()
            assert offline_queries_data["measurement_source"] == "UNAVAILABLE"
            assert offline_queries_data["queries"] == []

        finally:
            if pg_server.is_running:
                await pg_server.stop()
