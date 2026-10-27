"""Verified Benchmark Session Cleanup and Stale Backend Termination."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import psycopg
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.audit import AuditLogModel

logger = logging.getLogger(__name__)

BENCHMARK_USER = "trafiora_benchmark_runner"
BENCHMARK_APP_PREFIX = "trafiora_bench_"


class SessionCleanupManager:
    """Safely terminates only verified benchmark runner sessions, protecting all other connections."""

    @staticmethod
    def build_orphan_discovery_sql(experiment_id: Optional[str] = None) -> str:
        """Constructs safe query targeting only confirmed benchmark sessions."""
        base_sql = (
            "SELECT pid, usename, application_name, client_addr, state, backend_start, query "
            "FROM pg_stat_activity "
            f"WHERE usename = '{BENCHMARK_USER}' "
            f"  AND application_name LIKE '{BENCHMARK_APP_PREFIX}%'"
        )
        if experiment_id:
            base_sql += f"  AND application_name = '{BENCHMARK_APP_PREFIX}{experiment_id}'"
        return base_sql

    @staticmethod
    async def cleanup_orphaned_sessions(
        conn_params: Dict[str, Any],
        experiment_id: Optional[str] = None,
        db_session: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Terminates stale sessions matching both benchmark usename and application_name."""
        terminated = []
        host = conn_params.get("host", "localhost")
        port = conn_params.get("port", 5432)
        dbname = conn_params.get("database", "postgres")
        user = conn_params.get("username", "postgres")
        password = conn_params.get("password", "")

        conninfo = f"host={host} port={port} dbname={dbname} user={user} password={password} connect_timeout=3"

        try:
            async with await psycopg.AsyncConnection.connect(conninfo) as aconn:
                async with aconn.cursor() as cur:
                    # 1. Discover target sessions
                    discovery_sql = SessionCleanupManager.build_orphan_discovery_sql(experiment_id)
                    await cur.execute(discovery_sql)
                    rows = await cur.fetchall()

                    for row in rows:
                        pid, usename, app_name, client_addr, state, b_start, query_text = row
                        
                        # Double verification check before termination
                        if usename == BENCHMARK_USER and app_name.startswith(BENCHMARK_APP_PREFIX):
                            # Execute targeted termination
                            await cur.execute("SELECT pg_terminate_backend(%s)", (pid,))
                            term_res = await cur.fetchone()
                            was_terminated = term_res[0] if term_res else False

                            entry = {
                                "pid": pid,
                                "usename": usename,
                                "application_name": app_name,
                                "terminated": was_terminated,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }
                            terminated.append(entry)
                            logger.info("Terminated orphan session: PID %s (%s)", pid, app_name)

                            # Record audit log if session provided
                            if db_session:
                                audit = AuditLogModel(
                                    id=str(uuid.uuid4()),
                                    action="ORPHAN_SESSION_TERMINATED",
                                    entity_type="pg_stat_activity",
                                    entity_id=str(pid),
                                    details=entry,
                                    created_at=datetime.now(timezone.utc),
                                )
                                db_session.add(audit)

                    if db_session and terminated:
                        await db_session.commit()

        except Exception as exc:
            logger.warning("Session cleanup encountered connection issue (target may be offline): %s", exc)

        return terminated
