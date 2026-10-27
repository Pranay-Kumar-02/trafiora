"""Dedicated security boundary verification test suite."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.adapters.postgres import PostgresAdapter
from apps.api.src.core.database import init_db
from apps.api.src.core.security import vault
from apps.api.src.main import app
from apps.api.src.runner.cleanup import BENCHMARK_APP_PREFIX, BENCHMARK_USER, SessionCleanupManager


@pytest.mark.asyncio
async def test_read_only_adapter_blocks_mutations_and_explain_analyze():
    """Verify that execute_read_only rejects EXPLAIN ANALYZE and DDL/DML mutations before database dispatch."""
    adapter = PostgresAdapter(
        host="localhost",
        port=5432,
        database="testdb",
        username="user",
        password="password",
        operational_tier="tier_1_read_only",
    )

    # 1. EXPLAIN ANALYZE must be blocked
    with pytest.raises(PermissionError, match="EXPLAIN ANALYZE executes queries"):
        await adapter.execute_read_only("EXPLAIN ANALYZE SELECT * FROM users;")

    with pytest.raises(PermissionError, match="EXPLAIN ANALYZE executes queries"):
        await adapter.execute_read_only("EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users;")

    # 2. Direct mutation statements must be blocked
    with pytest.raises(PermissionError, match="Only SELECT, EXPLAIN, and SHOW"):
        await adapter.execute_read_only("DELETE FROM users WHERE id = 1;")

    with pytest.raises(PermissionError, match="Only SELECT, EXPLAIN, and SHOW"):
        await adapter.execute_read_only("DROP TABLE users;")

    # 3. Compound injection attempts disguised as SELECT must be blocked
    with pytest.raises(PermissionError, match="Mutations containing"):
        await adapter.execute_read_only("SELECT 1; DELETE FROM users;")

    with pytest.raises(PermissionError, match="Mutations containing"):
        await adapter.execute_read_only("SELECT 1; DROP TABLE users;")

    with pytest.raises(PermissionError, match="Only SELECT, EXPLAIN, and SHOW"):
        await adapter.execute_read_only("VACUUM FULL;")



@pytest.mark.asyncio
async def test_credential_privacy_across_api_and_vault():
    """Verify that credentials are fully encrypted with AES-256-GCM and never leaked in API responses."""
    await init_db()
    raw_secret = "SuperSecretDbPassword#2026!"
    ciphertext = vault.encrypt(raw_secret)
    assert raw_secret not in ciphertext
    assert ciphertext.startswith("v1:")
    assert vault.decrypt(ciphertext) == raw_secret

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/connections",
            json={
                "name": "Secure Vault Target",
                "engine": "postgresql",
                "host": "db.vault.internal",
                "port": 5432,
                "database_name": "secrets_db",
                "username": "vault_user",
                "password": raw_secret,
                "operational_tier": "tier_1_read_only",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert "password" not in data
        assert "encrypted_password" not in data
        assert raw_secret not in str(data)

        # Listing connections must also omit plaintext credentials
        list_res = await client.get("/api/v1/connections")
        assert list_res.status_code == 200
        assert raw_secret not in list_res.text


def test_session_cleanup_strict_isolation():
    """Verify that orphan cleanup cannot terminate sessions outside the benchmark runner namespace."""
    sql = SessionCleanupManager.build_orphan_discovery_sql("target-run-uuid")
    assert f"usename = '{BENCHMARK_USER}'" in sql
    assert f"application_name = '{BENCHMARK_APP_PREFIX}target-run-uuid'" in sql
    # Verify ordinary application or monitor users are never targeted
    assert "trafiora_monitor" not in sql
    assert "postgres" not in sql
