"""PostgreSQL 18.6 Database Adapter Implementation."""
import os
from typing import Any
import psycopg
from .base import DatabaseAdapter


class PostgresAdapter(DatabaseAdapter):
    """PostgreSQL 18.6 adapter supporting safe read-only observation,

    pg_stat_statements telemetry, and capability detection.
    """

    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: str = "prefer",
        operational_tier: str = "tier_1_read_only",
    ) -> None:
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.ssl_mode = ssl_mode
        self.operational_tier = operational_tier

    def _get_connection_string(self) -> str:
        return (
            f"host={self.host} port={self.port} dbname={self.database} "
            f"user={self.username} password={self.password} sslmode={self.ssl_mode}"
        )

    async def probe_capabilities(self) -> dict[str, Any]:
        """Probes PostgreSQL server version, pg_stat_statements, and host metrics."""
        # Check host cgroups / CPU telemetry availability
        host_cpu_source = "UNKNOWN (HOST_METRICS_UNAVAILABLE)"
        if os.path.exists("/sys/fs/cgroup/cpu.stat"):
            host_cpu_source = "LINUX_CGROUPS_V2"

        try:
            async with await psycopg.AsyncConnection.connect(
                self._get_connection_string(), connect_timeout=3
            ) as aconn:
                async with aconn.cursor() as cur:
                    # 1. Query server version
                    await cur.execute("SHOW server_version;")
                    row = await cur.fetchone()
                    server_version = row[0] if row else "Unknown"

                    # 2. Check for pg_stat_statements extension
                    await cur.execute(
                        "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';"
                    )
                    ext_row = await cur.fetchone()
                    has_pg_stat = bool(ext_row and ext_row[0] > 0)

                    # 3. Check for hypopg extension (virtual index simulation)
                    await cur.execute(
                        "SELECT count(*) FROM pg_extension WHERE extname = 'hypopg';"
                    )
                    hypo_row = await cur.fetchone()
                    has_hypopg = bool(hypo_row and hypo_row[0] > 0)

                    return {
                        "connected": True,
                        "engine": "postgresql",
                        "server_version": server_version,
                        "target_certified": server_version.startswith("18"),
                        "has_pg_stat_statements": has_pg_stat,
                        "has_hypopg": has_hypopg,
                        "host_cpu_measurement_source": host_cpu_source,
                        "operational_tier": self.operational_tier,
                    }
        except Exception as e:
            # Safe degradation if live target is unreachable (e.g. mock/test mode)
            return {
                "connected": False,
                "engine": "postgresql",
                "server_version": "Unavailable",
                "target_certified": False,
                "has_pg_stat_statements": False,
                "has_hypopg": False,
                "host_cpu_measurement_source": host_cpu_source,
                "error": str(e),
                "operational_tier": self.operational_tier,
                "degradation_mode": "MOCK_FALLBACK_CAPABILITY",
            }

    async def extract_query_statistics(self, limit: int = 50) -> list[dict[str, Any]]:
        """Extracts top slow queries from pg_stat_statements with fallback."""
        try:
            async with await psycopg.AsyncConnection.connect(
                self._get_connection_string(), connect_timeout=3
            ) as aconn:
                async with aconn.cursor() as cur:
                    query = """
                    SELECT queryid, query, calls, total_exec_time, mean_exec_time,
                           rows, shared_blks_hit, shared_blks_read
                    FROM pg_stat_statements
                    ORDER BY total_exec_time DESC
                    LIMIT %s;
                    """
                    await cur.execute(query, (limit,))
                    rows = await cur.fetchall()
                    results = []
                    for r in rows:
                        results.append({
                            "query_id": str(r[0]),
                            "query": r[1],
                            "calls": r[2],
                            "total_exec_time_ms": float(r[3]),
                            "mean_exec_time_ms": float(r[4]),
                            "rows": r[5],
                            "shared_blks_hit": r[6],
                            "shared_blks_read": r[7],
                        })
                    return results
        except Exception:
            # Fallback if extension missing or target disconnected
            return []

    async def execute_read_only(self, query: str, timeout_seconds: float = 2.0) -> list[dict[str, Any]]:
        """Executes catalog inspection query with strict read-only guarantees."""
        normalized_q = query.strip().upper()
        if not normalized_q.startswith(("SELECT", "EXPLAIN", "SHOW")):
            raise PermissionError("Only SELECT, EXPLAIN, and SHOW statements are permitted in read-only observation mode.")

        # STRICT SECURITY: Block execution-capable statements disguised as EXPLAIN
        if normalized_q.startswith("EXPLAIN") and ("ANALYZE" in normalized_q or "EXECUTE" in normalized_q):
            raise PermissionError("EXPLAIN ANALYZE executes queries and is strictly prohibited on read-only observation targets.")

        # Block any mutation DDL/DML keywords
        for forbidden in ["INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "TRUNCATE ", "CREATE ", "GRANT ", "REVOKE "]:
            if forbidden in normalized_q:
                raise PermissionError(f"Mutations containing '{forbidden.strip()}' are strictly prohibited in read-only observation mode.")

        async with await psycopg.AsyncConnection.connect(
            self._get_connection_string(), connect_timeout=3
        ) as aconn:
            async with aconn.cursor() as cur:
                # Enforce engine-level read-only session & bounded statement timeout
                await cur.execute("SET default_transaction_read_only = on;")
                await cur.execute(f"SET statement_timeout = '{int(timeout_seconds * 1000)}ms';")
                await cur.execute(query)
                columns = [desc[0] for desc in cur.description] if cur.description else []
                rows = await cur.fetchall()
                return [dict(zip(columns, row, strict=False)) for row in rows]


    async def get_active_sessions(self) -> list[dict[str, Any]]:
        """Returns active sessions from pg_stat_activity."""
        try:
            async with await psycopg.AsyncConnection.connect(
                self._get_connection_string(), connect_timeout=3
            ) as aconn:
                async with aconn.cursor() as cur:
                    query = """
                    SELECT pid, usename, application_name, client_addr, state, wait_event_type, wait_event, query
                    FROM pg_stat_activity
                    WHERE pid <> pg_backend_pid()
                    LIMIT 100;
                    """
                    await cur.execute(query)
                    rows = await cur.fetchall()
                    return [
                        {
                            "pid": r[0],
                            "username": r[1],
                            "application_name": r[2],
                            "client_addr": str(r[3]) if r[3] else None,
                            "state": r[4],
                            "wait_event_type": r[5],
                            "wait_event": r[6],
                            "query": r[7],
                        }
                        for r in rows
                    ]
        except Exception:
            return []

    async def get_live_telemetry(self) -> dict[str, Any]:
        """Collects live performance telemetry and resource saturation from catalog statistics."""
        try:
            async with await psycopg.AsyncConnection.connect(
                self._get_connection_string(), connect_timeout=3
            ) as aconn:
                async with aconn.cursor() as cur:
                    # 1. Buffer cache hit ratio and database activity from pg_stat_database
                    await cur.execute(
                        """
                        SELECT
                            COALESCE(sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 100.0) AS buffer_hit_ratio,
                            COALESCE(sum(numbackends), 0) AS active_backends,
                            COALESCE(sum(xact_commit + xact_rollback), 0) AS xact_count
                        FROM pg_stat_database
                        WHERE datname = current_database();
                        """
                    )
                    db_row = await cur.fetchone()
                    buffer_hit_ratio = round(float(db_row[0]), 2) if db_row and db_row[0] is not None else None
                    active_backends = int(db_row[1]) if db_row and db_row[1] is not None else None

                    # 2. Connection saturation and lock waits from pg_stat_activity
                    await cur.execute(
                        """
                        SELECT
                            COUNT(*) FILTER (WHERE state = 'active' AND pid <> pg_backend_pid()) AS active_queries,
                            COUNT(*) FILTER (WHERE wait_event_type = 'Lock' AND pid <> pg_backend_pid()) AS waiting_locks,
                            COUNT(*) FILTER (WHERE pid <> pg_backend_pid()) AS total_client_backends
                        FROM pg_stat_activity;
                        """
                    )
                    act_row = await cur.fetchone()
                    active_queries = int(act_row[0]) if act_row and act_row[0] is not None else 0
                    waiting_locks = int(act_row[1]) if act_row and act_row[1] is not None else 0
                    total_client_backends = int(act_row[2]) if act_row and act_row[2] is not None else (active_backends or 0)

                    # 3. Check pg_stat_statements summary if available
                    has_pg_stat = False
                    pg_stat_calls = None
                    pg_stat_total_time_ms = None
                    pg_stat_avg_ms = None
                    try:
                        await cur.execute(
                            "SELECT COALESCE(sum(calls), 0), COALESCE(sum(total_exec_time), 0.0) FROM pg_stat_statements;"
                        )
                        stat_row = await cur.fetchone()
                        if stat_row:
                            has_pg_stat = True
                            pg_stat_calls = int(stat_row[0])
                            pg_stat_total_time_ms = round(float(stat_row[1]), 2)
                            if pg_stat_calls > 0:
                                pg_stat_avg_ms = round(pg_stat_total_time_ms / pg_stat_calls, 2)
                    except Exception:
                        has_pg_stat = False

                    # Check max_connections
                    await cur.execute("SHOW max_connections;")
                    max_conn_row = await cur.fetchone()
                    max_connections = int(max_conn_row[0]) if max_conn_row else 100

                    return {
                        "connected": True,
                        "status": "ONLINE",
                        "measurement_source": "POSTGRES_CATALOG",
                        "buffer_cache_hit_ratio": buffer_hit_ratio,
                        "active_backends": active_backends or total_client_backends,
                        "max_connections": max_connections,
                        "active_queries": active_queries,
                        "waiting_locks": waiting_locks,
                        "has_pg_stat_statements": has_pg_stat,
                        "cumulative_calls": pg_stat_calls,
                        "cumulative_exec_time_ms": pg_stat_total_time_ms,
                        "overall_avg_latency_ms": pg_stat_avg_ms,
                        "is_simulated": False,
                    }
        except Exception as e:
            return {
                "connected": False,
                "status": "OFFLINE",
                "measurement_source": "UNAVAILABLE",
                "error": str(e),
                "buffer_cache_hit_ratio": None,
                "active_backends": None,
                "max_connections": None,
                "active_queries": None,
                "waiting_locks": None,
                "has_pg_stat_statements": False,
                "cumulative_calls": None,
                "cumulative_exec_time_ms": None,
                "overall_avg_latency_ms": None,
                "is_simulated": False,
            }
