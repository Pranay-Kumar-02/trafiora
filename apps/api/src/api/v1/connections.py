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



async def _get_conn_record(connection_id: str, session: AsyncSession) -> dict[str, Any]:
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
    return conn


def _make_adapter(conn: dict[str, Any]) -> PostgresAdapter:
    decrypted_pw = vault.decrypt(conn["encrypted_password"])
    return PostgresAdapter(
        host=conn["host"],
        port=conn["port"],
        database=conn["database_name"],
        username=conn["username"],
        password=decrypted_pw,
        ssl_mode=conn["ssl_mode"],
        operational_tier=conn["operational_tier"],
    )


@router.get("/active/status")
async def get_active_connection_status(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieves the active/most recently registered connection along with telemetry."""
    result = await session.execute(
        select(ConnectionModel).order_by(ConnectionModel.created_at.desc()).limit(1)
    )
    db_conn = result.scalar_one_or_none()
    if not db_conn:
        return {
            "has_connection": False,
            "connection": None,
            "telemetry": None,
            "queries": [],
        }

    conn = await _get_conn_record(db_conn.id, session)
    adapter = _make_adapter(conn)
    telemetry = await adapter.get_live_telemetry()
    caps = await adapter.probe_capabilities()

    return {
        "has_connection": True,
        "connection": {
            "id": db_conn.id,
            "name": db_conn.name,
            "engine": db_conn.engine,
            "host": db_conn.host,
            "port": db_conn.port,
            "database_name": db_conn.database_name,
            "username": db_conn.username,
            "operational_tier": db_conn.operational_tier,
            "is_disposable_sandbox": db_conn.is_disposable_sandbox,
            "capabilities": caps,
        },
        "telemetry": telemetry,
    }


@router.post("/{connection_id}/probe")
async def probe_connection(
    connection_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Probes connection connectivity, engine version, and extensions."""
    conn = await _get_conn_record(connection_id, session)
    adapter = _make_adapter(conn)
    caps = await adapter.probe_capabilities()
    conn["capabilities"] = caps
    return caps


@router.get("/{connection_id}/telemetry")
async def get_connection_telemetry(
    connection_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Returns real-time PostgreSQL telemetry, cache hit ratios, and connection pool saturation."""
    conn = await _get_conn_record(connection_id, session)
    adapter = _make_adapter(conn)
    telemetry = await adapter.get_live_telemetry()
    return {
        "connection_id": connection_id,
        "connection_name": conn["name"],
        "host": conn["host"],
        "port": conn["port"],
        "operational_tier": conn["operational_tier"],
        "telemetry": telemetry,
    }


@router.get("/{connection_id}/queries")
async def get_connection_queries(
    connection_id: str,
    limit: int = 50,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Extracts top slow queries from pg_stat_statements for the target database."""
    conn = await _get_conn_record(connection_id, session)
    adapter = _make_adapter(conn)
    caps = await adapter.probe_capabilities()

    if not caps.get("connected"):
        return {
            "connection_id": connection_id,
            "connected": False,
            "has_pg_stat_statements": False,
            "measurement_source": "UNAVAILABLE",
            "message": f"Target PostgreSQL database '{conn['host']}:{conn['port']}' is offline or unreachable.",
            "queries": [],
            "is_simulated": False,
        }

    if not caps.get("has_pg_stat_statements"):
        return {
            "connection_id": connection_id,
            "connected": True,
            "has_pg_stat_statements": False,
            "measurement_source": "UNAVAILABLE",
            "message": "Extension 'pg_stat_statements' is not loaded in this database.",
            "queries": [],
            "is_simulated": False,
        }

    raw_stats = await adapter.extract_query_statistics(limit=limit)
    total_time = sum(q.get("total_exec_time_ms", 0.0) for q in raw_stats) or 1.0

    formatted_queries = []
    for q in raw_stats:
        total_q_time = q.get("total_exec_time_ms", 0.0)
        formatted_queries.append({
            "query_id": q["query_id"],
            "fingerprint": q["query_id"],
            "statement": q["query"],
            "calls": q["calls"],
            "total_time_ms": total_q_time,
            "total_time_pct": round((total_q_time / total_time) * 100.0, 1),
            "mean_latency_ms": q["mean_exec_time_ms"],
            "rows": q.get("rows", 0),
            "shared_blks_hit": q.get("shared_blks_hit", 0),
            "shared_blks_read": q.get("shared_blks_read", 0),
        })

    is_wire_emulator = bool(caps.get("is_wire_emulator"))
    source = "WIRE_EMULATOR_SANDBOX" if is_wire_emulator else "pg_stat_statements"

    return {
        "connection_id": connection_id,
        "connected": True,
        "has_pg_stat_statements": True,
        "measurement_source": source,
        "message": f"Retrieved {len(formatted_queries)} statements from {source}.",
        "queries": formatted_queries,
        "is_simulated": is_wire_emulator,
    }

