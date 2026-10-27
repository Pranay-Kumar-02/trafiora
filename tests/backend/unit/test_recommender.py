"""Unit tests for Bottleneck Diagnosis Engine and Recommendation API."""
import pytest
from httpx import ASGITransport, AsyncClient
from apps.api.src.intelligence.recommender import (
    BottleneckSeverity,
    DiagnosisEngine,
    RecommendationType,
)
from apps.api.src.main import app


def test_seq_scan_generates_unverified_index_ddl():
    """Verify that a sequential scan on a high-cost plan generates unverified CREATE INDEX CONCURRENTLY DDL."""
    mock_plan = {
        "Plan": {
            "Node Type": "Seq Scan",
            "Relation Name": "transactions",
            "Total Cost": 1420.5,
            "Filter": "(account_id = 42)",
        }
    }
    recs = DiagnosisEngine.analyze_plan(mock_plan, calls=5000, mean_exec_time_ms=62.0)
    assert len(recs) >= 1
    idx_rec = next(r for r in recs if r.type == RecommendationType.INDEX_RECOMMENDATION)
    assert idx_rec.severity in [BottleneckSeverity.CRITICAL, BottleneckSeverity.HIGH]
    assert idx_rec.is_verified is False  # Must not claim verified until benchmarked
    assert "CREATE INDEX CONCURRENTLY" in idx_rec.suggested_ddl
    assert "idx_transactions_account_id" in idx_rec.suggested_ddl


def test_antipattern_heuristics_detection():
    """Verify detection of pagination, lock contention, and wildcard projections."""
    mock_plan = {"Plan": {"Node Type": "Index Scan", "Total Cost": 25.0}}
    query_sql = "SELECT * FROM orders WHERE status = 'pending' ORDER BY id DESC LIMIT 50 OFFSET 10000 FOR UPDATE"
    recs = DiagnosisEngine.analyze_plan(mock_plan, query_sql=query_sql)
    rec_types = [r.type for r in recs]
    assert RecommendationType.PAGINATION_OPTIMIZATION in rec_types
    assert RecommendationType.QUERY_REWRITE in rec_types
    assert RecommendationType.LOCK_CONTENTION_AVOIDANCE in rec_types


@pytest.mark.asyncio
async def test_diagnosis_api_endpoints():
    """Verify /api/v1/diagnosis/rules and /api/v1/diagnosis/analyze endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch rules catalog
        rules_res = await client.get("/api/v1/diagnosis/rules")
        assert rules_res.status_code == 200
        rules = rules_res.json()
        assert len(rules) >= 4

        # 2. Analyze plan via API
        payload = {
            "plan_dict": {
                "Plan": {
                    "Node Type": "Seq Scan",
                    "Relation Name": "users",
                    "Total Cost": 350.0,
                    "Filter": "(email = 'user@example.com')",
                }
            },
            "query_sql": "SELECT * FROM users WHERE email = 'user@example.com'",
            "calls": 2000,
            "mean_exec_time_ms": 15.0,
        }
        analyze_res = await client.post("/api/v1/diagnosis/analyze", json=payload)
        assert analyze_res.status_code == 200
        report = analyze_res.json()
        assert report["analyzed_queries_count"] == 1
        assert len(report["recommendations"]) >= 1
        assert "UNVERIFIED" in report["rationale_summary"]
