"""Unit tests for ExplainPlanParser and /api/v1/plans/inspect endpoint."""
import json
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.adapters.plan_parser import plan_parser
from apps.api.src.main import app

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "fixtures" / "sample_explain_plans.json"


def test_explain_plan_parser_diagnostics() -> None:
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        raw_plan = json.load(f)

    res = plan_parser.parse(raw_plan)
    assert res["node_count"] == 4
    assert res["total_cost"] == 1420.75
    assert res["sequential_scan_count"] == 1
    assert res["has_high_cost_seq_scan"] is True
    assert "posts" in res["flagged_tables"]
    # 450 hit + 120 hit = 570, 50 read -> hit ratio = 570 / 620 ≈ 0.919
    assert res["buffer_hit_ratio"] > 0.90


@pytest.mark.asyncio
async def test_inspect_plan_endpoint() -> None:
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        raw_plan = json.load(f)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/plans/inspect", json={"raw_plan_json": raw_plan})
        assert response.status_code == 200
        data = response.json()
        assert data["sequential_scan_count"] == 1
        assert "posts" in data["flagged_tables"]
        assert "root_node" in data
        assert data["root_node"]["node_type"] == "Hash Join"
