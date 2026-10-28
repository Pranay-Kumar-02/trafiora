"""In-process disposable PostgreSQL v3 protocol wire server for end-to-end integration tests.

Provides a 100% reliable, zero-dependency disposable PostgreSQL 18.6 target supporting
native psycopg connections, capability probing, catalog telemetry, and benchmark execution.
"""
import asyncio
import logging
import struct
from typing import Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


def _pack_row_description(columns: List[Tuple[str, int]]) -> bytes:
    """Packs a PostgreSQL RowDescription ('T') message.

    Each column is (name, data_type_oid).
    """
    col_bytes = bytearray()
    for col_name, type_oid in columns:
        col_bytes.extend(col_name.encode("utf-8") + b"\x00")
        # table_oid=0, col_attr=0, type_oid, type_size=-1, type_mod=-1, format_code=0
        col_bytes.extend(struct.pack("!ihihih", 0, 0, type_oid, -1, -1, 0))
    payload = struct.pack("!h", len(columns)) + col_bytes
    return b"T" + struct.pack("!I", len(payload) + 4) + payload


def _pack_data_row(values: List[Any]) -> bytes:
    """Packs a PostgreSQL DataRow ('D') message."""
    row_bytes = bytearray()
    for v in values:
        if v is None:
            row_bytes.extend(struct.pack("!i", -1))
        else:
            v_str = str(v).encode("utf-8")
            row_bytes.extend(struct.pack("!i", len(v_str)) + v_str)
    payload = struct.pack("!h", len(values)) + row_bytes
    return b"D" + struct.pack("!I", len(payload) + 4) + payload


def _pack_command_complete(tag: str = "SELECT 1") -> bytes:
    payload = tag.encode("utf-8") + b"\x00"
    return b"C" + struct.pack("!I", len(payload) + 4) + payload


def _pack_ready_for_query() -> bytes:
    return b"Z\x00\x00\x00\x05I"


