"""Evidence-Based Bottleneck Diagnosis and Optimization Recommender Engine."""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RecommendationType(str, Enum):
    INDEX_RECOMMENDATION = "INDEX_RECOMMENDATION"
    QUERY_REWRITE = "QUERY_REWRITE"
    PAGINATION_OPTIMIZATION = "PAGINATION_OPTIMIZATION"
    LOCK_CONTENTION_AVOIDANCE = "LOCK_CONTENTION_AVOIDANCE"
    CONNECTION_POOLING = "CONNECTION_POOLING"


class BottleneckSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecommendationItem(BaseModel):
    id: str
    type: RecommendationType
    severity: BottleneckSeverity
    title: str
    impact_score: float = Field(..., description="Calculated bottleneck impact score (0 to 100)")
    evidence: str
    suggested_action: str
    suggested_ddl: Optional[str] = None
    is_verified: bool = False
    verification_requirement: str = "Must be validated via isolated A/B benchmark before production application"


class DiagnosisReport(BaseModel):
    analyzed_queries_count: int
    critical_bottlenecks_count: int
    recommendations: List[RecommendationItem]
    rationale_summary: str


class DiagnosisEngine:
    """Heuristic rule-based analyzer for database bottlenecks and query execution plans."""

    @staticmethod
    def analyze_plan(
        plan_dict: Dict[str, Any],
        query_sql: Optional[str] = None,
        calls: int = 1000,
        mean_exec_time_ms: float = 45.0,
    ) -> List[RecommendationItem]:
        """Analyzes execution plan tree and query text to produce actionable recommendations."""
        recommendations: List[RecommendationItem] = []
        rec_idx = 1

        plan_node = plan_dict.get("Plan", plan_dict)
        node_type = plan_node.get("Node Type", "")
        relation_name = plan_node.get("Relation Name", "target_table")
        total_cost = plan_node.get("Total Cost", 0.0)
        filter_clause = plan_node.get("Filter", "")

        # 1. Sequential Scan on Large/Costly Table
        if "Seq Scan" in node_type or plan_node.get("Filter") is not None:
            if total_cost > 100.0 or calls > 100:
                col_name = "account_id" if "account" in relation_name else "id"
                if filter_clause:
                    # Try to extract column from filter like (status = 'active')
                    parts = filter_clause.replace("(", "").replace(")", "").split("=")
                    if len(parts) > 1:
                        col_name = parts[0].strip().replace('"', '')

                impact = min(100.0, round((calls * mean_exec_time_ms * 0.001) + (total_cost * 0.05), 1))
                rec = RecommendationItem(
                    id=f"REC-{rec_idx:03d}",
                    type=RecommendationType.INDEX_RECOMMENDATION,
                    severity=BottleneckSeverity.CRITICAL if impact > 75.0 else BottleneckSeverity.HIGH,
                    title=f"Sequential Scan on {relation_name}",
                    impact_score=impact,
                    evidence=f"Plan executes a {node_type} with total cost {total_cost:.1f} and filter: '{filter_clause or 'None'}'.",
                    suggested_action=f"Create a B-tree index on `{relation_name}({col_name})` to allow Index Scans.",
                    suggested_ddl=f"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{relation_name}_{col_name} ON {relation_name} ({col_name});",
                    is_verified=False,
                )
                recommendations.append(rec)
                rec_idx += 1

        # 2. Deep Pagination Check
        if query_sql and "OFFSET" in query_sql.upper():
            rec = RecommendationItem(
                id=f"REC-{rec_idx:03d}",
                type=RecommendationType.PAGINATION_OPTIMIZATION,
                severity=BottleneckSeverity.HIGH,
                title="Deep OFFSET Pagination Degradation",
                impact_score=82.5,
                evidence="Query employs OFFSET-based pagination which scans and discards all preceding rows, leading to linear O(N) performance degradation.",
                suggested_action="Refactor to Keyset (Seek) Pagination using `WHERE id > :last_seen_id ORDER BY id ASC LIMIT :page_size`.",
                is_verified=False,
            )
            recommendations.append(rec)
            rec_idx += 1

        # 3. SELECT * Antipattern Check
        if query_sql and "SELECT *" in query_sql.upper():
            rec = RecommendationItem(
                id=f"REC-{rec_idx:03d}",
                type=RecommendationType.QUERY_REWRITE,
                severity=BottleneckSeverity.MEDIUM,
                title="Wildcard Column Projection (SELECT *)",
                impact_score=45.0,
                evidence="Query requests all columns, preventing Index-Only Scans and increasing network transfer and serialization overhead.",
                suggested_action="Explicitly project only the specific required columns.",
                is_verified=False,
            )
            recommendations.append(rec)
            rec_idx += 1

        # 4. Row Lock Contention Check
        if query_sql and ("FOR UPDATE" in query_sql.upper() or "FOR SHARE" in query_sql.upper()):
            rec = RecommendationItem(
                id=f"REC-{rec_idx:03d}",
                type=RecommendationType.LOCK_CONTENTION_AVOIDANCE,
                severity=BottleneckSeverity.HIGH,
                title="Pessimistic Row Lock Contention",
                impact_score=78.0,
                evidence="Query acquires exclusive row locks (`FOR UPDATE`), causing concurrent transactions to block and queue on lock wait events.",
                suggested_action="Use `FOR UPDATE SKIP LOCKED` for task queues or evaluate optimistic concurrency control with a version column.",
                is_verified=False,
            )
            recommendations.append(rec)
            rec_idx += 1

        # Sort recommendations by impact score descending
        recommendations.sort(key=lambda r: r.impact_score, reverse=True)
        return recommendations
