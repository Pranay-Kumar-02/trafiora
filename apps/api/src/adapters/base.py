"""Abstract Base Database Adapter Interface."""
from abc import ABC, abstractmethod
from typing import Any


class DatabaseAdapter(ABC):
    """Abstract interface for database engine adapters."""

    @abstractmethod
    async def probe_capabilities(self) -> dict[str, Any]:
        """Probes database engine version, installed extensions, and telemetry capabilities."""
        pass

    @abstractmethod
    async def extract_query_statistics(self, limit: int = 50) -> list[dict[str, Any]]:
        """Extracts slow and frequent query statistics from catalog/extensions."""
        pass

    @abstractmethod
    async def execute_read_only(self, query: str, timeout_seconds: float = 2.0) -> list[dict[str, Any]]:
        """Executes a strictly read-only catalog or inspection query under timeout."""
        pass

    @abstractmethod
    async def get_active_sessions(self) -> list[dict[str, Any]]:
        """Returns currently active client sessions, queries, and wait states."""
        pass
