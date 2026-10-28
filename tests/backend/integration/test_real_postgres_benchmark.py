"""Real PostgreSQL Engine Integration Test Suite.

Provisions and validates live benchmark execution against a real PostgreSQL 18 database engine.
Runs against the PostgreSQL 18 service container in GitHub Actions CI, or against a local
PostgreSQL 18 instance when available.

Validates:
1. Live database capability probing and pg_stat_statements detection.
2. Real SQL execution and concurrent worker pool execution.
3. Genuine latency measurement (tps, p50, p90, p95, p99) without multiplier estimations.
4. Truthful source attribution (PSYCOPG_NATIVE_POOL / PGBENCH_SUBPROCESS, is_simulated=False).
5. Baseline vs candidate experiment comparison with statistical outcome classification.
6. Clean resource teardown (never targets production databases).
"""
import asyncio
import os
import pytest
from httpx import AsyncClient, ASGITransport
import psycopg

from apps.api.src.main import app
from apps.api.src.core.database import init_db
from apps.api.src.schemas.connection import OperationalTier

pytestmark = [pytest.mark.real_postgres]

TEST_PG_HOST = os.environ.get("TEST_POSTGRES_HOST", "127.0.0.1")
TEST_PG_PORT = int(os.environ.get("TEST_POSTGRES_PORT", "5432"))
TEST_PG_USER = os.environ.get("TEST_POSTGRES_USER", "trafiora_tester")
TEST_PG_PASSWORD = os.environ.get("TEST_POSTGRES_PASSWORD", "trafiora_test_password")
TEST_PG_DB = os.environ.get("TEST_POSTGRES_DB", "trafiora_test_db")


async def _probe_real_postgres() -> bool:
    """Checks whether a real PostgreSQL engine is reachable at the configured target."""
    conninfo = (
        f"host={TEST_PG_HOST} port={TEST_PG_PORT} user={TEST_PG_USER} "
        f"password={TEST_PG_PASSWORD} dbname={TEST_PG_DB} connect_timeout=1 sslmode=prefer"
    )
    try:
        conn = await psycopg.AsyncConnection.connect(conninfo, autocommit=True, prepare_threshold=None)
        async with conn.cursor() as cur:
            await cur.execute("SELECT version();")
            row = await cur.fetchone()
            if not row or "PostgreSQL" not in row[0]:
                await conn.close()
                return False
        await conn.close()
        return True
    except Exception:
        return False


