"""Unit tests for pgbench execution sub-runner and verified orphan session cleanup."""
import pytest
from apps.api.src.runner.cleanup import BENCHMARK_APP_PREFIX, BENCHMARK_USER, SessionCleanupManager
from apps.api.src.runner.pgbench_runner import PgBenchRunner


def test_pgbench_script_generation():
    """Verify pgbench custom transaction script generator substitutes parameter markers correctly."""
    runner = PgBenchRunner()
    templates = [
        "SELECT id, title FROM posts WHERE id = $1",
        "UPDATE posts SET likes = likes + 1 WHERE id = $1",
    ]
    script = runner.generate_custom_script(templates)
    assert "\\set aid random(1, 100000)" in script
    assert "SELECT id, title FROM posts WHERE id = :aid;" in script
    assert "UPDATE posts SET likes = likes + 1 WHERE id = :aid;" in script


def test_pgbench_output_parsing():
    """Verify parsing of real pgbench stdout output."""
    sample_stdout = """
starting vacuum...end.
transaction type: custom script
scaling factor: 1
query mode: simple
number of clients: 20
number of threads: 2
maximum number of tries: 1
duration: 10 s
number of transactions actually processed: 25482
number of failed transactions: 0 (0.000%)
latency average = 7.842 ms
latency stddev = 1.234 ms
initial connection time = 15.231 ms
tps = 2548.192831 (without initial connection time)
"""
    runner = PgBenchRunner()
    res = runner.parse_pgbench_output(sample_stdout)
    assert res.success is True
    assert res.tps == 2548.2
    assert res.latency_avg_ms == 7.84
    assert res.latency_p95_ms == 12.55
    assert res.error_count == 0


@pytest.mark.asyncio
async def test_pgbench_fallback_when_binary_missing():
    """Verify that when pgbench binary is absent, graceful simulated fallback executes without failure."""
    runner = PgBenchRunner(pgbench_bin=None)
    assert not runner.is_available
    res = await runner.execute(
        experiment_id="exp-1234",
        host="localhost",
        port=5432,
        database="testdb",
        username="user",
        password="pwd",
        vus=10,
        duration_s=5,
        query_templates=["SELECT * FROM items WHERE id = $1"],
    )
    assert res.success is True
    assert res.is_simulated_fallback is True
    assert res.tps > 0
    assert res.latency_p95_ms > 0


def test_orphan_session_cleanup_sql_isolation():
    """Verify that orphan session cleanup SQL strictly isolates benchmark sessions."""
    sql_global = SessionCleanupManager.build_orphan_discovery_sql()
    assert f"usename = '{BENCHMARK_USER}'" in sql_global
    assert f"application_name LIKE '{BENCHMARK_APP_PREFIX}%'" in sql_global

    sql_specific = SessionCleanupManager.build_orphan_discovery_sql("test-uuid-999")
    assert f"application_name = '{BENCHMARK_APP_PREFIX}test-uuid-999'" in sql_specific
    assert f"usename = '{BENCHMARK_USER}'" in sql_specific
