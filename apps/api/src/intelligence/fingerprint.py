"""Query Fingerprinting & Cataloging Service."""
import hashlib
from typing import Any
from .normalizer import QueryNormalizer, normalizer


class QueryFingerprinter:
    """Computes deterministic SHA-256 fingerprint hashes for SQL queries."""

    def __init__(self, query_normalizer: QueryNormalizer | None = None) -> None:
        self.normalizer = query_normalizer or normalizer

    def compute_fingerprint(self, canonical_sql: str) -> str:
        """Computes deterministic SHA-256 hash of canonicalized SQL."""
        # Standardize whitespace and casing for hashing
        clean = " ".join(canonical_sql.strip().split())
        return hashlib.sha256(clean.encode("utf-8")).hexdigest()

    def process_query(self, raw_sql: str) -> dict[str, Any]:
        """End-to-end normalization and fingerprint generation."""
        normalized = self.normalizer.normalize(raw_sql)
        fingerprint = self.compute_fingerprint(normalized.canonical_sql)
        
        result = normalized.to_dict()
        result["fingerprint"] = fingerprint
        return result


fingerprinter = QueryFingerprinter()