@pytest.mark.asyncio
async def test_real_postgres_engine_benchmark_lifecycle() -> None:
    """Executes live benchmark against a real PostgreSQL 18 engine, verifying genuine measurements."""
    is_live = await _probe_real_postgres()
    if not is_live:
        pytest.skip(
            f"Real PostgreSQL engine is not accessible at {TEST_PG_HOST}:{TEST_PG_PORT}. "
            "Skipping local execution. (This test executes in GitHub Actions CI using the postgres:18 service container.)"
        )

    await init_db()

    conninfo = (
        f"host={TEST_PG_HOST} port={TEST_PG_PORT} user={TEST_PG_USER} "
        f"password={TEST_PG_PASSWORD} dbname={TEST_PG_DB} connect_timeout=3 sslmode=prefer"
    )

    # 1. Initialize reproducible test dataset on the real engine
    setup_conn = await psycopg.AsyncConnection.connect(conninfo, autocommit=True, prepare_threshold=None)
    try:
        async with setup_conn.cursor() as cur:
            # Enable pg_stat_statements extension
            await cur.execute("CREATE EXTENSION IF NOT EXISTS pg_stat_statements;")
            # Create disposable test table
            await cur.execute("DROP TABLE IF EXISTS trafiora_real_bench_items;")
            await cur.execute(
                """
                CREATE TABLE trafiora_real_bench_items (
                    id SERIAL PRIMARY KEY,
                    tenant_id INT NOT NULL,
                    sku VARCHAR(64) NOT NULL,
                    price NUMERIC(10, 2) NOT NULL,
                    payload TEXT NOT NULL
                );
                """
            )
            # Insert reproducible seed rows
            await cur.execute(
                """
                INSERT INTO trafiora_real_bench_items (tenant_id, sku, price, payload)
                SELECT
                    (i % 20) + 1,
                    'SKU-' || i,
                    round((random() * 500 + 10)::numeric, 2),
                    repeat('catalog_data_', 5)
                FROM generate_series(1, 1000) AS i;
                """
            )
    finally:
        await setup_conn.close()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        try:
            # 2. Register real PostgreSQL connection (Tier 2 Authorized Test Target)
            conn_payload = {
                "name": "Live PostgreSQL 18 Service Target",
                "host": TEST_PG_HOST,
                "port": TEST_PG_PORT,
                "database_name": TEST_PG_DB,
                "username": TEST_PG_USER,
                "password": TEST_PG_PASSWORD,
                "ssl_mode": "prefer",
                "operational_tier": OperationalTier.TIER_2_WORKLOAD_BENCHMARK.value,
                "is_disposable_sandbox": True,
            }
            conn_resp = await client.post("/api/v1/connections", json=conn_payload)
            assert conn_resp.status_code == 201, conn_resp.text
            connection_id = conn_resp.json()["id"]

            # 3. Probe capabilities on real engine
            probe_resp = await client.post(f"/api/v1/connections/{connection_id}/probe")
            assert probe_resp.status_code == 200, probe_resp.text
            probe_data = probe_resp.json()
            assert probe_data["connected"] is True
            assert probe_data["engine"] == "postgresql"
            assert probe_data["is_wire_emulator"] is False
            assert probe_data["target_certified"] is True  # PostgreSQL 18
            assert probe_data["has_pg_stat_statements"] is True

            # 4. Fetch live catalog telemetry
            telem_resp = await client.get(f"/api/v1/connections/{connection_id}/telemetry")
            assert telem_resp.status_code == 200, telem_resp.text
            telem = telem_resp.json()["telemetry"]
            assert telem["connected"] is True
            assert telem["status"] == "ONLINE"
            assert telem["measurement_source"] == "POSTGRES_CATALOG"
            assert telem["is_simulated"] is False
            assert telem["buffer_cache_hit_ratio"] is not None
            assert telem["buffer_cache_hit_ratio"] >= 0.0

            # 5. Create realistic query workload scenario
            scenario_payload = {
                "name": "Live Real Query Spike",
                "description": "Multi-query workload scenario on real PostgreSQL",
                "scenario_type": "viral_post_spike",
                "config": {
                    "vus": 4,
                    "duration_seconds": 5,
                    "warmup_seconds": 0,
                    "zipf_alpha": 1.2,
                    "query_templates": [
                        "SELECT * FROM trafiora_real_bench_items WHERE id = $1;",
                        "SELECT count(*), avg(price) FROM trafiora_real_bench_items WHERE tenant_id = 7;",
                    ],
                },
            }
            scen_resp = await client.post("/api/v1/scenarios", json=scenario_payload)
            assert scen_resp.status_code == 201, scen_resp.text
            scenario_id = scen_resp.json()["id"]

            # 6. Execute Baseline Experiment against real PostgreSQL engine
            base_exp_payload = {
                "name": "Real Engine Baseline",
                "connection_id": connection_id,
                "scenario_id": scenario_id,
                "is_baseline": True,
                "repetitions_planned": 2,
            }
            base_resp = await client.post("/api/v1/experiments", json=base_exp_payload)
            assert base_resp.status_code == 201, base_resp.text
            base_id = base_resp.json()["id"]

            # Poll for baseline completion
            for _ in range(60):
                await asyncio.sleep(0.5)
                get_base = await client.get(f"/api/v1/experiments/{base_id}")
                if get_base.json().get("status") in ["COMPLETED", "FAILED"]:
                    break
            base_data = (await client.get(f"/api/v1/experiments/{base_id}")).json()
            assert base_data["status"] == "COMPLETED", f"Baseline run failed: {base_data.get('error_message')}"
            assert base_data["repetitions_completed"] == 2

            base_metrics = base_data["summary_metrics"]
            assert base_metrics["tps"] > 0
            assert base_metrics["is_simulated"] is False
            assert base_metrics["measurement_source"] in ["PSYCOPG_NATIVE_POOL", "PGBENCH_SUBPROCESS"]
            assert base_metrics["latency_p50_ms"] is not None and base_metrics["latency_p50_ms"] > 0
            assert base_metrics["latency_p90_ms"] is not None and base_metrics["latency_p90_ms"] > 0
            assert base_metrics["latency_p95_ms"] is not None and base_metrics["latency_p95_ms"] > 0
            assert base_metrics["latency_p99_ms"] is not None and base_metrics["latency_p99_ms"] > 0
            # Honest percentiles ordering
            assert base_metrics["latency_p95_ms"] >= base_metrics["latency_p50_ms"]
            assert base_metrics["buffer_hit_ratio"] is not None

            # 7. Apply indexing optimization on live engine for Candidate comparison
            idx_conn = await psycopg.AsyncConnection.connect(conninfo, autocommit=True, prepare_threshold=None)
            try:
                async with idx_conn.cursor() as cur:
                    await cur.execute(
                        "CREATE INDEX IF NOT EXISTS idx_real_tenant ON trafiora_real_bench_items(tenant_id);"
                    )
            finally:
                await idx_conn.close()

            # 8. Execute Candidate Experiment comparing against Baseline
            cand_exp_payload = {
                "name": "Real Engine Candidate (Indexed)",
                "connection_id": connection_id,
                "scenario_id": scenario_id,
                "is_baseline": False,
                "baseline_id": base_id,
                "repetitions_planned": 2,
            }
            cand_resp = await client.post("/api/v1/experiments", json=cand_exp_payload)
            assert cand_resp.status_code == 201, cand_resp.text
            cand_id = cand_resp.json()["id"]

            for _ in range(60):
                await asyncio.sleep(0.5)
                get_cand = await client.get(f"/api/v1/experiments/{cand_id}")
                if get_cand.json().get("status") in ["COMPLETED", "FAILED"]:
                    break
            cand_data = (await client.get(f"/api/v1/experiments/{cand_id}")).json()
            assert cand_data["status"] == "COMPLETED", f"Candidate run failed: {cand_data.get('error_message')}"
            assert cand_data["repetitions_completed"] == 2
            assert cand_data["baseline_id"] == base_id
            assert cand_data["outcome_classification"] in [
                "MEASURED_IMPROVEMENT",
                "NO_MATERIAL_CHANGE",
                "REGRESSION_DETECTED",
                "INCONCLUSIVE_HIGH_VARIANCE",
            ]
            cand_metrics = cand_data["summary_metrics"]
            assert cand_metrics["is_simulated"] is False
            assert cand_metrics["measurement_source"] in ["PSYCOPG_NATIVE_POOL", "PGBENCH_SUBPROCESS"]

        finally:
            # 9. Clean up test table on the live database engine
            cleanup_conn = None
            try:
                cleanup_conn = await psycopg.AsyncConnection.connect(conninfo, autocommit=True, prepare_threshold=None)
                async with cleanup_conn.cursor() as cur:
                    await cur.execute("DROP TABLE IF EXISTS trafiora_real_bench_items;")
            except Exception:
                pass
            finally:
                if cleanup_conn is not None:
                    await cleanup_conn.close()
