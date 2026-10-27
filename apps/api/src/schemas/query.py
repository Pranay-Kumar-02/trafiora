"""Query Schemas & Request/Response Contracts."""
from typing import Any
from pydantic import BaseModel, Field


class NormalizeQueryRequest(BaseModel):
    """Request payload for normalizing and fingerprinting a SQL query."""
    
    raw_sql: str = Field(..., description="Raw unnormalized SQL statement or slow log line")
    dialect: str = Field("postgres", description="Target SQL dialect")


class QueryFingerprintResponse(BaseModel):
    """Response payload containing normalized query, SHA-256 fingerprint, and AST analysis."""
    
    fingerprint: str
    canonical_sql: str
    statement_type: str
    tables: list[str]
    columns: list[str]
    antipatterns: list[dict[str, str]]
    redaction_status: str
    ast_summary: dict[str, Any]
