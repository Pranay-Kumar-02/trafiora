"""Database Connection SQLAlchemy Model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base


class ConnectionModel(Base):
    """Metadata connection record for monitored or benchmark target databases."""
    
    __tablename__ = "connections"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    engine: Mapped[str] = mapped_column(String(50), nullable=False, default="postgresql")
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=5432)
    database_name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    encrypted_password: Mapped[str] = mapped_column(Text, nullable=False)
    ssl_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="prefer")
    
    # Risk Tier: tier_1_read_only, tier_2_workload_benchmark, tier_3_disposable_sandbox
    operational_tier: Mapped[str] = mapped_column(String(40), nullable=False, default="tier_1_read_only")
    is_disposable_sandbox: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    capabilities: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    experiments = relationship("ExperimentModel", back_populates="connection", cascade="all, delete-orphan")
