"""Unit tests for QueryFingerprinter collision resistance and API endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.intelligence.fingerprint import fingerprinter
from apps.api.src.main import app


def test_fingerprint_deterministic_and_collision_resistant() -> None:
    """Verifies that queries differing ONLY by parameter values produce IDENTICAL fingerprints,

    while structurally different queries produce DIFFERENT fingerprints.
    """
    q1 = "SELECT id, title FROM posts WHERE user_id = 42 AND active = true;"
    q2 = "SELECT id, title FROM posts WHERE user_id = 999999 AND active = false;"
    q3 = "SELECT id, title FROM posts WHERE user_id = 42 ORDER BY created_at;"

    res1 = fingerprinter.process_query(q1)
    res2 = fingerprinter.process_query(q2)
    res3 = fingerprinter.process_query(q3)

    # Identical structure with different literals -> Identical fingerprint
    assert res1["fingerprint"] == res2["fingerprint"]

    # Different structure -> Different fingerprint
    assert res1["fingerprint"] != res3["fingerprint"]
    assert len(res1["fingerprint"]) == 64  # SHA-256 length


@pytest.mark.asyncio
async def test_normalize_api_endpoint() -> None:
    """Verifies POST /api/v1/queries/normalize endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"raw_sql": "SELECT name FROM organizations WHERE org_id = 100;"}
        response = await client.post("/api/v1/queries/normalize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "fingerprint" in data
        assert "canonical_sql" in data
        assert "$1" in data["canonical_sql"]
        assert "organizations" in data["tables"]

        # Verify listing
        list_resp = await client.get("/api/v1/queries")
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) >= 1
        assert any(item["fingerprint"] == data["fingerprint"] for item in items)
