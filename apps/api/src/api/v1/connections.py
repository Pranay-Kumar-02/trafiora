"""Database Connections Management & Capability Probe Endpoints."""
import uuid
from typing import Any
from fastapi import APIRouter, HTTPException
from ...adapters.postgres import PostgresAdapter
from ...core.security import vault
from ...schemas.connection import ConnectionResponse, CreateConnectionRequest

router = APIRouter(prefix="/connections", tags=["Connections"])

# In-memory connections store for fast operational access
_connections_store: dict[str, dict[str, Any]] = {}


@router.post("", response_model=ConnectionResponse)
async def create_connection(req: CreateConnectionRequest) -> dict[str, Any]:
    """Registers a database connection with encrypted credentials."""
    conn_id = str(uuid.uuid4())
    encrypted_pw = vault.encrypt(req.password)
    
    conn_record = {
        "id": conn_id,
        "name": req.name,
        "engine": req.engine,
        "host": req.host,
        "port": req.port,
        "database_name": req.database_name,
        "username": req.username,
        "encrypted_password": encrypted_pw,
        "ssl_mode": req.ssl_mode,
        "operational_tier": req.operational_tier,
        "is_disposable_sandbox": req.is_disposable_sandbox,
        "capabilities": {},
    }
    _connections_store[conn_id] = conn_record
    
    response_data = dict(conn_record)
    response_data.pop("encrypted_password")
    return response_data


@router.get("", response_model=list[ConnectionResponse])
async def list_connections() -> list[dict[str, Any]]:
    """Lists registered connections with passwords masked."""
    results = []
    for c in _connections_store.values():
        rec = dict(c)
        rec.pop("encrypted_password", None)
        results.append(rec)
    return results


@router.post("/{connection_id}/probe")
async def probe_connection(connection_id: str) -> dict[str, Any]:
    """Probes connection connectivity, engine version, and extensions."""
    if connection_id not in _connections_store:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    conn = _connections_store[connection_id]
    decrypted_pw = vault.decrypt(conn["encrypted_password"])
    
    adapter = PostgresAdapter(
        host=conn["host"],
        port=conn["port"],
        database=conn["database_name"],
        username=conn["username"],
        password=decrypted_pw,
        ssl_mode=conn["ssl_mode"],
        operational_tier=conn["operational_tier"],
    )
    
    caps = await adapter.probe_capabilities()
    conn["capabilities"] = caps
    return caps
