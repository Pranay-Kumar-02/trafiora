"""Query Ingestion, Fingerprinting & Workload Explorer Endpoints."""
from typing import Any
from fastapi import APIRouter, HTTPException
from ...intelligence.fingerprint import fingerprinter
from ...schemas.query import NormalizeQueryRequest, QueryFingerprintResponse

router = APIRouter(prefix="/queries", tags=["Queries"])

# In-memory query catalog store for immediate operational queries
_catalog_cache: dict[str, dict[str, Any]] = {}


@router.post("/normalize", response_model=QueryFingerprintResponse)
async def normalize_query(req: NormalizeQueryRequest) -> dict[str, Any]:
    """Ingests raw SQL, strips literals, and returns AST metadata and SHA-256 fingerprint."""
    try:
        res = fingerprinter.process_query(req.raw_sql)
        _catalog_cache[res["fingerprint"]] = res
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("", response_model=list[QueryFingerprintResponse])
async def list_queries(limit: int = 50) -> list[dict[str, Any]]:
    """Lists discovered query fingerprints."""
    return list(_catalog_cache.values())[:limit]


@router.get("/{fingerprint}", response_model=QueryFingerprintResponse)
async def get_query_detail(fingerprint: str) -> dict[str, Any]:
    """Retrieves query AST details and fingerprint summary."""
    if fingerprint not in _catalog_cache:
        raise HTTPException(status_code=404, detail="Query fingerprint not found")
    return _catalog_cache[fingerprint]
