"""Unit tests for Trafiora CI Regression Evaluator."""
from packages.cli.trafiora_ci.evaluator import (
    RegressionBudget,
    RegressionEvaluator,
)


def test_evaluator_improvement_passes():
    """Verify that an optimization reducing p95 latency results in MEASURED_IMPROVEMENT and passes."""
    baseline = {"latency_p95_ms": 20.0, "tps": 1000.0, "error_rate": 0.0, "coefficient_of_variation": 0.02}
    candidate = {"latency_p95_ms": 14.0, "tps": 1350.0, "error_rate": 0.0, "coefficient_of_variation": 0.02}

    res = RegressionEvaluator.evaluate(baseline, candidate)
    assert res.passed is True
    assert res.outcome == "MEASURED_IMPROVEMENT"
    assert res.p95_comparison.diff_pct == -30.0
    assert "PASSED" in res.markdown_report


def test_evaluator_regression_fails():
    """Verify that a latency spike exceeding budget (+20% > 5%) triggers REGRESSION_DETECTED and fails."""
    baseline = {"latency_p95_ms": 20.0, "tps": 1000.0, "error_rate": 0.0, "coefficient_of_variation": 0.02}
    candidate = {"latency_p95_ms": 25.0, "tps": 820.0, "error_rate": 0.0, "coefficient_of_variation": 0.03}

    budget = RegressionBudget(max_p95_latency_increase_pct=5.0)
    res = RegressionEvaluator.evaluate(baseline, candidate, budget)
    assert res.passed is False
    assert res.outcome == "REGRESSION_DETECTED"
    assert len(res.reasons) >= 1
    assert "FAILED" in res.markdown_report


def test_evaluator_high_variance_is_inconclusive():
    """Verify that noisy benchmark runs (CV > 0.10) are marked INCONCLUSIVE_HIGH_VARIANCE."""
    baseline = {"latency_p95_ms": 20.0, "tps": 1000.0, "error_rate": 0.0, "coefficient_of_variation": 0.02}
    candidate = {"latency_p95_ms": 19.0, "tps": 1020.0, "error_rate": 0.0, "coefficient_of_variation": 0.16}

    budget = RegressionBudget(max_variance_cv=0.10)
    res = RegressionEvaluator.evaluate(baseline, candidate, budget)
    assert res.passed is False
    assert res.is_inconclusive is True
    assert res.outcome == "INCONCLUSIVE_HIGH_VARIANCE"
