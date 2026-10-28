"""Regression Evaluation Engine comparing Baseline and Candidate benchmark runs."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RegressionBudget(BaseModel):
    max_p95_latency_increase_pct: float = Field(default=5.0, description="Max acceptable p95 latency regression %")
    max_error_rate: float = Field(default=0.01, description="Max acceptable error rate (1%)")
    min_tps_retention_pct: float = Field(default=90.0, description="Minimum acceptable candidate TPS as % of baseline")
    max_variance_cv: float = Field(default=0.10, description="Max acceptable coefficient of variation")


class MetricComparison(BaseModel):
    baseline: float
    candidate: float
    diff_pct: float
    passed: bool
    threshold_desc: str


class EvaluationResult(BaseModel):
    passed: bool
    outcome: str
    reasons: List[str]
    p95_comparison: MetricComparison
    tps_comparison: MetricComparison
    error_rate_candidate: float
    is_inconclusive: bool = False
    markdown_report: str = ""


class RegressionEvaluator:
    """Evaluates whether a candidate query/schema/configuration change regressed database performance."""

    @staticmethod
    def evaluate(
        baseline_metrics: Dict[str, Any],
        candidate_metrics: Dict[str, Any],
        budget: Optional[RegressionBudget] = None,
    ) -> EvaluationResult:
        if budget is None:
            budget = RegressionBudget()

        base_p95_raw = baseline_metrics.get("latency_p95_ms")
        cand_p95_raw = candidate_metrics.get("latency_p95_ms")
        base_p95 = float(base_p95_raw) if base_p95_raw is not None else 0.0
        cand_p95 = float(cand_p95_raw) if cand_p95_raw is not None else 0.0

        p95_unavailable = base_p95_raw is None or cand_p95_raw is None
        if p95_unavailable:
            p95_diff_pct = 0.0
            p95_passed = False
        else:
            p95_diff_pct = round(((cand_p95 - base_p95) / max(0.001, base_p95)) * 100.0, 2)
            p95_passed = p95_diff_pct <= budget.max_p95_latency_increase_pct

        base_tps = float(baseline_metrics.get("tps", 1.0))
        cand_tps = float(candidate_metrics.get("tps", 1.0))
        tps_retention_pct = round((cand_tps / max(0.001, base_tps)) * 100.0, 2)
        tps_passed = tps_retention_pct >= budget.min_tps_retention_pct

        cand_errors = float(candidate_metrics.get("error_rate", 0.0))
        errors_passed = cand_errors <= budget.max_error_rate

        cand_cv = float(candidate_metrics.get("coefficient_of_variation") or 0.0)
        is_inconclusive = cand_cv > budget.max_variance_cv or p95_unavailable

        reasons = []
        if p95_unavailable:
            reasons.append("Reliable p95 latency measurement is unavailable for evaluation")
        elif not p95_passed:
            reasons.append(
                f"Latency p95 increased by {p95_diff_pct:+.1f}% (limit: +{budget.max_p95_latency_increase_pct:.1f}%)"
            )

        if not tps_passed:
            reasons.append(
                f"TPS throughput retention is {tps_retention_pct:.1f}% (minimum required: {budget.min_tps_retention_pct:.1f}%)"
            )
        if not errors_passed:
            reasons.append(
                f"Candidate error rate is {cand_errors:.3f} (limit: {budget.max_error_rate:.3f})"
            )
        if is_inconclusive:
            reasons.append(
                f"High measurement variance detected (CV={cand_cv:.3f} > {budget.max_variance_cv:.3f}); results are inconclusive"
            )

        overall_passed = p95_passed and tps_passed and errors_passed and not is_inconclusive

        if is_inconclusive:
            outcome = "INCONCLUSIVE_HIGH_VARIANCE"
        elif not overall_passed:
            outcome = "REGRESSION_DETECTED"
        elif p95_diff_pct < -5.0:
            outcome = "MEASURED_IMPROVEMENT"
        else:
            outcome = "NO_MATERIAL_CHANGE"

        # Build GitHub Actions / PR markdown report
        md = [
            f"### Trafiora Performance Regression Gate: **{'PASSED' if overall_passed else 'FAILED'}**",
            "",
            f"- **Outcome Classification**: `{outcome}`",
            f"- **Latency p95**: Baseline `{base_p95:.2f}ms` vs Candidate `{cand_p95:.2f}ms` ({p95_diff_pct:+.1f}%) [{'PASS' if p95_passed else 'FAIL'}]",
            f"- **Throughput (TPS)**: Baseline `{base_tps:.1f}` vs Candidate `{cand_tps:.1f}` ({tps_retention_pct:.1f}% retention) [{'PASS' if tps_passed else 'FAIL'}]",
            f"- **Error Rate**: `{cand_errors:.2%}` [{'PASS' if errors_passed else 'FAIL'}]",
            "",
        ]
        if reasons:
            md.append("**Gate Breach Details:**")
            for r in reasons:
                md.append(f"- :warning: {r}")

        return EvaluationResult(
            passed=overall_passed,
            outcome=outcome,
            reasons=reasons,
            p95_comparison=MetricComparison(
                baseline=base_p95,
                candidate=cand_p95,
                diff_pct=p95_diff_pct,
                passed=p95_passed,
                threshold_desc=f"<= +{budget.max_p95_latency_increase_pct}%",
            ),
            tps_comparison=MetricComparison(
                baseline=base_tps,
                candidate=cand_tps,
                diff_pct=round(tps_retention_pct - 100.0, 2),
                passed=tps_passed,
                threshold_desc=f">= {budget.min_tps_retention_pct}%",
            ),
            error_rate_candidate=cand_errors,
            is_inconclusive=is_inconclusive,
            markdown_report="\n".join(md),
        )
