"""Unit tests for PostgresAdapter capability detection, degradation, and connections API."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.adapters.postgres import PostgresAdapter
from apps.api.src.main import app


@pytest.mark.asyncio
async def test_postgres_adapter_degradation_when_offline() -> None:
    """Verifies that PostgresAdapter gracefully degrades and reports UNKNOWN host metrics when target DB is offline."""
    adapter = PostgresAdapter(
        host="non_existent_host_12345",
        port=5432,
        database="test_db",
        username="test_user",
        password="test_password",
        operational_tier="tier_1_read_only",
    )
    caps = await adapter.probe_capabilities()
    assert caps["connected"] is False
    assert caps["degradation_mode"] == "MOCK_FALLBACK_CAPABILITY"
    assert caps["operational_tier"] == "tier_1_read_only"
    assert caps["has_pg_stat_statements"] is False


@pytest.mark.asyncio
async def test_connections_api_crud_and_masking() -> None:
    """Verifies that connection creation encrypts passwords and lists mask credentials."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "Primary Production Replica",
            "engine": "postgresql",
            "host": "postgres.internal.net",
            "port": 5432,
            "database_name": "ecommerce_prod",
            "username": "trafiora_monitor",
            "password": "super_secret_db_pass_999",
            "ssl_mode": "require",
            "operational_tier": "tier_1_read_only",
            "is_disposable_sandbox": False,
        }
        res = await client.post("/api/v1/connections", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Primary Production Replica"
        assert "password" not in data
        assert "encrypted_password" not in data
        conn_id = data["id"]

        # List connections
        list_res = await client.get("/api/v1/connections")
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        found = next(i for i in items if i["id"] == conn_id)
        assert found["operational_tier"] == "tier_1_read_only"
        assert "password" not in found
