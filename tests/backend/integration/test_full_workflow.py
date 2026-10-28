"""End-to-End Workflow Integration Test Suite.
Validates the complete 5-step loop: Observe -> Diagnose -> Reproduce -> Compare -> Protect.
"""
import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.core.database import init_db
from apps.api.src.core.security import vault
from apps.api.src.main import app
from packages.cli.trafiora_ci.evaluator import RegressionEvaluator


@pytest.mark.asyncio
async def test_complete_product_workflow():
    """Executes the full product flow from connection registration to benchmark evaluation and protection generation."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # STEP 1: Register Authorized Test Connection (Observe)
        conn_payload = {
            "name": "Integration Staging DB",
            "engine": "postgresql",
            "host": "staging-db.internal",
            "port": 5432,
            "database_name": "app_db",
            "username": "trafiora_benchmark_runner",
            "password": "SecretStagingPassword123!",
            "operational_tier": "tier_2_workload_benchmark",
            "is_disposable_sandbox": True,
        }
        conn_res = await client.post("/api/v1/connections", json=conn_payload)
        assert conn_res.status_code == 201
        conn_data = conn_res.json()
        conn_id = conn_data["id"]
        assert "password" not in conn_data
        assert "encrypted_password" not in conn_data

        # STEP 2: Normalize and Fingerprint Incoming Queries (Diagnose)
        raw_sql = "SELECT id, title, content FROM posts WHERE user_id = 999 AND status = 'published' LIMIT 50"
        norm_res = await client.post("/api/v1/queries/normalize", json={"raw_sql": raw_sql})
        assert norm_res.status_code == 200
        norm_data = norm_res.json()
        assert norm_data["statement_type"] == "SELECT"
        assert "posts" in norm_data["tables"]
        assert len(norm_data["fingerprint"]) == 64


        # STEP 3: Inspect Execution Plan and Generate Optimization Advice (Diagnose)
        plan_payload = {
            "plan_dict": {
                "Plan": {
                    "Node Type": "Seq Scan",
                    "Relation Name": "posts",
                    "Total Cost": 850.0,
                    "Filter": "(user_id = 999)",
                }
            },
            "query_sql": raw_sql,
            "calls": 5000,
            "mean_exec_time_ms": 25.0,
        }
        diag_res = await client.post("/api/v1/diagnosis/analyze", json=plan_payload)
        assert diag_res.status_code == 200
        diag_data = diag_res.json()
        assert len(diag_data["recommendations"]) >= 1
        rec = diag_data["recommendations"][0]
        assert "CREATE INDEX CONCURRENTLY" in rec["suggested_ddl"]
        assert rec["is_verified"] is False  # Must not claim verified yet

        # STEP 4: Configure Workload Scenario (Reproduce)
        scen_payload = {
            "name": "E2E Viral Traffic Surge",
            "scenario_type": "viral_post_spike",
            "config": {
                "vus": 15,
                "duration_seconds": 5,
                "warmup_seconds": 1,
                "zipf_alpha": 1.4,
                "read_write_ratio": 0.9,
                "query_templates": ["SELECT * FROM posts WHERE id = $1"],
            },
        }
        scen_res = await client.post("/api/v1/scenarios", json=scen_payload)
        assert scen_res.status_code == 201
        scen_id = scen_res.json()["id"]

        # STEP 5: Dispatch Baseline Benchmark Run (Prove / Compare)
        base_exp_payload = {
            "name": "E2E Baseline Experiment",
            "connection_id": conn_id,
            "scenario_id": scen_id,
            "is_baseline": True,
            "repetitions_planned": 3,
        }
        base_exp_res = await client.post("/api/v1/experiments", json=base_exp_payload)
        assert base_exp_res.status_code == 201
        base_exp_id = base_exp_res.json()["id"]

        # Wait for baseline completion
        for _ in range(50):
            await asyncio.sleep(0.1)
            get_b = await client.get(f"/api/v1/experiments/{base_exp_id}")
            if get_b.json()["status"] in ["COMPLETED", "FAILED"]:
                break
        base_completed = (await client.get(f"/api/v1/experiments/{base_exp_id}")).json()
        assert base_completed["status"] == "COMPLETED"
        assert base_completed["repetitions_completed"] == 3

        # STEP 6: Dispatch Candidate Benchmark Run referencing Baseline (Compare)
        cand_exp_payload = {
            "name": "E2E Candidate Run (With Index)",
            "connection_id": conn_id,
            "scenario_id": scen_id,
            "is_baseline": False,
            "baseline_id": base_exp_id,
            "repetitions_planned": 3,
        }
        cand_exp_res = await client.post("/api/v1/experiments", json=cand_exp_payload)
        assert cand_exp_res.status_code == 201
        cand_exp_id = cand_exp_res.json()["id"]

        # Wait for candidate completion
        for _ in range(50):
            await asyncio.sleep(0.1)
            get_c = await client.get(f"/api/v1/experiments/{cand_exp_id}")
            if get_c.json()["status"] in ["COMPLETED", "FAILED"]:
                break
        cand_completed = (await client.get(f"/api/v1/experiments/{cand_exp_id}")).json()
        assert cand_completed["status"] == "COMPLETED"
        assert "latency_p95_ms" in cand_completed["summary_metrics"]

        # STEP 7: Generate Overload Protection & Pool Sizing (Protect)
        protect_payload = {
            "arrival_qps": 1200.0,
            "mean_latency_ms": cand_completed["summary_metrics"]["latency_p95_ms"] or 15.0,
            "cpu_cores": 8,
            "disk_type": "ssd",
            "max_client_connections": 1500,
        }
        prot_res = await client.post("/api/v1/protection/generate", json=protect_payload)
        assert prot_res.status_code == 200
        prot_data = prot_res.json()
        assert prot_data["recommended_pool_size"] >= 10
        assert "pool_mode = transaction" in prot_data["pgbouncer_ini_content"]

        # STEP 8: Evaluate CI Regression Gating Tool (Protect)
        eval_res = RegressionEvaluator.evaluate(
            base_completed["summary_metrics"],
            cand_completed["summary_metrics"],
        )
        assert eval_res.markdown_report != ""
        assert "Trafiora Performance Regression Gate" in eval_res.markdown_report
