"""SQLGlot AST Query Normalizer, Literal Stripper & Antipattern Analyzer."""
import re
from typing import Any
import sqlglot
from sqlglot import exp

SENSITIVE_IDENTIFIER_PATTERNS = [
    r"ssn",
    r"password",
    r"passwd",
    r"secret",
    r"token",
    r"credit_?card",
    r"cvv",
    r"email",
    r"phone",
    r"auth",
]


class NormalizedQueryResult:
    """Encapsulates the result of normalizing a raw SQL query."""

    def __init__(
        self,
        canonical_sql: str,
        statement_type: str,
        tables: list[str],
        columns: list[str],
        antipatterns: list[dict[str, str]],
        redaction_status: str,
        ast_summary: dict[str, Any],
    ) -> None:
        self.canonical_sql = canonical_sql
        self.statement_type = statement_type
        self.tables = tables
        self.columns = columns
        self.antipatterns = antipatterns
        self.redaction_status = redaction_status
        self.ast_summary = ast_summary

    def to_dict(self) -> dict[str, Any]:
        return {
            "canonical_sql": self.canonical_sql,
            "statement_type": self.statement_type,
            "tables": self.tables,
            "columns": self.columns,
            "antipatterns": self.antipatterns,
            "redaction_status": self.redaction_status,
            "ast_summary": self.ast_summary,
        }


class QueryNormalizer:
    """AST-driven SQL Normalizer and Parameter Stripper."""

    def __init__(self, default_dialect: str = "postgres") -> None:
        self.dialect = default_dialect

    def normalize(self, raw_sql: str) -> NormalizedQueryResult:
        """Parses raw SQL, purges comments, replaces literals with parameters,

        and extracts structural lineage.
        """
        if not raw_sql or not raw_sql.strip():
            raise ValueError("Input SQL cannot be empty")

        # 1. Clean comment syntax
        cleaned_sql = self._strip_raw_comments(raw_sql)

        # 2. Parse AST via SQLGlot
        try:
            parsed = sqlglot.parse_one(cleaned_sql, read=self.dialect)
        except Exception as e:
            # Safe fallback for dialect extensions or unsupported syntax
            fallback_sql = self._naive_regex_mask(cleaned_sql)
            return NormalizedQueryResult(
                canonical_sql=fallback_sql,
                statement_type="UNKNOWN",
                tables=[],
                columns=[],
                antipatterns=[{"type": "PARSE_ERROR", "description": f"Parser notice: {e!s}"}],
                redaction_status="REDACTION_UNCERTAIN: PARSER_FALLBACK",
                ast_summary={"raw_length": len(raw_sql), "fallback": True},
            )

        statement_type = parsed.key.upper() if parsed.key else "UNKNOWN"

        # 3. Extract tables and columns
        tables = sorted(list({t.name for t in parsed.find_all(exp.Table) if t.name}))
        columns = sorted(list({c.name for c in parsed.find_all(exp.Column) if c.name}))

        # 4. Antipattern detection
        antipatterns = self._detect_antipatterns(parsed)

        # 5. Check for sensitive identifiers
        has_sensitive_identifiers = self._check_sensitive_identifiers(tables + columns)
        redaction_status = (
            "REDACTION_UNCERTAIN: POTENTIALLY_SENSITIVE"
            if has_sensitive_identifiers
            else "REDACTED_SAFE"
        )

        # 6. Replace all literals with parameters ($1, $2, ...)
        param_counter = 0

        def replace_literal(node: exp.Expression) -> exp.Expression:
            nonlocal param_counter
            if isinstance(node, (exp.Literal, exp.Boolean, exp.Null)):
                param_counter += 1
                return exp.Parameter(this=exp.var(f"${param_counter}"))
            return node

        transformed = parsed.transform(replace_literal)
        canonical_sql = transformed.sql(dialect=self.dialect)

        # AST summary
        ast_summary = {
            "join_count": len(list(parsed.find_all(exp.Join))),
            "cte_count": len(list(parsed.find_all(exp.CTE))),
            "has_where": parsed.find(exp.Where) is not None,
            "has_group_by": parsed.find(exp.Group) is not None,
            "has_order_by": parsed.find(exp.Order) is not None,
            "has_window": len(list(parsed.find_all(exp.Window))) > 0,
            "parameter_count": param_counter,
        }

        return NormalizedQueryResult(
            canonical_sql=canonical_sql,
            statement_type=statement_type,
            tables=tables,
            columns=columns,
            antipatterns=antipatterns,
            redaction_status=redaction_status,
            ast_summary=ast_summary,
        )

    def _strip_raw_comments(self, sql_text: str) -> str:
        """Strips single-line and multi-line comments from SQL."""
        # Strip /* block comments */
        no_blocks = re.sub(r"/\*.*?\*/", "", sql_text, flags=re.DOTALL)
        # Strip -- line comments
        no_lines = re.sub(r"--[^\r\n]*", "", no_blocks)
        return no_lines.strip()

    def _naive_regex_mask(self, sql_text: str) -> str:
        """Fallback regex literal stripper if AST parsing fails."""
        # Mask quoted strings
        s = re.sub(r"'(?:''|[^'])*'", "'$PARAM'", sql_text)
        # Mask numbers
        s = re.sub(r"\b\d+(\.\d+)?\b", "$PARAM", s)
        return s.strip()

    def _check_sensitive_identifiers(self, identifiers: list[str]) -> bool:
        """Checks if table or column names contain potentially sensitive keywords."""
        for name in identifiers:
            lower = name.lower()
            for pattern in SENSITIVE_IDENTIFIER_PATTERNS:
                if re.search(pattern, lower):
                    return True
        return False

    def _detect_antipatterns(self, parsed: exp.Expression) -> list[dict[str, str]]:
        """Scans AST for common performance antipatterns."""
        antipatterns: list[dict[str, str]] = []

        # Check for SELECT * (Wildcard projection)
        for star in parsed.find_all(exp.Star):
            antipatterns.append({
                "type": "WILDCARD_PROJECTION",
                "severity": "LOW",
                "description": "Query uses SELECT *. Specifying explicit columns reduces network and buffer overhead.",
            })
            break

        # Check for Cartesian Joins
        for join in parsed.find_all(exp.Join):
            if join.kind == "CROSS" or (not join.args.get("on") and not join.args.get("using")):
                antipatterns.append({
                    "type": "CARTESIAN_PRODUCT_RISK",
                    "severity": "HIGH",
                    "description": "Cross join or join without predicate detected. May produce unbounded result sets.",
                })
                break

        # Check for ORDER BY without LIMIT
        if parsed.find(exp.Order) and not parsed.find(exp.Limit):
            antipatterns.append({
                "type": "UNBOUNDED_SORT",
                "severity": "MEDIUM",
                "description": "ORDER BY without LIMIT may force full table in-memory/disk sort.",
            })

        return antipatterns


# Default normalizer instance
normalizer = QueryNormalizer()
