"""PgBench Subprocess & Native Workload Execution Engine with Safe Parameterization."""
import asyncio
import logging
import os
import re
import shutil
import tempfile
import time
from typing import Any, Dict, List, Optional
import psycopg

logger = logging.getLogger(__name__)


class PgBenchResult:
    """Parsed output from a benchmark execution run."""
    def __init__(
        self,
        success: bool,
        tps: float = 0.0,
        latency_avg_ms: Optional[float] = None,
        latency_p50_ms: Optional[float] = None,
        latency_p95_ms: Optional[float] = None,
        latency_p99_ms: Optional[float] = None,
        error_count: int = 0,
        raw_output: str = "",
        is_simulated: bool = False,
        measurement_source: str = "PGBENCH_SUBPROCESS",
        simulation_reason: Optional[str] = None,
    ):
        self.success = success
        self.tps = tps
        self.latency_avg_ms = latency_avg_ms
        self.latency_p50_ms = latency_p50_ms
        self.latency_p95_ms = latency_p95_ms
        self.latency_p99_ms = latency_p99_ms
        self.error_count = error_count
        self.raw_output = raw_output
        self.is_simulated = is_simulated
        self.is_simulated_fallback = is_simulated
        self.measurement_source = measurement_source
        self.simulation_reason = simulation_reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "tps": self.tps,
            "latency_avg_ms": self.latency_avg_ms,
            "latency_p50_ms": self.latency_p50_ms,
            "latency_p95_ms": self.latency_p95_ms,
            "latency_p99_ms": self.latency_p99_ms,
            "error_count": self.error_count,
            "is_simulated": self.is_simulated,
            "is_simulated_fallback": self.is_simulated,
            "measurement_source": self.measurement_source,
            "simulation_reason": self.simulation_reason,
        }



