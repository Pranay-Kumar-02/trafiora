"""Query Fingerprint SQLAlchemy Model."""
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from ..core.database import Base


class QueryFingerprintModel(Base):
    """Normalized query fingerprint cataloging unique query structures and AST metadata."""
    
    __tablename__ = "query_fingerprints"
    
    fingerprint: Mapped[str] = mapped_column(String(64), primary_key=True) # SHA-256
    canonical_sql: Mapped[str] = mapped_column(Text, nullable=False)
    ast_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    statement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    tables_referenced: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    redaction_status: Mapped[str] = mapped_column(String(40), nullable=False, default="REDACTED_SAFE")
    
    total_calls: Mapped[int] = mapped_column(default=0)
    mean_latency_ms: Mapped[float] = mapped_column(default=0.0)
    p99_latency_ms: Mapped[float] = mapped_column(default=0.0)
    
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
