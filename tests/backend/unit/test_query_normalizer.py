"""Unit tests for SQLGlot QueryNormalizer, parameter stripping, and antipattern detection."""
from apps.api.src.intelligence.normalizer import QueryNormalizer


def test_simple_select_literal_stripping() -> None:
    normalizer = QueryNormalizer()
    raw_sql = "SELECT id, title FROM posts WHERE user_id = 42 AND status = 'active';"
    res = normalizer.normalize(raw_sql)
    
    assert "42" not in res.canonical_sql
    assert "'active'" not in res.canonical_sql
    assert "$1" in res.canonical_sql
    assert "$2" in res.canonical_sql
    assert "posts" in res.tables
    assert res.statement_type == "SELECT"
    assert res.redaction_status == "REDACTED_SAFE"


def test_comment_purging() -> None:
    normalizer = QueryNormalizer()
    raw_sql = """
    -- Confidential user query
    SELECT count(*) /* inline comment */ FROM orders WHERE total > 100.50;
    """
    res = normalizer.normalize(raw_sql)
    assert "Confidential" not in res.canonical_sql
    assert "inline comment" not in res.canonical_sql
    assert "100.50" not in res.canonical_sql
    assert "orders" in res.tables


def test_complex_cte_and_joins() -> None:
    normalizer = QueryNormalizer()
    raw_sql = """
    WITH regional_sales AS (
        SELECT region, SUM(amount) AS total_sales
        FROM sales
        WHERE year = 2026
        GROUP BY region
    )
    SELECT p.name, rs.total_sales
    FROM products p
    JOIN regional_sales rs ON p.region = rs.region
    WHERE p.category = 'electronics';
    """
    res = normalizer.normalize(raw_sql)
    assert "2026" not in res.canonical_sql
    assert "'electronics'" not in res.canonical_sql
    assert "sales" in res.tables
    assert "products" in res.tables
    assert res.ast_summary["cte_count"] == 1
    assert res.ast_summary["join_count"] == 1


def test_sensitive_identifier_flagging() -> None:
    normalizer = QueryNormalizer()
    raw_sql = "SELECT ssn_number, user_password FROM accounts WHERE account_id = 99;"
    res = normalizer.normalize(raw_sql)
    assert res.redaction_status == "REDACTION_UNCERTAIN: POTENTIALLY_SENSITIVE"


def test_antipattern_detection() -> None:
    normalizer = QueryNormalizer()
    raw_sql = "SELECT * FROM users u, orders o ORDER BY created_at;"
    res = normalizer.normalize(raw_sql)
    
    types = [ap["type"] for ap in res.antipatterns]
    assert "WILDCARD_PROJECTION" in types
    assert "UNBOUNDED_SORT" in types
