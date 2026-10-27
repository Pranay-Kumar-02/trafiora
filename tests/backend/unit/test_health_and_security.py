"""Unit tests for FastAPI health endpoints and AES-256-GCM Credential Vault."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.core.security import CredentialVault, mask_connection_string
from apps.api.src.main import app


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    """Verifies that the /api/v1/health endpoint returns 200 and healthy status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "Trafiora"


@pytest.mark.asyncio
async def test_capabilities_endpoint() -> None:
    """Verifies that capabilities endpoint accurately reflects certified and unsupported tiers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/capabilities")
        assert response.status_code == 200
        data = response.json()
        assert "certified_adapters" in data
        assert data["certified_adapters"][0]["engine"] == "postgresql"
        assert data["certified_adapters"][0]["version_target"] == "18.6"
        assert len(data["unsupported_adapters"]) >= 2


def test_credential_vault_encryption_decryption() -> None:
    """Verifies AES-256-GCM envelope encryption and decryption round-trip."""
    test_key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    vault = CredentialVault(test_key)
    secret_password = "super_sensitive_db_password_123!@#"
    
    envelope = vault.encrypt(secret_password)
    assert envelope.startswith("v1:")
    assert secret_password not in envelope
    
    decrypted = vault.decrypt(envelope)
    assert decrypted == secret_password


def test_credential_masking() -> None:
    """Verifies that database connection strings have passwords safely redacted."""
    raw_uri = "postgresql://my_user:secret_password_here@database.internal.prod:5432/my_db"
    masked = mask_connection_string(raw_uri)
    assert "secret_password_here" not in masked
    assert "my_user:********@database.internal.prod" in masked
