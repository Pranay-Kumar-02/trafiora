"""Database Connections Management & Capability Probe Endpoints."""
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ...adapters.postgres import PostgresAdapter
from ...core.database import get_db_session
from ...core.security import vault
from ...models.connection import ConnectionModel
from ...schemas.connection import ConnectionResponse, CreateConnectionRequest

router = APIRouter(prefix="/connections", tags=["Connections"])

# In-memory connections store for fast operational access
_connections_store: dict[str, dict[str, Any]] = {}


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    req: CreateConnectionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Registers a database connection with encrypted credentials and database persistence."""
    conn_id = str(uuid.uuid4())
    encrypted_pw = vault.encrypt(req.password)
    
    db_conn = ConnectionModel(
        id=conn_id,
        name=req.name,
        engine=req.engine,
        host=req.host,
        port=req.port,
        database_name=req.database_name,
        username=req.username,
        encrypted_password=encrypted_pw,
        ssl_mode=req.ssl_mode,
        operational_tier=req.operational_tier,
        is_disposable_sandbox=req.is_disposable_sandbox,
        capabilities={},
    )
    session.add(db_conn)
    await session.commit()
    await session.refresh(db_conn)

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
async def list_connections(
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    """Lists registered connections with passwords masked."""
    result = await session.execute(select(ConnectionModel))
    db_conns = result.scalars().all()
    results = []
    for c in db_conns:
        results.append({
            "id": c.id,
            "name": c.name,
            "engine": c.engine,
            "host": c.host,
            "port": c.port,
            "database_name": c.database_name,
            "username": c.username,
            "ssl_mode": c.ssl_mode,
            "operational_tier": c.operational_tier,
            "is_disposable_sandbox": c.is_disposable_sandbox,
            "capabilities": c.capabilities or {},
        })
    return results



@router.post("/{connection_id}/probe")
async def probe_connection(
    connection_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Probes connection connectivity, engine version, and extensions."""
    conn = _connections_store.get(connection_id)
    if not conn:
        result = await session.execute(select(ConnectionModel).where(ConnectionModel.id == connection_id))
        db_conn = result.scalar_one_or_none()
        if not db_conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        conn = {
            "id": db_conn.id,
            "name": db_conn.name,
            "engine": db_conn.engine,
            "host": db_conn.host,
            "port": db_conn.port,
            "database_name": db_conn.database_name,
            "username": db_conn.username,
            "encrypted_password": db_conn.encrypted_password,
            "ssl_mode": db_conn.ssl_mode,
            "operational_tier": db_conn.operational_tier,
            "is_disposable_sandbox": db_conn.is_disposable_sandbox,
            "capabilities": db_conn.capabilities or {},
        }
        _connections_store[connection_id] = conn
        
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