class PgBenchRunner:
    """Executes pgbench via safe subprocess or native psycopg pool with dedicated session tags."""

    def __init__(self, pgbench_bin: Optional[str] = None):
        self.pgbench_bin = pgbench_bin or shutil.which("pgbench")

    @property
    def is_available(self) -> bool:
        return self.pgbench_bin is not None

    def generate_custom_script(self, query_templates: List[str]) -> str:
        """Formats query templates into a valid pgbench custom transaction script."""
        lines = ["\\set aid random(1, 100000)"]
        for q in query_templates:
            # Replace parameter placeholders $1 with pgbench variable :aid
            formatted_q = q.replace("$1", ":aid")
            if not formatted_q.endswith(";"):
                formatted_q += ";"
            lines.append(formatted_q)
        return "\n".join(lines) + "\n"

    def parse_pgbench_output(self, stdout_text: str, log_dir: Optional[str] = None) -> PgBenchResult:
        """Extracts TPS, average latency, and genuine percentiles from pgbench stdout and transaction logs."""
        tps = 0.0
        lat_avg: Optional[float] = None

        tps_match = re.search(r"tps\s*=\s*([0-9]+\.?[0-9]*)", stdout_text)
        if tps_match:
            tps = float(tps_match.group(1))

        lat_match = re.search(r"latency average\s*=\s*([0-9]+\.?[0-9]*)\s*ms", stdout_text)
        if lat_match:
            lat_avg = round(float(lat_match.group(1)), 2)

        lat_p50: Optional[float] = None
        lat_p95: Optional[float] = None
        lat_p99: Optional[float] = None

        # When log_dir is provided, inspect per-transaction log files created by pgbench -l
        if log_dir and os.path.isdir(log_dir):
            latencies_ms: List[float] = []
            for fname in os.listdir(log_dir):
                if fname.startswith("pgbench_log"):
                    fpath = os.path.join(log_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as lf:
                            for line in lf:
                                parts = line.strip().split()
                                # Format: client_id transaction_no time_in_microseconds ...
                                if len(parts) >= 3:
                                    try:
                                        time_us = float(parts[2])
                                        latencies_ms.append(time_us / 1000.0)
                                    except ValueError:
                                        continue
                    except Exception as log_err:
                        logger.warning("Error reading pgbench log file %s: %s", fpath, log_err)

            if latencies_ms:
                latencies_ms.sort()
                count = len(latencies_ms)
                lat_p50 = round(latencies_ms[int(count * 0.50)], 2)
                lat_p95 = round(latencies_ms[int(count * 0.95)], 2)
                lat_p99 = round(latencies_ms[min(count - 1, int(count * 0.99))], 2)
                lat_avg = round(sum(latencies_ms) / count, 2)

        # NEVER estimate p95 = lat_avg * 1.6. When genuine latency data is absent, return None.
        return PgBenchResult(
            success=tps > 0,
            tps=round(tps, 1),
            latency_avg_ms=lat_avg,
            latency_p50_ms=lat_p50,
            latency_p95_ms=lat_p95,
            latency_p99_ms=lat_p99,
            error_count=0,
            raw_output=stdout_text,
            is_simulated=False,
            measurement_source="PGBENCH_SUBPROCESS" if lat_p95 is not None else "PGBENCH_STDOUT_NO_PERCENTILES",
            simulation_reason=None if lat_p95 is not None else "Per-transaction latency logging was unavailable; percentiles are reported as null/unavailable.",
        )

    async def execute_native_psycopg_workload(
        self,
        experiment_id: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        vus: int,
        duration_s: int,
        query_templates: List[str],
    ) -> PgBenchResult:
        """Executes real concurrent workload queries using async psycopg connections against target database."""
        app_name = f"trafiora_bench_{experiment_id}"
        conninfo = (
            f"host={host} port={port} dbname={database} user={username} "
            f"password={password} application_name={app_name} connect_timeout=2 sslmode=disable"
        )

        # Probe connectivity first to fail fast if target is unreachable
        try:
            probe_conn = await psycopg.AsyncConnection.connect(
                conninfo, connect_timeout=2, prepare_threshold=None
            )
            await probe_conn.close()
        except Exception as probe_err:
            raise RuntimeError(f"Database target probe failed ({host}:{port}): {probe_err}") from probe_err

        latencies_ms: List[float] = []
        errors = 0
        stop_event = asyncio.Event()

        queries_to_run = query_templates or ["SELECT 1;"]

        async def worker():
            nonlocal errors
            conn = None
            try:
                conn = await psycopg.AsyncConnection.connect(
                    conninfo, autocommit=True, prepare_threshold=None, connect_timeout=2
                )
                async with conn.cursor() as cur:
                    while not stop_event.is_set():
                        for q in queries_to_run:
                            if stop_event.is_set():
                                break
                            # Parameter substitution if needed
                            exec_sql = q.replace("$1", "1").replace("$2", "10")
                            t0 = time.perf_counter()
                            try:
                                await cur.execute(exec_sql)
                                if cur.description:
                                    await cur.fetchall()
                                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                                latencies_ms.append(elapsed_ms)
                            except Exception as query_exc:
                                errors += 1
                                logger.debug("Worker query failed: %s", query_exc)
                            await asyncio.sleep(0.002)
            except Exception as conn_exc:
                logger.warning("Native worker connection failed: %s", conn_exc)
                errors += 1
            finally:
                if conn is not None:
                    try:
                        await conn.close()
                    except Exception:
                        pass

        # Spawn concurrent workers
        tasks = [asyncio.create_task(worker()) for _ in range(vus)]

        # Run for specified duration
        await asyncio.sleep(duration_s)
        stop_event.set()
        await asyncio.gather(*tasks, return_exceptions=True)

        if not latencies_ms:
            raise RuntimeError("No queries succeeded during native workload execution.")

        latencies_ms.sort()
        count = len(latencies_ms)
        p50 = round(latencies_ms[int(count * 0.50)], 2)
        p95 = round(latencies_ms[int(count * 0.95)], 2)
        p99 = round(latencies_ms[min(count - 1, int(count * 0.99))], 2)
        avg_lat = round(sum(latencies_ms) / count, 2)
        actual_tps = round(count / float(duration_s), 1)

        return PgBenchResult(
            success=True,
            tps=actual_tps,
            latency_avg_ms=avg_lat,
            latency_p50_ms=p50,
            latency_p95_ms=p95,
            latency_p99_ms=p99,
            error_count=errors,
            raw_output=f"Executed {count} genuine statements across {vus} VUs over {duration_s}s",
            is_simulated=False,
            measurement_source="PSYCOPG_NATIVE_POOL",
        )

    async def execute(
        self,
        experiment_id: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        vus: int,
        duration_s: int,
        query_templates: List[str],
    ) -> PgBenchResult:
        """Executes pgbench subprocess, native psycopg pool, or explicit labeled fallback."""
        app_name = f"trafiora_bench_{experiment_id}"

        # 1. Try real pgbench binary if present
        if self.is_available:
            script_content = self.generate_custom_script(query_templates)
            with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as f:
                f.write(script_content)
                script_path = f.name

            tmp_log_dir = tempfile.mkdtemp(prefix="pgbench_logs_")
            log_prefix = os.path.join(tmp_log_dir, "pgbench_log")

            env = os.environ.copy()
            env["PGPASSWORD"] = password
            env["PGAPPNAME"] = app_name

            cmd = [
                self.pgbench_bin,
                "-h", host,
                "-p", str(port),
                "-U", username,
                "-d", database,
                "-c", str(vus),
                "-T", str(duration_s),
                "-f", script_path,
                "-l",
                "--log-prefix", log_prefix,
                "-n",
            ]

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                )
                stdout, stderr = await proc.communicate()
                stdout_text = stdout.decode("utf-8", errors="replace")
                stderr_text = stderr.decode("utf-8", errors="replace")

                if proc.returncode == 0:
                    return self.parse_pgbench_output(stdout_text, log_dir=tmp_log_dir)
                else:
                    logger.warning("pgbench exited with code %s: %s", proc.returncode, stderr_text)
            except Exception as e:
                logger.warning("Failed executing pgbench subprocess: %s", e)
            finally:
                if os.path.exists(script_path):
                    os.remove(script_path)
                shutil.rmtree(tmp_log_dir, ignore_errors=True)

        # 2. Try native psycopg concurrent runner against live PostgreSQL target
        try:
            return await self.execute_native_psycopg_workload(
                experiment_id=experiment_id,
                host=host,
                port=port,
                database=database,
                username=username,
                password=password,
                vus=vus,
                duration_s=duration_s,
                query_templates=query_templates,
            )
        except Exception as e:
            logger.info("Live target execution unavailable: %s", e)

        # 3. Explicitly labeled simulated fallback when live PostgreSQL is offline
        await asyncio.sleep(0.05)
        return PgBenchResult(
            success=True,
            tps=0.0,
            latency_avg_ms=None,
            latency_p50_ms=None,
            latency_p95_ms=None,
            latency_p99_ms=None,
            error_count=0,
            raw_output="[TARGET_OFFLINE: Target PostgreSQL database and pgbench binary are unreachable]",
            is_simulated=True,
            measurement_source="SIMULATED_OFFLINE_FALLBACK",
            simulation_reason=(
                f"Target database '{host}:{port}' was unreachable and 'pgbench' is not installed in host PATH. "
                "Reliable latency percentiles cannot be measured and are reported as null/unavailable."
            ),
        )

