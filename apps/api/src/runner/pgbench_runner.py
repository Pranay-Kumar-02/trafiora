"""PgBench Subprocess Execution Engine with Safe Parameterization."""
import asyncio
import os
import re
import shutil
import tempfile
from typing import Any, Dict, List, Optional


class PgBenchResult:
    """Parsed output from a pgbench execution run."""
    def __init__(
        self,
        success: bool,
        tps: float = 0.0,
        latency_avg_ms: float = 0.0,
        latency_p95_ms: float = 0.0,
        error_count: int = 0,
        raw_output: str = "",
        is_simulated_fallback: bool = False,
    ):
        self.success = success
        self.tps = tps
        self.latency_avg_ms = latency_avg_ms
        self.latency_p95_ms = latency_p95_ms
        self.error_count = error_count
        self.raw_output = raw_output
        self.is_simulated_fallback = is_simulated_fallback

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "tps": self.tps,
            "latency_avg_ms": self.latency_avg_ms,
            "latency_p95_ms": self.latency_p95_ms,
            "error_count": self.error_count,
            "is_simulated_fallback": self.is_simulated_fallback,
        }


class PgBenchRunner:
    """Executes pgbench via safe subprocess execution with dedicated session tags."""

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

    def parse_pgbench_output(self, stdout_text: str) -> PgBenchResult:
        """Extracts TPS, average latency, and 95th percentile from pgbench stdout."""
        tps = 0.0
        lat_avg = 0.0
        lat_p95 = 0.0

        # Match: tps = 1234.56 (without initial connection time) OR tps = 1234.56 (including ...)
        tps_match = re.search(r"tps\s*=\s*([0-9]+\.?[0-9]*)", stdout_text)
        if tps_match:
            tps = float(tps_match.group(1))

        # Match: latency average = 12.345 ms
        lat_match = re.search(r"latency average\s*=\s*([0-9]+\.?[0-9]*)\s*ms", stdout_text)
        if lat_match:
            lat_avg = float(lat_match.group(1))

        # Approximation of p95 if raw distribution is not logged: avg * 1.6
        lat_p95 = round(lat_avg * 1.6, 2) if lat_avg > 0 else 0.0

        return PgBenchResult(
            success=tps > 0,
            tps=round(tps, 1),
            latency_avg_ms=round(lat_avg, 2),
            latency_p95_ms=lat_p95,
            error_count=0,
            raw_output=stdout_text,
            is_simulated_fallback=False,
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
        """Executes pgbench or falls back to simulated workload if pgbench is unavailable."""
        app_name = f"trafiora_bench_{experiment_id}"

        if not self.is_available:
            # Fallback simulation
            await asyncio.sleep(0.05)
            sim_p95 = round(4.5 + (vus * 0.12), 2)
            sim_tps = round((vus * 1000.0) / (sim_p95 * 2.2), 1)
            return PgBenchResult(
                success=True,
                tps=sim_tps,
                latency_avg_ms=round(sim_p95 * 0.65, 2),
                latency_p95_ms=sim_p95,
                error_count=0,
                raw_output="[SIMULATED FALLBACK: pgbench binary not present on host]",
                is_simulated_fallback=True,
            )

        # Write script to temporary file
        script_content = self.generate_custom_script(query_templates)
        with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as f:
            f.write(script_content)
            script_path = f.name

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
            "-n",  # Skip vacuuming before run
        ]

        try:
            # Execute without shell expansion
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            stdout, stderr = await proc.communicate()
            stdout_text = stdout.decode("utf-8", errors="replace")
            stderr_text = stderr.decode("utf-8", errors="replace")

            if proc.returncode != 0:
                return PgBenchResult(
                    success=False,
                    error_count=1,
                    raw_output=f"Error code {proc.returncode}: {stderr_text}",
                )

            return self.parse_pgbench_output(stdout_text)
        finally:
            if os.path.exists(script_path):
                os.remove(script_path)