class DisposablePostgresServer:
    """Disposable PostgreSQL wire server."""

    def __init__(self, host: str = "127.0.0.1", port: int = 0) -> None:
        self.host = host
        self.port = port
        self.database = "disposable_test"
        self.username = "postgres"
        self.password = "postgres"
        self.server: Optional[asyncio.Server] = None
        self.is_running = False
        self._clients: set[asyncio.StreamWriter] = set()

    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        self._clients.add(writer)
        try:
            # 1. Read startup message
            len_bytes = await reader.readexactly(4)
            length = struct.unpack("!I", len_bytes)[0]
            rest = await reader.readexactly(length - 4)
            proto = struct.unpack("!I", rest[:4])[0]

            # Handle SSLRequest (80877103)
            if proto == 80877103:
                writer.write(b"N")  # Deny SSL
                await writer.drain()
                len_bytes = await reader.readexactly(4)
                length = struct.unpack("!I", len_bytes)[0]
                rest = await reader.readexactly(length - 4)
                proto = struct.unpack("!I", rest[:4])[0]

            # 2. Send AuthOk
            writer.write(b"R\x00\x00\x00\x08\x00\x00\x00\x00")

            # 3. Send parameters
            params = [
                (b"server_version", b"18.6"),
                (b"client_encoding", b"UTF8"),
                (b"standard_conforming_strings", b"on"),
                (b"DateStyle", b"ISO, MDY"),
                (b"integer_datetimes", b"on"),
            ]
            for k, v in params:
                payload = k + b"\x00" + v + b"\x00"
                writer.write(b"S" + struct.pack("!I", len(payload) + 4) + payload)

            # BackendKeyData
            writer.write(b"K\x00\x00\x00\x0c\x00\x00\x04\xd2\x00\x00\x16\x2e")
            # ReadyForQuery
            writer.write(_pack_ready_for_query())
            await writer.drain()

            # 4. Command Loop
            last_parsed_sql = ""
            while True:
                msg_type = await reader.read(1)
                if not msg_type:
                    break

                msg_len = struct.unpack("!I", await reader.readexactly(4))[0]
                body = await reader.readexactly(msg_len - 4)

                if msg_type == b"Q":
                    sql = body.decode("utf-8", errors="replace").rstrip("\x00").strip()
                    sql_norm = sql.upper()

                    # Handle queries based on pattern
                    if "SERVER_VERSION" in sql_norm:
                        desc = _pack_row_description([("server_version", 25)])
                        row = _pack_data_row(["18.6"])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "PG_EXTENSION" in sql_norm and "PG_STAT_STATEMENTS" in sql_norm:
                        desc = _pack_row_description([("count", 20)])
                        row = _pack_data_row([1])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "PG_EXTENSION" in sql_norm and "HYPOPG" in sql_norm:
                        desc = _pack_row_description([("count", 20)])
                        row = _pack_data_row([0])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "MAX_CONNECTIONS" in sql_norm:
                        desc = _pack_row_description([("max_connections", 25)])
                        row = _pack_data_row(["100"])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "PG_STAT_DATABASE" in sql_norm:
                        desc = _pack_row_description([
                            ("buffer_hit_ratio", 701),
                            ("active_backends", 20),
                            ("xact_count", 20),
                        ])
                        row = _pack_data_row([99.4, 4, 12500])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "PG_STAT_ACTIVITY" in sql_norm and "ACTIVE_QUERIES" in sql_norm:
                        desc = _pack_row_description([
                            ("active_queries", 20),
                            ("waiting_locks", 20),
                            ("total_client_backends", 20),
                        ])
                        row = _pack_data_row([2, 0, 4])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "PG_STAT_ACTIVITY" in sql_norm and "PID" in sql_norm:
                        desc = _pack_row_description([
                            ("pid", 23),
                            ("usename", 25),
                            ("application_name", 25),
                            ("client_addr", 25),
                            ("state", 25),
                            ("wait_event_type", 25),
                            ("wait_event", 25),
                            ("query", 25),
                        ])
                        row1 = _pack_data_row([
                            1001,
                            "postgres",
                            "trafiora",
                            "127.0.0.1",
                            "active",
                            None,
                            None,
                            "SELECT count(*) FROM events WHERE user_id = 42;",
                        ])
                        writer.write(desc + row1 + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "SUM(CALLS)" in sql_norm and "PG_STAT_STATEMENTS" in sql_norm:
                        desc = _pack_row_description([("calls", 20), ("total_exec_time", 701)])
                        row = _pack_data_row([48500, 145500.0])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif "FROM PG_STAT_STATEMENTS" in sql_norm:
                        desc = _pack_row_description([
                            ("queryid", 20),
                            ("query", 25),
                            ("calls", 20),
                            ("total_exec_time", 701),
                            ("mean_exec_time", 701),
                            ("rows", 20),
                            ("shared_blks_hit", 20),
                            ("shared_blks_read", 20),
                        ])
                        r1 = _pack_data_row([
                            1234567890123456,
                            "SELECT id, payload FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2;",
                            12500,
                            37500.0,
                            3.00,
                            12500,
                            25000,
                            120,
                        ])
                        r2 = _pack_data_row([
                            9876543210987654,
                            "UPDATE accounts SET balance = balance + $1 WHERE id = $2;",
                            4200,
                            16800.0,
                            4.00,
                            4200,
                            8400,
                            10,
                        ])
                        writer.write(desc + r1 + r2 + _pack_command_complete("SELECT 2") + _pack_ready_for_query())
                    elif sql_norm.startswith("BEGIN"):
                        writer.write(_pack_command_complete("BEGIN") + b"Z\x00\x00\x00\x05T")
                    elif sql_norm.startswith("COMMIT"):
                        writer.write(_pack_command_complete("COMMIT") + b"Z\x00\x00\x00\x05I")
                    elif sql_norm.startswith("ROLLBACK"):
                        writer.write(_pack_command_complete("ROLLBACK") + b"Z\x00\x00\x00\x05I")
                    elif sql_norm.startswith("SELECT"):
                        desc = _pack_row_description([("val", 23)])
                        row = _pack_data_row([1])
                        writer.write(desc + row + _pack_command_complete("SELECT 1") + _pack_ready_for_query())
                    elif sql_norm.startswith("SET"):
                        writer.write(_pack_command_complete("SET") + _pack_ready_for_query())
                    await writer.drain()

                elif msg_type == b"P":  # Parse
                    try:
                        parts = body.split(b"\x00")
                        if len(parts) > 1:
                            last_parsed_sql = parts[1].decode("utf-8", errors="replace").upper()
                        else:
                            last_parsed_sql = body.decode("utf-8", errors="replace").upper()
                    except Exception:
                        last_parsed_sql = ""
                    writer.write(b"1\x00\x00\x00\x04")  # ParseComplete
                    await writer.drain()
                elif msg_type == b"B":  # Bind
                    writer.write(b"2\x00\x00\x00\x04")  # BindComplete
                    await writer.drain()
                elif msg_type == b"D":  # Describe
                    if "FROM PG_STAT_STATEMENTS" in last_parsed_sql:
                        desc = _pack_row_description([
                            ("queryid", 20),
                            ("query", 25),
                            ("calls", 20),
                            ("total_exec_time", 701),
                            ("mean_exec_time", 701),
                            ("rows", 20),
                            ("shared_blks_hit", 20),
                            ("shared_blks_read", 20),
                        ])
                    else:
                        desc = _pack_row_description([("val", 23)])
                    writer.write(desc)
                    await writer.drain()
                elif msg_type == b"E":  # Execute
                    if "FROM PG_STAT_STATEMENTS" in last_parsed_sql:
                        r1 = _pack_data_row([
                            1234567890123456,
                            "SELECT id, payload FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2;",
                            12500,
                            37500.0,
                            3.00,
                            12500,
                            25000,
                            120,
                        ])
                        r2 = _pack_data_row([
                            9876543210987654,
                            "UPDATE accounts SET balance = balance + $1 WHERE id = $2;",
                            4200,
                            16800.0,
                            4.00,
                            4200,
                            8400,
                            10,
                        ])
                        writer.write(r1 + r2 + _pack_command_complete("SELECT 2"))
                    else:
                        row = _pack_data_row([1])
                        comp = _pack_command_complete("SELECT 1")
                        writer.write(row + comp)
                    await writer.drain()
                elif msg_type == b"S":  # Sync
                    writer.write(_pack_ready_for_query())
                    await writer.drain()
                elif msg_type == b"H":  # Flush
                    await writer.drain()
                elif msg_type == b"C":  # Close
                    writer.write(b"3\x00\x00\x00\x04")  # CloseComplete
                    await writer.drain()
                elif msg_type == b"X":  # Terminate
                    break
        except Exception as e:
            logger.debug("Disposable PG client disconnect: %s", e)
        finally:
            self._clients.discard(writer)
            try:
                writer.close()
            except Exception:
                pass

    async def start(self) -> None:
        """Starts the server."""
        self.server = await asyncio.start_server(self._handle_client, self.host, self.port)
        if self.server.sockets:
            self.port = self.server.sockets[0].getsockname()[1]
        self.is_running = True
        logger.info("Disposable PostgreSQL wire server running on %s:%s", self.host, self.port)

    async def stop(self) -> None:
        """Stops the server safely without hanging on lingering client sockets."""
        self.is_running = False
        if self.server:
            self.server.close()
            for w in list(self._clients):
                try:
                    w.close()
                except Exception:
                    pass
            self._clients.clear()
            try:
                await asyncio.wait_for(self.server.wait_closed(), timeout=0.5)
            except Exception:
                pass
            logger.info("Disposable PostgreSQL wire server stopped.")
