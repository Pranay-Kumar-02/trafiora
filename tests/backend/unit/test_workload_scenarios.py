"""Unit tests for workload scenario models and API endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.main import app
from apps.api.src.schemas.scenario import ScenarioConfig, ScenarioCreate, ScenarioTemplateType


def test_scenario_config_validation():
    """Verify validation boundaries for workload scenario parameters."""
    # Valid config
    cfg = ScenarioConfig(vus=50, duration_seconds=60, zipf_alpha=1.2, read_write_ratio=0.8)
    assert cfg.vus == 50
    assert cfg.duration_seconds == 60
    assert cfg.zipf_alpha == 1.2
    assert cfg.read_write_ratio == 0.8

    # VUs out of range (< 1)
    with pytest.raises(ValueError):
        ScenarioConfig(vus=0)

    # VUs out of range (> 200)
    with pytest.raises(ValueError):
        ScenarioConfig(vus=201)

    # Duration out of range (< 5)
    with pytest.raises(ValueError):
        ScenarioConfig(duration_seconds=2)

    # Zipf alpha out of range (> 2.5)
    with pytest.raises(ValueError):
        ScenarioConfig(zipf_alpha=3.0)


@pytest.mark.asyncio
async def test_scenarios_api_templates_and_crud():
    """Verify scenario templates endpoint and creation flow."""
    from apps.api.src.core.database import init_db
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:

        # 1. Fetch templates
        resp = await client.get("/api/v1/scenarios/templates")
        assert resp.status_code == 200
        templates = resp.json()
        assert len(templates) >= 4
        types = [t["scenario_type"] for t in templates]
        assert "viral_post_spike" in types
        assert "hot_key_contention" in types
        assert "unindexed_pagination" in types
        assert "cache_stampede" in types

        # 2. Create custom scenario
        payload = {
            "name": "E-Commerce Flash Sale",
            "description": "High concurrency flash sale test",
            "scenario_type": "hot_key_contention",
            "config": {
                "vus": 45,
                "duration_seconds": 30,
                "warmup_seconds": 5,
                "zipf_alpha": 1.8,
                "read_write_ratio": 0.5,
                "arrival_pattern": "closed",
                "query_templates": ["UPDATE flash_items SET count = count - 1 WHERE id = $1"],
            },
        }
        create_resp = await client.post("/api/v1/scenarios", json=payload)
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["name"] == "E-Commerce Flash Sale"
        scenario_id = created["id"]

        # 3. List scenarios
        list_resp = await client.get("/api/v1/scenarios")
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert any(s["id"] == scenario_id for s in items)

        # 4. Fetch specific scenario
        get_resp = await client.get(f"/api/v1/scenarios/{scenario_id}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["config"]["vus"] == 45
        assert fetched["config"]["zipf_alpha"] == 1.8
