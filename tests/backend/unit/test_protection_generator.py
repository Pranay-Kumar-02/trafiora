"""Unit tests for Overload Protection and Little's Law Pool Sizing."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.intelligence.protection import (
    OverloadProtectionEngine,
    PoolSizingInput,
)
from apps.api.src.main import app


def test_littles_law_and_pool_sizing_math():
    """Verify Little's Law concurrency and hardware pool boundary logic."""
    # 500 QPS with 20ms mean latency => Little's Law = 500 * 0.02 = 10 active queries
    inp = PoolSizingInput(
        arrival_qps=500.0,
        mean_latency_ms=20.0,
        cpu_cores=4,
        disk_type="ssd",
        max_client_connections=800,
    )
    res = OverloadProtectionEngine.calculate_pool_sizing(inp)
    assert res.littles_law_concurrency == 10.0
    assert res.recommended_pool_size >= 10
    assert res.recommended_reserve_pool >= 2
    assert "pool_mode = transaction" in res.pgbouncer_ini_content
    assert f"default_pool_size = {res.recommended_pool_size}" in res.pgbouncer_ini_content
    assert "circuit_breaker" in res.edge_rate_limit_policy


@pytest.mark.asyncio
async def test_protection_api_endpoints():
    """Verify /api/v1/protection/generate and /api/v1/protection/sample endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch sample config
        sample_res = await client.get("/api/v1/protection/sample")
        assert sample_res.status_code == 200
        sample = sample_res.json()
        assert sample["recommended_pool_size"] >= 10
        assert "pgbouncer_ini_content" in sample

        # 2. Generate customized config
        payload = {
            "arrival_qps": 2500.0,
            "mean_latency_ms": 12.0,
            "cpu_cores": 16,
            "disk_type": "nvme",
            "max_client_connections": 3000,
        }
        gen_res = await client.post("/api/v1/protection/generate", json=payload)
        assert gen_res.status_code == 200
        result = gen_res.json()
        assert result["littles_law_concurrency"] == 30.0
        assert result["recommended_pool_size"] >= 30
        assert "auth_type = scram-sha-256" in result["pgbouncer_ini_content"]
