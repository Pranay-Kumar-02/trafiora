"""Isolated Benchmark Execution Engine and Worker Pool."""
import asyncio
import logging
import math
import os
import random
import statistics
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import psycopg
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import async_session_factory
from ..core.security import vault
from ..models.connection import ConnectionModel
from ..models.experiment import ExperimentModel
from ..models.metric import MetricSampleModel
from ..models.scenario import WorkloadScenarioModel
from ..schemas.connection import OperationalTier
from ..schemas.experiment import ExperimentOutcome, ExperimentStatus
from .pgbench_runner import PgBenchRunner, resolve_ssl_mode

logger = logging.getLogger(__name__)



class BenchmarkSafetyViolation(Exception):
    """Raised when an experiment execution violates operational tier safety boundaries."""
    pass


class BenchmarkExecutor:
    """Bounded worker pool that executes isolated workload experiments with safety verification."""

    def __init__(self, max_concurrent: int = 2):
        self._max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._active_runs: Dict[str, asyncio.Task] = {}
        self._cancel_flags: Dict[str, bool] = {}
        self._runner = PgBenchRunner()


    @property
    def active_experiment_ids(self) -> List[str]:
        return list(self._active_runs.keys())

    def request_cancellation(self, experiment_id: str) -> bool:
        """Signal cooperative cancellation to an active experiment."""
        if experiment_id in self._active_runs:
            self._cancel_flags[experiment_id] = True
            self._active_runs[experiment_id].cancel()
            return True
        return False

    async def dispatch(self, experiment_id: str) -> None:
        """Asynchronously schedule experiment execution."""
        task = asyncio.create_task(self._run_wrapper(experiment_id))
        self._active_runs[experiment_id] = task
        self._cancel_flags[experiment_id] = False

        def _cleanup(_):
            self._active_runs.pop(experiment_id, None)
            self._cancel_flags.pop(experiment_id, None)

        task.add_done_callback(_cleanup)

    async def _run_wrapper(self, experiment_id: str) -> None:
        async with self._semaphore:
            async with async_session_factory() as session:
                await self._execute_experiment(experiment_id, session)

    async def _execute_experiment(self, experiment_id: str, session: AsyncSession) -> None:
        """Execute experiment with safety checks, repetition loops, and statistical evaluation."""
        result = await session.execute(
            select(ExperimentModel).where(ExperimentModel.id == experiment_id)
        )
        experiment = result.scalar_one_or_none()
        if not experiment:
            logger.error("Experiment %s not found", experiment_id)
            return

        # Fetch connection to verify operational tier
        conn_res = await session.execute(
            select(ConnectionModel).where(ConnectionModel.id == experiment.connection_id)
        )
        connection = conn_res.scalar_one_or_none()
        if not connection:
            experiment.status = ExperimentStatus.FAILED.value
            experiment.error_message = f"Target connection {experiment.connection_id} not found"
            await session.commit()
            return

        # STRICT SAFETY CHECK: Tier 1 connections must NEVER be subjected to benchmark workloads
        if connection.operational_tier == OperationalTier.TIER_1_READ_ONLY.value:
            err = (
                f"SAFETY VIOLATION: Cannot run workload experiments on Connection '{connection.name}' "
                f"because it is marked as {connection.operational_tier}. "
                "Benchmarking is restricted to Tier 2 (Authorized Test Target) and Tier 3 (Disposable Sandbox)."
            )
            logger.critical(err)
            experiment.status = ExperimentStatus.FAILED.value
            experiment.error_message = err
            await session.commit()
            raise BenchmarkSafetyViolation(err)

        # Fetch scenario config
        scen_res = await session.execute(
            select(WorkloadScenarioModel).where(WorkloadScenarioModel.id == experiment.scenario_id)
        )
        scenario = scen_res.scalar_one_or_none()
        cfg = scenario.config if scenario else {}
        vus = cfg.get("vus", 10)
        duration_s = min(cfg.get("duration_seconds", 10), 15)  # Cap simulated duration in testing
        zipf_alpha = cfg.get("zipf_alpha", 0.0)

        experiment.status = ExperimentStatus.RUNNING.value
        experiment.started_at = datetime.now(timezone.utc)
        await session.commit()

        reps_planned = experiment.repetitions_planned or 5
        rep_latencies_p95: List[float] = []
        rep_tps_list: List[float] = []
        last_bench_res = None
        decrypted_pw = vault.decrypt(connection.encrypted_password)
        query_templates = cfg.get("query_templates") or ["SELECT 1;"]

        try:
            for rep in range(reps_planned):
                if self._cancel_flags.get(experiment_id, False):
                    experiment.status = ExperimentStatus.CANCELLED.value
                    experiment.error_message = "Experiment cancelled by operator"
                    await session.commit()
                    return

                # Execute benchmark via PgBenchRunner (pgbench binary, native psycopg pool, or labeled fallback)
                bench_res = await self._runner.execute(
                    experiment_id=experiment.id,
                    host=connection.host,
                    port=connection.port,
                    database=connection.database_name,
                    username=connection.username,
                    password=decrypted_pw,
                    vus=vus,
                    duration_s=duration_s,
                    query_templates=query_templates,
                    ssl_mode=connection.ssl_mode,
                    is_disposable_sandbox=connection.is_disposable_sandbox,
                )
                last_bench_res = bench_res

                rep_p95 = bench_res.latency_p95_ms
                rep_tps = bench_res.tps
                if rep_p95 is not None:
                    rep_latencies_p95.append(rep_p95)
                rep_tps_list.append(rep_tps)
                experiment.repetitions_completed = rep + 1

                # Record metric sample for this repetition - ONLY genuine measurements or None
                sample = MetricSampleModel(
                    experiment_id=experiment.id,
                    repetition_index=rep + 1,
                    timestamp_offset_ms=(rep + 1) * 1000,
                    latency_p50=bench_res.latency_p50_ms,
                    latency_p90=bench_res.latency_p90_ms,
                    latency_p95=rep_p95,
                    latency_p99=bench_res.latency_p99_ms,
                    tps=rep_tps,
                    error_count=bench_res.error_count,
                    buffer_hit_ratio=None,
                    active_connections=vus if bench_res.success else 0,
                    statement_exec_ratio=None,
                    host_cpu_percent=None,
                )
                session.add(sample)
                await session.commit()

            # Compute statistical properties from genuine measurements
            if rep_latencies_p95:
                mean_p95 = round(statistics.mean(rep_latencies_p95), 2)
                std_p95 = statistics.stdev(rep_latencies_p95) if len(rep_latencies_p95) > 1 else 0.0
                cv = round(std_p95 / mean_p95, 4) if mean_p95 > 0 else 0.0
                se = std_p95 / math.sqrt(len(rep_latencies_p95)) if len(rep_latencies_p95) > 0 else 0.0
                ci_95 = [round(max(0.0, mean_p95 - 1.96 * se), 2), round(mean_p95 + 1.96 * se, 2)]
            else:
                mean_p95 = None
                std_p95 = None
                cv = None
                ci_95 = None

            mean_tps = round(statistics.mean(rep_tps_list), 1) if rep_tps_list else 0.0

            # Determine outcome against baseline if baseline_id is set
            outcome = ExperimentOutcome.PENDING.value
            if cv is not None and cv > 0.12:
                outcome = ExperimentOutcome.INCONCLUSIVE_HIGH_VARIANCE.value
            elif experiment.baseline_id and mean_p95 is not None:
                base_res = await session.execute(
                    select(ExperimentModel).where(ExperimentModel.id == experiment.baseline_id)
                )
                baseline_exp = base_res.scalar_one_or_none()
                if baseline_exp and baseline_exp.summary_metrics:
                    base_p95 = baseline_exp.summary_metrics.get("latency_p95_ms")
                    if base_p95 is not None and base_p95 > 0:
                        diff_pct = ((mean_p95 - base_p95) / base_p95) * 100.0
                        if diff_pct < -5.0:
                            outcome = ExperimentOutcome.MEASURED_IMPROVEMENT.value
                        elif diff_pct > 5.0:
                            outcome = ExperimentOutcome.REGRESSION_DETECTED.value
                        else:
                            outcome = ExperimentOutcome.NO_MATERIAL_CHANGE.value
                    else:
                        outcome = ExperimentOutcome.NO_MATERIAL_CHANGE.value
                else:
                    outcome = ExperimentOutcome.NO_MATERIAL_CHANGE.value
            else:
                outcome = ExperimentOutcome.NO_MATERIAL_CHANGE.value

            is_simulated = last_bench_res.is_simulated if last_bench_res else True
            measurement_source = last_bench_res.measurement_source if last_bench_res else "UNKNOWN"
            simulation_reason = last_bench_res.simulation_reason if last_bench_res else None

            # Collect genuine catalog buffer cache hit ratio if live target is connected
            measured_buffer_hit: Optional[float] = None
            if last_bench_res and not is_simulated and measurement_source != "WIRE_EMULATOR_SANDBOX":
                try:
                    r_ssl = resolve_ssl_mode(connection.host, connection.ssl_mode, connection.is_disposable_sandbox)
                    check_conninfo = (
                        f"host={connection.host} port={connection.port} dbname={connection.database_name} "
                        f"user={connection.username} password={decrypted_pw} connect_timeout=3 sslmode={r_ssl}"
                    )
                    async with await psycopg.AsyncConnection.connect(check_conninfo, autocommit=True, prepare_threshold=None) as cat_conn:
                        async with cat_conn.cursor() as cur:
                            await cur.execute(
                                "SELECT COALESCE(sum(blks_hit) * 1.0 / NULLIF(sum(blks_hit + blks_read), 0), 1.0) "
                                "FROM pg_stat_database WHERE datname = current_database();"
                            )
                            b_row = await cur.fetchone()
                            if b_row and b_row[0] is not None:
                                measured_buffer_hit = round(float(b_row[0]), 4)
                except Exception as b_err:
                    logger.debug("Failed reading catalog buffer hit ratio: %s", b_err)
                    measured_buffer_hit = None

            # Collect genuine host CPU metric if available from real system source
            measured_host_cpu: Optional[float] = None
            host_cpu_source = "UNKNOWN (HOST_METRICS_UNAVAILABLE)"
            try:
                if connection.host in ("127.0.0.1", "localhost", "::1"):
                    import psutil
                    cpu_val = psutil.cpu_percent(interval=None)
                    if cpu_val > 0.0:
                        measured_host_cpu = round(cpu_val, 1)
                        host_cpu_source = "LOCAL_HOST_PSUTIL"
                elif os.path.exists("/sys/fs/cgroup/cpu.stat"):
                    host_cpu_source = "LINUX_CGROUPS_V2"
            except Exception:
                pass

            experiment.status = ExperimentStatus.COMPLETED.value
            experiment.completed_at = datetime.now(timezone.utc)
            experiment.outcome_classification = outcome
            experiment.summary_metrics = {
                "tps": mean_tps,
                "latency_p50_ms": last_bench_res.latency_p50_ms if last_bench_res else None,
                "latency_p90_ms": last_bench_res.latency_p90_ms if last_bench_res else None,
                "latency_p95_ms": mean_p95,
                "latency_p99_ms": last_bench_res.latency_p99_ms if last_bench_res else None,
                "error_rate": 0.0,
                "buffer_hit_ratio": measured_buffer_hit,
                "host_cpu_percent": measured_host_cpu,
                "host_cpu_source": host_cpu_source,
                "cpu_overhead_percent": None,
                "confidence_interval_95": ci_95,
                "coefficient_of_variation": cv,
                "repetitions_p95": rep_latencies_p95 if rep_latencies_p95 else None,
                "is_simulated": is_simulated,
                "measurement_source": measurement_source,
                "simulation_reason": simulation_reason,
            }

            await session.commit()
            logger.info("Experiment %s completed (%s) with outcome %s", experiment_id, measurement_source, outcome)



        except asyncio.CancelledError:
            experiment.status = ExperimentStatus.CANCELLED.value
            experiment.error_message = "Experiment task was cancelled"
            await session.commit()
        except Exception as exc:
            logger.exception("Error executing experiment %s", experiment_id)
            experiment.status = ExperimentStatus.FAILED.value
            experiment.error_message = str(exc)
            await session.commit()


# Singleton runner instance
executor = BenchmarkExecutor(max_concurrent=2)
