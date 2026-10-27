"""Database Bottleneck Diagnosis & Optimization API Router."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ...intelligence.recommender import (
    BottleneckSeverity,
    DiagnosisEngine,
    DiagnosisReport,
    RecommendationItem,
    RecommendationType,
)

router = APIRouter(prefix="/diagnosis", tags=["Diagnosis"])


class AnalyzePlanRequest(BaseModel):
    plan_dict: Dict[str, Any] = Field(..., description="PostgreSQL JSON execution plan")
    query_sql: Optional[str] = Field(default=None, description="Original SQL query string")
    calls: int = Field(default=1000, ge=1, description="Observed query call count")
    mean_exec_time_ms: float = Field(default=35.0, ge=0.0, description="Mean statement execution time")


class RuleCatalogItem(BaseModel):
    rule_id: str
    name: str
    target_pattern: str
    recommendation_type: str
    default_severity: str


RULE_CATALOG: List[RuleCatalogItem] = [
    RuleCatalogItem(
        rule_id="RULE-01",
        name="Sequential Scan on High-Volume Relation",
        target_pattern="Node Type: Seq Scan with Total Cost > 100",
        recommendation_type=RecommendationType.INDEX_RECOMMENDATION.value,
        default_severity=BottleneckSeverity.CRITICAL.value,
    ),
    RuleCatalogItem(
        rule_id="RULE-02",
        name="Deep OFFSET Pagination",
        target_pattern="SQL containing OFFSET keyword with high call frequency",
        recommendation_type=RecommendationType.PAGINATION_OPTIMIZATION.value,
        default_severity=BottleneckSeverity.HIGH.value,
    ),
    RuleCatalogItem(
        rule_id="RULE-03",
        name="Pessimistic Row Lock Contention",
        target_pattern="SQL with FOR UPDATE locking clause",
        recommendation_type=RecommendationType.LOCK_CONTENTION_AVOIDANCE.value,
        default_severity=BottleneckSeverity.HIGH.value,
    ),
    RuleCatalogItem(
        rule_id="RULE-04",
        name="Wildcard Column Projection",
        target_pattern="SQL starting with SELECT *",
        recommendation_type=RecommendationType.QUERY_REWRITE.value,
        default_severity=BottleneckSeverity.MEDIUM.value,
    ),
]


@router.get("/rules", response_model=List[RuleCatalogItem])
async def list_diagnostic_rules() -> List[RuleCatalogItem]:
    """Retrieve catalog of active bottleneck detection rules and heuristics."""
    return RULE_CATALOG


@router.post("/analyze", response_model=DiagnosisReport)
async def analyze_bottlenecks(payload: AnalyzePlanRequest) -> DiagnosisReport:
    """Diagnoses performance bottlenecks from an execution plan and returns ranked recommendations."""
    recs = DiagnosisEngine.analyze_plan(
        plan_dict=payload.plan_dict,
        query_sql=payload.query_sql,
        calls=payload.calls,
        mean_exec_time_ms=payload.mean_exec_time_ms,
    )

    critical_count = sum(1 for r in recs if r.severity == BottleneckSeverity.CRITICAL)
    summary = (
        f"Detected {len(recs)} potential optimization opportunities ({critical_count} critical). "
        "All suggested indexes are marked UNVERIFIED and must be evaluated on an isolated test target."
    )

    return DiagnosisReport(
        analyzed_queries_count=1,
        critical_bottlenecks_count=critical_count,
        recommendations=recs,
        rationale_summary=summary,
    )
