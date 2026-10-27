# Trafiora Architecture & Decision Records

## 1. Architectural Principles
1. **Out-of-Band Observation:** Trafiora operates strictly outside the application query path. If Trafiora is offline or unreachable, user traffic to the database continues uninterrupted.
2. **Three-Tier Operational Risk Separation:**
   - **Tier 1 (Read-Only Observation):** Monitored production & staging databases. Bounded CPU ($< 1\%$), statement timeout $\le 2\text{s}$, zero statement execution.
   - **Tier 2 (Workload Benchmarking):** Permitted only on explicitly authorized targets. Hard wall-clock limits ($\le 300\text{s}$), concurrency caps ($\le 50\text{ VUs}$), verified session ownership cleanup.
   - **Tier 3 (Administrative Mutation):** Schema changes and executing `EXPLAIN (ANALYZE, BUFFERS)` are permitted **exclusively on ephemeral, disposable sandboxes** (`is_disposable_sandbox = true`).
3. **Rollback Inadequacy Principle:** Transaction rollback (`ROLLBACK`) alone does NOT prove arbitrary SQL has no side effects. In PostgreSQL, sequence increments, advisory locks, external extensions, and memory/disk resource consumption persist despite rollback. Execution-based analysis is strictly barred from production.
4. **Statistical Rigor:** Benchmarks run across $K \ge 5$ independent repetitions with bootstrap 95% confidence intervals and coefficient of variation checks ($\text{CV} > 0.05$) to prevent false positive improvement claims.

---

## 2. Architecture Decision Records (ADRs)

### ADR-001: Pure Python SQL Parsing via SQLGlot
- **Context:** We need dialect-aware SQL normalization, literal stripping, and AST inspection across diverse database engines without native C compilation bottlenecks on client or CI machines.
- **Decision:** Use SQLGlot (pinned `30.24.0`).
- **Consequences:** Deterministic AST traversal, zero binary C extension compile failures, support for 30+ dialects.

### ADR-002: Dual Database Architecture
- **Context:** Storing benchmark metrics, query fingerprints, and user configurations inside the user's monitored database causes schema pollution, lock contention, and security cross-contamination.
- **Decision:** Trafiora maintains its own internal PostgreSQL 18.6 metadata database, completely isolated from user target databases.
- **Consequences:** Clean separation of concerns; zero schema pollution on user systems.

### ADR-003: Key-Separated AES-256-GCM Credential Vaulting
- **Context:** Database connection strings contain sensitive passwords that must never be exposed to clients, logs, or unencrypted database dumps.
- **Decision:** Encrypt credentials using AES-256-GCM with versioned envelopes (`v1:<salt>:<IV>:<ciphertext>:<tag>`). The master encryption key is supplied via `TRAFIORA_MASTER_KEY` or external KMS, completely separate from database storage.
- **Consequences:** Even if the metadata database dump is compromised, credentials cannot be decrypted without the master key.
