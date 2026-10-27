"""Unit tests for Benchmark Runner Executor and Safety Validation."""
import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.core.database import init_db
from apps.api.src.main import app
from apps.api.src.runner.executor import BenchmarkSafetyViolation, executor


@pytest.mark.asyncio
async def test_safety_gate_denies_tier_1_read_only():
    """Verify that tier_1_read_only connections are strictly forbidden from benchmark runs."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a Tier 1 (Production Read-Only) Connection
        conn_payload = {
            "name": "Production Master Read-Only",
            "engine": "postgresql",
            "host": "prod-db.internal",
            "port": 5432,
            "database_name": "prod_users",
            "username": "trafiora_monitor",
            "password": "SecretPassword123!",
            "operational_tier": "tier_1_read_only",
            "is_disposable_sandbox": False,
        }
        conn_res = await client.post("/api/v1/connections", json=conn_payload)
        assert conn_res.status_code == 201
        tier_1_conn_id = conn_res.json()["id"]

        # 2. Create a Workload Scenario
        scen_payload = {
            "name": "Heavy Skew Spike",
            "scenario_type": "viral_post_spike",
            "config": {
                "vus": 20,
                "duration_seconds": 10,
                "zipf_alpha": 1.5,
                "read_write_ratio": 0.9,
            },
        }
        scen_res = await client.post("/api/v1/scenarios", json=scen_payload)
        assert scen_res.status_code == 201
        scen_id = scen_res.json()["id"]

        # 3. Attempt to dispatch experiment on Tier 1 connection -> MUST BE 403 FORBIDDEN
        exp_payload = {
            "name": "Illegal Run on Prod",
            "connection_id": tier_1_conn_id,
            "scenario_id": scen_id,
            "repetitions_planned": 3,
        }
        exp_res = await client.post("/api/v1/experiments", json=exp_payload)
        assert exp_res.status_code == 403
        assert "Cannot execute benchmarks on Connection" in exp_res.json()["detail"]


@pytest.mark.asyncio
async def test_successful_experiment_run_on_tier_2():
    """Verify that tier_2_authorized_test connections allow benchmark execution with statistical metrics."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Tier 2 (Authorized Test Target) Connection
        conn_payload = {
            "name": "Staging Perf Test Postgres",
            "engine": "postgresql",
            "host": "staging-db.internal",
            "port": 5432,
            "database_name": "test_app",
            "username": "trafiora_benchmark_runner",
            "password": "BenchmarkPassword123!",
            "operational_tier": "tier_2_workload_benchmark",
            "is_disposable_sandbox": True,
        }

        conn_res = await client.post("/api/v1/connections", json=conn_payload)
        assert conn_res.status_code == 201
        conn_id = conn_res.json()["id"]

        # 2. Create Scenario
        scen_payload = {
            "name": "Pagination Load",
            "scenario_type": "unindexed_pagination",
            "config": {"vus": 5, "duration_seconds": 5, "zipf_alpha": 0.0},
        }
        scen_res = await client.post("/api/v1/scenarios", json=scen_payload)
        scen_id = scen_res.json()["id"]

        # 3. Dispatch Baseline Experiment
        exp_payload = {
            "name": "Baseline Unindexed Run",
            "connection_id": conn_id,
            "scenario_id": scen_id,
            "is_baseline": True,
            "repetitions_planned": 3,
        }
        exp_res = await client.post("/api/v1/experiments", json=exp_payload)
        assert exp_res.status_code == 201
        exp_id = exp_res.json()["id"]

        # 4. Wait for background execution to complete
        for _ in range(50):
            await asyncio.sleep(0.1)
            get_res = await client.get(f"/api/v1/experiments/{exp_id}")
            if get_res.json()["status"] in ["COMPLETED", "FAILED"]:
                break

        completed = (await client.get(f"/api/v1/experiments/{exp_id}")).json()
        assert completed["status"] == "COMPLETED"
        assert completed["repetitions_completed"] == 3
        assert "tps" in completed["summary_metrics"]
        assert "latency_p95_ms" in completed["summary_metrics"]
        assert "confidence_interval_95" in completed["summary_metrics"]
