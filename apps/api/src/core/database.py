"""SQLAlchemy 2.x Async Database Engine & Session Management."""
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from .config import settings


class Base(DeclarativeBase):
    """Base declarative class for all Trafiora metadata models."""
    pass


def get_engine() -> AsyncEngine:
    """Creates the appropriate async engine with sqlite/psycopg dialect handling."""
    url = settings.TRAFIORA_METADATA_DATABASE_URL
    # If standard postgresql:// URI is provided, adapt to postgresql+psycopg://
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        
    return create_async_engine(
        url,
        echo=False,
        future=True,
    )


engine = get_engine()
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for obtaining an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database schemas and tables."""
    from .. import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

