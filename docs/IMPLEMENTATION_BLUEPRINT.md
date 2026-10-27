# TRAFIORA — SYSTEM ARCHITECTURE & IMPLEMENTATION BLUEPRINT
**Product:** Trafiora  
**Tagline & Positioning:** *Diagnose. Prove. Protect.*  
**Repository:** `https://github.com/Pranay-Kumar-02/trafiora.git`  
**Document Version:** 2.2.0 (Verified Compatibility & Hardened Statistical Specification)  
**Status:** PROPOSED — PENDING ARCHITECTURAL APPROVAL (PLANNING MODE ONLY)  

---

## EXECUTIVE SUMMARY & MISSION

Engineering teams operating database-backed applications face a persistent workflow disconnect:
1. **Observability tools** (APMs, cloud metrics, query logs) indicate *that* a database is slow or saturated, but cannot safely *reproduce* the underlying load or prove that a candidate optimization will resolve the bottleneck.
2. **Benchmarking tools** (pgbench, sysbench, k6) generate synthetic traffic disconnected from actual application query plans and production traffic skew.
3. **Query analyzers** suggest index changes or query rewrites in isolation, without testing behavior under heavy concurrency, cache churn, write amplification, or lock contention.
4. **CI/CD pipelines** verify functional correctness, but allow catastrophic query regressions (e.g., an unindexed join causing a sequential scan on a 50M-row table) to slip silently into production.

**Trafiora** unifies five mission-critical activities into one continuous engineering workflow:
```
  [ OBSERVE ] ──> [ DIAGNOSE ] ──> [ REPRODUCE ] ──> [ COMPARE ] ──> [ PROTECT ]
  Capture real    Extract AST,     Synthesize       A/B test against  Enforce circuit
  queries &       detect plan      skewed load in   repeatable        breakers, pool
  telemetry       bottlenecks      disposable env   baselines         caps, & CI gates
```

Trafiora is designed as a production-grade, open-source database workload intelligence and reliability platform. It is built with zero-trust safety defaults: **strict separation of operational risk tiers, isolated disposable benchmarking, AST-driven parameter stripping, key-separated credential vaulting, verified session cleanup, host-level overhead tracking, and statistically rigorous multi-run performance validation**.

---

## 1. SCOPE & BOUNDARIES

### 1.1 Core Mission & Scope
- **Dialect-Aware Query Intelligence:** Normalization, structural fingerprinting, AST parsing, parameter stripping, and structural antipattern detection for SQL statements.
- **Evidence-Based Bottleneck Diagnosis:** PostgreSQL query execution plan inspection (`EXPLAIN (FORMAT JSON)` for non-executing plan analysis; `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` strictly limited to disposable test databases), buffer cache hit ratio calculations, sequential scan detection, lock wait analysis, and connection pool starvation telemetry.
- **Deterministic Workload Reproduction:** Configurable synthetic and replay-based workload scenarios (Zipfian key distribution, traffic spikes, read/write ratios, concurrent worker pools).
- **Statistically Grounded A/B Performance Comparison:** Baseline vs. candidate optimization benchmarking using multi-run bootstrap confidence intervals, variance rejection, tail distribution sampling, write impact assessment, and host saturation metrics.
- **Automated Regression Prevention:** CI/CD CLI runner (`trafiora-ci`) that executes performance regression checks against disposable instances and gates pull requests based on configurable latency and buffer budgets.
- **Overload Protection Architecture:** Generation of PgBouncer pool sizing configurations, statement timeout scripts, and proxy rate-limiting rules.
- **Interactive System Architecture Visualizer:** High-fidelity, real-time animated data-flow canvas mapping requests across client apps, connection poolers, cache nodes, database engine cores, and storage subsystems.

### 1.2 Explicit Non-Goals
- **Not an ORM or Application Framework:** Trafiora does not generate application code or abstract database interactions.
- **No Automatic Production Mutations:** Trafiora will **never** execute `ALTER TABLE`, `CREATE INDEX`, or query rewrites against a user's production database. All mutations are restricted to isolated disposable test environments.
- **Not a Black-Box APM Replacement:** Trafiora focuses specifically on the database access path and query lifecycle, integrating with OpenTelemetry rather than attempting to replace general-purpose APM collectors.
- **No Fabricated or Hallucinated Performance Claims:** The platform strictly demarcates live measured telemetry from simulated mock scenarios. Optimization recommendations must be proven via reproducible benchmarks before being declared effective.

---

## 2. ECOSYSTEM RESEARCH & COMPETITIVE ANALYSIS

Before selecting architecture or dependencies, established tools and official documentation were evaluated to identify existing capabilities, limitations, and competitive differentiators:

| System / Tool | Official Documentation Reference | Existing Capabilities | Limitations & Operational Risks | What Trafiora Adds |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL `pg_stat_statements`** | [PostgreSQL 18 Docs: pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) | Tracks execution statistics of all SQL statements executed; normalized query IDs; cumulative execution time; calls; buffer hits. | Requires `shared_preload_libraries` and server restart; statistics reset on restart unless saved; `total_exec_time` reflects accumulated execution duration, not CPU time; lacks parameter literals; no automated A/B comparison. | Automated polling with bounded overhead; AST structural analysis; automated scenario generation based on observed query frequency. |
| **PostgreSQL `EXPLAIN`** | [PostgreSQL 18 Docs: EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html) | `EXPLAIN (FORMAT JSON)` estimates query cost and execution plan without execution. `EXPLAIN ANALYZE` executes the query and measures actual runtime and buffers. | `EXPLAIN ANALYZE` **actually executes the query**, causing DML writes or severe read I/O load. Transaction rollback does not prevent sequence increments, lock churn, or resource exhaustion. `BUFFERS` requires `ANALYZE`. | Enforces safe read-only `EXPLAIN` on production; restricts `EXPLAIN ANALYZE` to disposable test databases; parses JSON plan trees into visual hierarchy. |
| **MySQL `performance_schema`** | [MySQL 8.4 Docs: Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html) | Detailed execution stages, mutex wait tracking, memory allocation instrumentation. | Complex setup; noticeable CPU overhead if all consumers are enabled; plan syntax and query statistics differ fundamentally from PostgreSQL. | Abstract adapter interface defined; PostgreSQL adapter implemented and verified first; MySQL interface reserved for subsequent tested verification. |
| **Oracle AWR & SPM** | [Oracle 23ai Docs: SQL Plan Management](https://docs.oracle.com/en/database/oracle/oracle-database/23/tgsql/managing-sql-plan-baselines.html) | SQL plan baselines, plan regression detection, automatic plan capture, AWR historical snapshots. | Proprietary, closed-source, high licensing cost, strict Oracle Enterprise Edition vendor lock-in. | Implements vendor-neutral open-source plan baseline comparison and CI regression gating inspired by SPM principles. |
| **SQLGlot** | [SQLGlot Official Documentation](https://sqlglot.com/) | Pure-Python SQL parser, transpiler, and AST engine supporting 30+ dialects; zero binary C dependencies. | Does not validate against live database catalogs; cannot estimate query costs or execution plans. | Used for AST-based query normalization, parameter stripping, structural fingerprinting, and table/column lineage extraction. |
| **Grafana k6** | [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/) | Scriptable Go-based HTTP/gRPC load testing engine with VUs, stages, thresholds, and metrics export. | Focuses on HTTP service boundaries; does not inspect database internal engine state, buffer pools, or lock queues. | Wraps k6 to drive end-to-end application workloads while Trafiora correlates HTTP latency with internal database engine telemetry. |
| **pgbench** | [PostgreSQL 18 Docs: pgbench](https://www.postgresql.org/docs/current/pgbench.html) | Native PostgreSQL benchmarking tool; supports concurrent worker connections, custom SQL transaction scripts, and latency logging. | CLI tool without native web visualization; lacks automated plan comparison, AST analysis, or CI PR integration. | Orchestrates `pgbench` subprocesses safely with CPU/memory limits, capturing real-time TPS and latency distributions for A/B baselines. |
| **PgBouncer** | [PgBouncer Official Documentation](https://www.pgbouncer.org/) | Lightweight connection pooler for PostgreSQL; session, transaction, and statement pooling modes. | Lacks dynamic query inspection, intelligent routing, or automated pool sizing guidance. | Evaluates connection starvation metrics and synthesizes verified `pgbouncer.ini` configuration profiles tailored to measured workload concurrency. |
| **Redis** | [Redis Documentation](https://redis.io/docs/) | In-memory key-value cache; sub-millisecond lookups; reduces DB read pressure. | Subject to cache stampedes, thundering herds, stale data, and memory exhaustion. | Supported as an optional cache node in workload scenarios to measure cache hit ratios and simulate cache invalidation/stampede events. |
| **OpenTelemetry** | [OTel Database Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/db/) | Standardized `db.system`, `db.statement`, `db.operation` attributes for traces and metrics. | Telemetry export only; requires external collectors and analysis engines to evaluate regressions. | Adopts standard OTel semantic conventions for ingested telemetry and query span representations. |

---

## 3. VERIFIED TECHNOLOGY STACK & DEPENDENCY INVENTORY

The technology stack is revalidated against official documentation and active release lines current as of **October 27, 2026**.

### 3.1 Technology Evaluation & Tested Compatibility Set

```
                        ┌────────────────────────────────────────────────────────┐
                        │             TRAFIORA STACK COMPATIBILITY               │
                        ├────────────────────────────────────────────────────────┤
                        │  FRONTEND RUNTIME: Node.js 24 Active LTS               │
                        │  (Node.js 20 is EOL as of April 2026; Node 24 is LTS)  │
                        │  • Next.js 16.4.x (App Router, Server Components)      │
                        │  • React 19.2.x (Virtual DOM, Server Actions)          │
                        │  • Tailwind CSS v4.0.x (Vite/PostCSS modern engine)    │
                        │  • @xyflow/react 12.3.x (Node graph canvas)            │
                        │  • Apache ECharts 5.5.x (Canvas charting via client ref│
                        ├────────────────────────────────────────────────────────┤
                        │  BACKEND RUNTIME: Python 3.14 (Active Maintenance Line)│
                        │  (Evaluated: 3.14.10 vs 3.12.16; 3.14 selected for     │
                        │   full SQLAlchemy 2.1 & Pydantic 2.14 support)         │
                        │  • FastAPI 0.162.0 (ASGI API & WebSocket gateway)      │
                        │  • Pydantic 2.14.1 (Rust-backed contract validation)   │
                        │  • SQLGlot 30.24.0 (Pure Python multi-dialect AST)     │
                        │  • SQLAlchemy 2.1.6 (Explicit asyncio with psycopg3)   │
                        │  • Psycopg 3.3.6 (psycopg[binary,pool] driver)         │
                        │  • Alembic 1.14.x (Metadata migration manager)         │
                        ├────────────────────────────────────────────────────────┤
                        │  PRIMARY TEST TARGET: PostgreSQL 18.6 (Alpine Docker)  │
                        │  • Primary certified engine: postgres:18.6-alpine      │
                        │  • Older/untested versions: Explicitly flagged         │
                        │    unsupported until passing adapter test matrix       │
                        └────────────────────────────────────────────────────────┘
```

#### Detailed Engineering Rationale:
1. **Frontend Runtime (Node.js 24 Active LTS + Next.js 16.4 + React 19.2):**
   - Node.js 20 reached official End-of-Life (EOL) in April 2026. Node.js 24 is the current Active LTS release.
   - Next.js 16 is the Active LTS release for 2026 (Next.js 15 reached EOL in October 2026). Next.js 16.4 natively integrates with React 19.2 and Node.js 24.
   - `@xyflow/react` v12.3.x provides verified React 19 support. ECharts 5.5.x is integrated via a client-side ref container to avoid hydration discrepancies.
2. **Backend Runtime (Python 3.14.10 vs. Python 3.12.16):**
   - Python 3.14.10 is the active maintenance line in late 2026 (Python 3.12 is in security-fix only maintenance).
   - Major database libraries have fully stabilized on Python 3.14: Pydantic v2.14.1, SQLAlchemy 2.1.6 (which defaults to psycopg3 and decoupled `asyncio`), Psycopg 3.3.6, and SQLGlot 30.24.0.
   - Pinned Python version: `3.14.10` in `.python-version` and Docker containers; compatible with `^3.14.0`.
3. **Primary Test Target (PostgreSQL 18.6):**
   - PostgreSQL 18.6 is designated as the primary certified database adapter target.
   - All catalog queries, plan parsing, and buffer hit metrics are verified against PostgreSQL 18.6 Docker fixtures. Support is not claimed for earlier or other engines without passing integration test suites.

### 3.2 Dependency Decision Table & Lockfile Strategy
All dependencies are locked using strict version pinning and deterministic lockfiles (`pnpm-lock.yaml` for frontend, `uv.lock` for backend).

| Package / Tool | Exact Version Pin | Responsibility | License | Commercial Implications | Tier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`fastapi`** | `0.162.0` | API routing, WebSocket endpoints, OpenAPI documentation | MIT | Permissive, enterprise standard | Mandatory |
| **`uvicorn[standard]`** | `0.32.1` | High-performance ASGI production server | BSD-3-Clause | Permissive | Mandatory |
| **`pydantic`** | `2.14.1` | Strict data validation and schema modeling | MIT | Permissive | Mandatory |
| **`sqlglot`** | `30.24.0` | Dialect-aware SQL parsing, AST analysis, literal stripping | MIT | Permissive | Mandatory |
| **`sqlalchemy[asyncio]`** | `2.1.6` | Async ORM and expression language for internal metadata | MIT | Permissive | Mandatory |
| **`psycopg[binary,pool]`**| `3.3.6` | Async PostgreSQL client driver and connection pooler | LGPL-3.0 with binary exception / BSD | Permissive binary usage | Mandatory |
| **`alembic`** | `1.14.1` | Schema migration manager for Trafiora metadata DB | MIT | Permissive | Mandatory |
| **`httpx`** | `0.28.1` | Async HTTP client for external telemetry and integration tests | BSD-3-Clause | Permissive | Mandatory |
| **`cryptography`** | `44.0.0` | AES-256-GCM authenticated credential encryption | Apache 2.0 / BSD | Enterprise standard | Mandatory |
| **`pytest` & `pytest-asyncio`**| `8.3.4` | Backend unit, integration, and performance test suite | MIT | Permissive | Dev-Only |
| **`ruff` & `mypy`** | Latest stable | Ultra-fast Python linting, formatting, and strict typing | MIT | Permissive | Dev-Only |
| **`next`** | `16.4.0` | React web application framework (App Router) | MIT | Permissive | Mandatory |
| **`react` & `react-dom`** | `19.2.0` | UI component library and virtual DOM | MIT | Permissive | Mandatory |
| **`@xyflow/react`** | `12.3.6` | Interactive node-based architecture and pipeline canvas | MIT | Permissive | Mandatory |
| **`echarts`** | `5.5.1` | High-performance canvas time-series charts and histograms | Apache 2.0 | Permissive | Mandatory |
| **`motion`** | `12.0.0` | Spring physics animations, layout transitions, particle flow | MIT | Permissive | Mandatory |
| **`tailwindcss`** | `4.0.0` | Modern utility-first styling framework | MIT | Permissive | Mandatory |
| **`lucide-react`** | `0.470.0` | Standardized vector icons | ISC | Permissive | Mandatory |
| **`@playwright/test`** | `1.49.1` | End-to-end browser testing and visual regression checks | Apache 2.0 | Permissive | Dev-Only |
| **`pgbench` (Binary)** | Native PG 18.6 | Direct PostgreSQL connection and transaction load tester | PostgreSQL License | Permissive native utility | Mandatory / Runner |
| **`k6` (Binary)** | `0.55.0` | Scriptable HTTP scenario load generation | AGPL-3.0 (binary CLI execution only) | Isolated executable; no code linkage | Optional / Runner |

---

## 4. SEPARATION OF DATABASE OPERATIONS BY RISK TIER

Trafiora enforces an uncompromising operational risk classification. **The platform must never infer database safety from naming conventions** (e.g., checking if a database name contains "prod" or "staging" is strictly prohibited; production systems can be named `app_db`, and staging systems may contain sensitive pre-release customer data).

Furthermore, **transaction rollback (`ROLLBACK`) alone does NOT prove arbitrary SQL has no external side effects.** In PostgreSQL, a rolled-back transaction still advances sequences (`nextval()`), modifies advisory locks, triggers untrusted extension logic (e.g., `dblink`, HTTP calls), writes to unlogged tables, and exhausts shared buffer memory and lock tables.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TRAFIORA THREE-TIER RISK ARCHITECTURE                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   TIER 1: READ-ONLY OBSERVATION (Production & Staging Monitoring)                      │
│   • Operations: pg_stat_statements extraction, pg_stat_activity session polling,        │
│                 non-executing EXPLAIN (FORMAT JSON) plan inspection.                   │
│   • Guarantees: ZERO statement execution, ZERO schema changes, strict timeout (<= 2s). │
│   • Absolute Rule: Execution-based EXPLAIN (ANALYZE) is STRICTLY PROHIBITED, even      │
│     inside a transaction rollback block.                                               │
│   • Authorization: Read-only database role (trafiora_monitor) with pg_read_all_stats.  │
│                                                                                        │
│   TIER 2: WORKLOAD BENCHMARKING (Authorized Test Targets Only)                         │
│   • Operations: Synthetic load generation (pgbench, async sessions),                   │
│                 replayed query traffic, concurrency stress testing.                    │
│   • Guarantees: Permitted ONLY on connections with explicit mutual authorization:       │
│                 1) Administrator registers connection as `BENCHMARK_TARGET`.           │
│                 2) User signs an explicit execution consent token in UI.               │
│                 3) Outbound network target matches verified non-production host CIDR.  │
│   • Safety: Hard wall-clock limits (<= 300s), concurrency caps (<= 50 VUs default).    │
│                                                                                        │
│   TIER 3: ADMINISTRATIVE MUTATION (Ephemeral Sandboxes Only)                           │
│   • Operations: Schema migrations, CREATE INDEX, DROP INDEX, table resets,             │
│                 EXPLAIN (ANALYZE, BUFFERS) actual execution.                           │
│   • Guarantees: Permitted EXCLUSIVELY on ephemeral, disposable test databases          │
│                 (`is_disposable_sandbox = true`) managed directly by Trafiora harness. │
│   • Absolute Rule: Production monitoring connections NEVER permit Tier 2 or Tier 3.   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. POSTGRESQL QUERY PLAN HANDLING & OBSERVABILITY SETUP

### 5.1 Safe vs. Destructive Query Plan Inspection
- **Ordinary Plan Inspection (`EXPLAIN (FORMAT JSON)`):**
  - Read-only; estimates cost and plan nodes based on PostgreSQL statistics (`pg_class`, `pg_statistic`).
  - **Does not execute the query.** Safe for use across Tier 1 (monitored databases) and Tier 2.
- **Execution-Based Analysis (`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`):**
  - **Warning:** In PostgreSQL, the `ANALYZE` option **actually executes the statement**. Any write statement (`INSERT`, `UPDATE`, `DELETE`) will mutate data, and unindexed `SELECT` statements on large tables will consume heavy CPU and disk I/O.
  - In PostgreSQL, the `BUFFERS` option **requires `ANALYZE`** to be specified. Buffer counts cannot be measured without statement execution.
  - **Trafiora Enforcement:** Execution-based `EXPLAIN (ANALYZE, BUFFERS)` is **strictly prohibited on Tier 1 monitoring targets**, even within a `ROLLBACK` transaction. It is permitted only on Tier 3 disposable test databases under a 5-second statement timeout.

### 5.2 `pg_stat_statements` Setup, Permissions & Fallbacks
1. **PostgreSQL Configuration (`postgresql.conf`):**
   ```ini
   shared_preload_libraries = 'pg_stat_statements'
   pg_stat_statements.max = 10000
   pg_stat_statements.track = top
   pg_stat_statements.save = on
   ```
   *Note: Adding `pg_stat_statements` to `shared_preload_libraries` requires a PostgreSQL server restart.*
2. **Database Extension Installation:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```
3. **Dedicated Least-Privilege Monitoring Role (`trafiora_monitor`):**
   ```sql
   CREATE ROLE trafiora_monitor WITH LOGIN PASSWORD '...';
   GRANT pg_read_all_stats TO trafiora_monitor;
   GRANT CONNECT ON DATABASE target_db TO trafiora_monitor;
   ```
   *Security Constraint: `trafiora_monitor` is NEVER granted `pg_signal_backend`, superuser, or termination rights.*
4. **Graceful Degradation Fallback:**
   - When connecting, Trafiora queries:
     `SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';`
   - If missing or permissions are denied, the connection status is set to `CAPABILITY_DEGRADED: PG_STAT_STATEMENTS_UNAVAILABLE`.
   - The platform falls back to sampling `pg_stat_activity` and manual slow-query log ingestion, disabling historical query statistics without crashing or blocking the UI.

---

## 6. HARDENED BENCHMARK SAFETY & ORPHAN SESSION CLEANUP

Benchmarking must never jeopardize system stability, run unbounded, or terminate unauthorized sessions.

### 6.1 Process Isolation & Subprocess Execution
- All `pgbench` and runner commands are executed strictly via `asyncio.create_subprocess_exec(*args)` with explicit argument arrays. `shell=True` is strictly prohibited to eliminate command injection.
- Benchmark workers run under an unprivileged OS user with memory cgroups limits (512 MB per container).
- Outbound network egress is restricted via host allowlists; connections to loopback/metadata internal addresses are rejected.

### 6.2 Verified Orphan-Session Cleanup Protocol
To ensure that benchmark worker crashes or disconnections do not leave runaway transactions locking the target database:

1. **Dedicated Benchmark Role:**
   All benchmark worker connections authenticate using a dedicated, restricted role: `trafiora_benchmark_runner`.
2. **Deterministic Session Identification:**
   Every experiment is assigned a unique UUID (`experiment_id`). Every client session established by the runner sets its PostgreSQL connection parameter:
   $$\text{application\_name} = \text{'trafiora\_bench\_'} \,\|\, \text{experiment\_id}$$
3. **Lease Heartbeat & Expiration:**
   The active benchmark worker must renew a lease in the metadata database every 15 seconds. If the worker crashes or disconnects, the lease expires after 30 seconds, triggering supervisor recovery.
4. **Targeted Session Verification & Termination:**
   When cleanup is triggered, the cleanup task connects via the benchmark role (or an administrative role on the disposable sandbox) and executes:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE usename = 'trafiora_benchmark_runner'
     AND application_name = 'trafiora_bench_' || :experiment_id
     AND pid <> pg_backend_pid();
   ```
   *Strict Safety Rule: Sessions are terminated ONLY when BOTH `usename` and `application_name` match the verified job. The read-only monitoring role (`trafiora_monitor`) is NEVER granted termination privileges.*
5. **Comprehensive Cleanup Test Matrix:**
   Dedicated integration tests cover:
   - Worker crash simulation (`kill -9` on runner process).
   - Stale heartbeat lease expiration.
   - PID/session mismatch verification (confirming unrelated application or admin sessions are completely untouched).
   - Target connectivity failure during cleanup with exponential backoff and alert escalation (`CLEANUP_FAILED_MANUAL_INTERVENTION_REQUIRED`).

---

## 7. PRIVACY, DATA REDACTION & CREDENTIAL PROTECTION

### 7.1 Honest Privacy Guarantees
- **No Absolute Redaction Claims:** AST parsing and literal stripping significantly reduce sensitive data exposure, but **do not guarantee 100% removal of sensitive content**. Identifiers (table names like `customer_ssn_lookup`), schema names, custom function parameters, and inline comments can contain sensitive business context.
- **Strict Privacy Controls:**
  1. **Default to Zero Raw Query Storage:** Incoming raw SQL strings are parsed in memory into ASTs and immediately discarded. Only the canonical normalized SQL and structural fingerprint hash are persisted.
  2. **Comprehensive Comment Stripping:** All SQL comments (`-- single line` and `/* block */`) are purged prior to AST serialization.
  3. **Sensitive Identifier Heuristics & Uncertainty Tagging:** If an identifier matches sensitive pattern dictionaries (`ssn`, `password`, `token`, `secret`, `email`, `credit_card`) or if AST normalization is incomplete, the query is flagged as `REDACTION_UNCERTAIN: POTENTIALLY_SENSITIVE`.
  4. **Configurable Data Retention:** Query fingerprints and metric time-series have a default retention limit of 14 days, enforced by automated pruning tasks.
  5. **Adversarial Redaction Test Suite:** Unit tests verify redaction behavior against complex SQL patterns, encoded strings, nested subqueries, and malformed inputs.

### 7.2 Cryptographic Credential Vaulting & Key Rotation
- **Key Separation:** Encryption keys are **never stored in the metadata database** alongside encrypted connection records.
- **Key Hierarchy:**
  - **Master Key / KEK:** Injected at runtime via `TRAFIORA_MASTER_KEY` environment variable or retrieved from external KMS (AWS KMS, GCP Secret Manager, HashiCorp Vault).
  - **Data Encryption:** Passwords encrypted using AES-256-GCM with unique 96-bit initialization vectors (IVs) and 128-bit authentication tags.
- **Envelope Format with Versioning:**
  $$\text{Payload} = \text{version} \,\|\, \text{salt} \,\|\, \text{IV} \,\|\, \text{Ciphertext} \,\|\, \text{Tag}$$
  *Example:* `v1:7f8a...:3b1c...:9e4d...:1a2b...`
- **Key Rotation Support:** CLI command `trafiora admin rotate-keys --old-key ... --new-key ...` decrypts all credentials using key version $N$ and re-encrypts with key version $N+1$ without downtime.

---

## 8. STATISTICALLY RIGOROUS, EVIDENCE-BASED BENCHMARKS

Trafiora eliminates biased performance assumptions. **The platform never assumes that adding an index, rewriting a query, or enabling a cache will improve performance.** Tail latency (p99) cannot be reliably determined from a fixed 1,000-transaction sample alone.

### 8.1 Multi-Run Protocol, Cache Conditions & Noise Detection
1. **Adequate Tail Sample Sizing:**
   A single run with 1,000 requests captures only ~10 tail events at p99, resulting in massive variance. For statistically valid tail estimation, an experiment requires either $N \ge 10,000$ transactions per run or multiple independent repetitions.
2. **Independent Repetitions ($K \ge 5$):**
   Trafiora executes a minimum of $K = 5$ independent baseline runs and $K = 5$ candidate runs.
3. **Controlled Warm vs. Cold Cache Conditions:**
   - **Cold Cache:** In disposable container tests, flush OS page cache (`sync && sysctl -w vm.drop_caches=3`) and restart PostgreSQL instance to clear shared buffers.
   - **Warm Cache:** Pre-warm shared buffers by executing the scenario query mix for a pre-run duration until the buffer hit ratio stabilizes ($\ge 95\%$ or variance $< 2\%$) before capturing benchmark measurements.
4. **Environmental Noise Detection:**
   The run-level Coefficient of Variation ($\text{CV}_{\text{between}} = \sigma / \mu$) is computed across repetitions. If $\text{CV} > 0.05$ (5%), the environment is flagged as `STATISTICALLY_NOISY`, preventing premature classification.
5. **Bootstrapped Confidence Intervals & Statistical Tests:**
   Trafiora computes 95% Confidence Intervals ($\text{CI}_{95\%}$) for median (p50) and tail (p99) latencies using non-parametric bootstrap resampling (10,000 iterations), validated by Mann-Whitney U tests ($p < 0.01$).

### 8.2 Outcome Classification Matrix & Ground-Truth Test Fixtures

| Outcome Classification | Statistical Criteria | Platform Interpretation & Reporting |
| :--- | :--- | :--- |
| **`MEASURED_IMPROVEMENT`** | $\text{Upper}(\text{CI}_{95\%}(p99_C)) < \text{Lower}(\text{CI}_{95\%}(p99_B))$ by $\ge 10\%$ AND write degradation $< 5\%$ with non-overlapping confidence intervals. | Optimization verified effective under tested concurrency. Green badge displayed. |
| **`REGRESSION_DETECTED`** | $\text{Lower}(\text{CI}_{95\%}(p99_C)) > \text{Upper}(\text{CI}_{95\%}(p99_B))$ by $\ge 10\%$ OR write throughput degrades $\ge 15\%$. | Optimization caused performance degradation (e.g., index write penalty or poor plan choice). Red warning badge. |
| **`NO_MATERIAL_CHANGE`** | Confidence intervals for candidate and baseline overlap within experimental noise ($\pm 5\%$). | Change shows no significant performance benefit under tested conditions. Neutral gray badge. |
| **`INCONCLUSIVE_HIGH_VARIANCE`**| Run-to-run Coefficient of Variation $\text{CV} > 0.05$ due to host I/O or virtualization jitter. | Test results inconclusive. Prompts user to repeat test on quieter infrastructure. Amber badge. |

#### Verification Against Ground-Truth Synthetic Datasets:
The statistical classifier is tested in CI against 4 deterministic fixtures where ground truth is mathematically predetermined:
1. `FIXTURE_KNOWN_IMPROVEMENT`: Synthetic latency shift from 150ms to 12ms ($p < 0.001$, non-overlapping CIs) $\rightarrow$ verified to classify as `MEASURED_IMPROVEMENT`.
2. `FIXTURE_KNOWN_REGRESSION`: Synthetic latency shift from 20ms to 85ms $\rightarrow$ verified to classify as `REGRESSION_DETECTED`.
3. `FIXTURE_KNOWN_NO_CHANGE`: Two runs sampled from identical distributions $\rightarrow$ verified to classify as `NO_MATERIAL_CHANGE`.
4. `FIXTURE_KNOWN_HIGH_VARIANCE`: Injected synthetic multimodal noise ($\text{CV} = 0.25$) $\rightarrow$ verified to classify as `INCONCLUSIVE_HIGH_VARIANCE`.

---

## 9. OUT-OF-BAND ARCHITECTURE & OBSERVABLE OVERHEAD BUDGETS

### 9.1 Out-of-Band Execution vs. Target Resource Consumption
- **Out-of-Band Request Path:**
  Trafiora operates completely outside the user application's request path. It is not an in-line proxy, gateway, or query interceptor. If Trafiora crashes, is stopped, or experiences a network partition, user application traffic to the database continues uninterrupted.
- **Target Resource Consumption Reality:**
  Trafiora does **not** claim zero impact on the database. Its background monitoring queries and any authorized benchmark experiments execute directly on the target PostgreSQL instance, consuming CPU cycles, memory, shared buffer bandwidth, and connection slots.

### 9.2 Legitimate CPU Measurement & Observable Overhead Budgets
`pg_stat_statements.total_exec_time` measures **accumulated statement execution duration (wall-clock time)**, which includes I/O and lock waits; **it is not CPU time**. To measure legitimate CPU overhead:

1. **Legitimate Host CPU Measurement Sources:**
   - **Linux cgroups:** Reading `/sys/fs/cgroup/cpu.stat` (`usage_usec`) for the containerized `postgres` process group.
   - **Host Process Exporters:** Reading Prometheus `node_exporter` / `process_exporter` metrics for PostgreSQL worker PIDs.
   - **Cloud Monitoring APIs:** AWS CloudWatch `CPUUtilization`, GCP Cloud Monitoring `database/cpu/utilization`, or Azure Database for PostgreSQL metrics.
2. **Fallback When Host CPU Metrics Are Unavailable:**
   - When external host metrics are unavailable, the UI explicitly displays:
     $$\text{CPU Overhead: } \textbf{UNKNOWN (HOST\_METRICS\_UNAVAILABLE)}$$
   - Clearly labelled fallback proxy: **Accumulated Statement Execution Time Ratio** (`STATEMENT_EXEC_TIME_RATIO`):
     $$\text{Exec Time Ratio} = \frac{\sum \text{total\_exec\_time}(\text{trafiora\_monitor})}{\sum \text{total\_exec\_time}(\text{all roles})} \times 100\%$$
   - **Rule:** Query execution time is never substituted or reported as CPU utilization.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TRAFIORA OBSERVABLE OVERHEAD BUDGETS                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. TARGET DATABASE MONITORING OVERHEAD                                                │
│     • Target CPU consumed by Trafiora telemetry queries: < 1.0% average.               │
│     • Monitoring connection slots: maximum 2 dedicated connections.                    │
│     • Minimum polling interval for `pg_stat_statements`: >= 10 seconds.                │
│     • Statement timeout on monitoring connections: <= 2.0 seconds.                     │
│                                                                                        │
│  2. SAFE ADAPTIVE DEGRADATION BEHAVIOR                                                 │
│     • If target database CPU exceeds 80% or monitoring queries time out,               │
│       Trafiora automatically increases polling intervals (10s -> 30s -> 60s).          │
│     • If target load exceeds 90%, monitoring polling is suspended entirely.           │
│                                                                                        │
│  3. CLIENT BROWSER RENDERING BUDGET                                                    │
│     • Maximum interactive nodes on React Flow canvas: capped at 50 nodes.              │
│     • Canvas downsampling via Largest-Triangle-Three-Buckets (LTTB) algorithm caps     │
│       rendered points to 2,000 points per series, guaranteeing smooth 60 FPS scrolling.│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. ARCHITECTURE, DATA FLOW & MERMAID DIAGRAMS

### 10.1 Overall System Architecture & Security Boundaries

```mermaid
flowchart TB
    subgraph ClientZone ["Client Zone (Untrusted)"]
        Browser["Next.js 16 Web Application\n(React 19, ECharts, React Flow)"]
        CIRunner["CI/CD Runner\n(GitHub Actions / trafiora-ci)"]
    end

    subgraph ControlPlaneZone ["Control Plane (Protected Network)"]
        APIGateway["FastAPI API & WebSocket Gateway\n(JWT Auth, RBAC, Rate Limiting)"]
        Vault["Secret Vault Service\n(AES-256-GCM, Key Separated)"]
        Orchestrator["Experiment Orchestrator\n& State Machine"]
        DiagnosisEngine["Diagnosis & Plan Analyzer\n(SQLGlot AST, Plan Tree Parser)"]
        MetadataDB[(Trafiora Metadata DB\nPostgreSQL 18.6 - Internal)]
    end

    subgraph WorkerSandboxZone ["Worker Sandbox (Restricted Egress)"]
        WorkerPool["Benchmark Worker Pool\n(Isolated Processes, cgroups bounded)"]
        PGBenchRunner["pgbench Orchestrator\n(Runs as trafiora_benchmark_runner)"]
        AsyncRunner["Native Async DB Runner\n(Tagged application_name)"]
    end

    subgraph TargetZone ["Target Database Environments"]
        subgraph Tier1 ["Tier 1: Monitored Production / Staging"]
            ProdDB[(Target Database\nPostgreSQL 18.6)]
            ProdPooler["PgBouncer\n(Optional Pooler)"]
        end
        subgraph Tier3 ["Tier 3: Disposable Sandboxes"]
            DisposableDB[(Disposable Test Database\nDocker Container)]
        end
    end

    Browser <-->|TLS WebSocket & REST| APIGateway
    CIRunner -->|REST API Token Auth| APIGateway

    APIGateway <--> Vault
    APIGateway <--> Orchestrator
    APIGateway <--> DiagnosisEngine
    APIGateway <--> MetadataDB

    Orchestrator -->|Dispatch Task| WorkerPool
    WorkerPool --> PGBenchRunner
    WorkerPool --> AsyncRunner

    %% Tier 1 connections (READ-ONLY ONLY)
    APIGateway -.->|Tier 1: Safe EXPLAIN (FORMAT JSON)\n& pg_stat_statements (Timeout <= 2s)| ProdDB
    
    %% Tier 2 / 3 connections (WORKLOAD & MUTATIONS)
    PGBenchRunner ==>|Tier 2: Benchmarking Load\n(Role: trafiora_benchmark_runner)| DisposableDB
    AsyncRunner ==>|Tier 2: Workload Injection\n(Tagged application_name)| DisposableDB
    APIGateway ==>|Tier 3: EXPLAIN ANALYZE & Migrations| DisposableDB
```

### 10.2 Workload Experiment Lifecycle & State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Scenario Defined
    DRAFT --> VALIDATING: Submit Experiment
    
    state VALIDATING {
        [*] --> CheckTargetClassification
        CheckTargetClassification --> VerifyConsentToken: Target is Registered Benchmark Target
        CheckTargetClassification --> REJECTED: Target is Monitored Tier 1 Target
        VerifyConsentToken --> CheckEgressAllowlist
        CheckEgressAllowlist --> VerifyCapabilities
    }

    VALIDATING --> REJECTED: Safety Checks Fail
    VALIDATING --> QUEUED: All Safety Checks Pass
    
    QUEUED --> ALLOCATING_WORKER: Worker Available
    ALLOCATING_WORKER --> WARMING_UP: Lease Acquired (15s Heartbeat)
    WARMING_UP --> RUNNING: Multi-Run Workload Started (K >= 5)
    
    state RUNNING {
        [*] --> InjectTraffic
        InjectTraffic --> StreamTelemetry
        StreamTelemetry --> CheckHeartbeatAndLimits
    }

    RUNNING --> CANCELLED: User Requested / Timeout Exceeded
    RUNNING --> FAILED_HEARTBEAT_LOST: Worker Lease Expired -> Targeted Cleanup
    RUNNING --> ANALYZING: All K Runs Completed
    
    state ANALYZING {
        [*] --> DetectNoise_CV
        DetectNoise_CV --> BootstrapConfidenceIntervals
        BootstrapConfidenceIntervals --> EvaluateWriteImpact
        EvaluateWriteImpact --> ClassifyOutcome
    }

    ANALYZING --> COMPLETED: Persist Verified Results
    COMPLETED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
    FAILED_HEARTBEAT_LOST --> [*]
```

---

## 11. REPOSITORY STRUCTURE & CODEBASE ORGANIZATION

```
trafiora/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Pinned GitHub Actions (SHA-pinned)
│   │   ├── security.yml               # Bandit, pip-audit, pnpm audit, secret scan
│   │   └── release.yml                # Automated semantic release
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── apps/
│   ├── web/                           # Next.js 16 App Router Frontend (Node 24)
│   │   ├── public/brand/              # SVG brand assets and favicon
│   │   ├── src/app/                   # 12 Core Views
│   │   │   ├── layout.tsx             # Root layout with nav and theme provider
│   │   │   ├── page.tsx               # Overview & System Health
│   │   │   ├── connections/page.tsx   # Connections & Capabilities
│   │   │   ├── workload/page.tsx      # Query Explorer
│   │   │   ├── workload/[fingerprint]/page.tsx # AST & Plan Detail
│   │   │   ├── scenarios/page.tsx     # Scenario Builder
│   │   │   ├── experiments/page.tsx   # Live Experiment Monitor
│   │   │   ├── canvas/page.tsx        # Interactive Architecture Canvas
│   │   │   ├── compare/page.tsx       # Baseline vs Candidate A/B Compare
│   │   │   ├── diagnosis/page.tsx     # Bottlenecks & Recommendations
│   │   │   ├── ci/page.tsx            # CI Regression History
│   │   │   ├── protection/page.tsx    # Overload Protection Policies
│   │   │   └── settings/page.tsx      # Settings & Audit Logs
│   │   ├── src/components/
│   │   │   ├── ui/                    # Base UI components (shadcn/radix)
│   │   │   ├── canvas/                # React Flow nodes & particles
│   │   │   ├── charts/                # ECharts canvas wrappers (LTTB downsampling)
│   │   │   └── query/                 # AST tree and plan tree visualizer
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                           # FastAPI Backend Control Plane (Python 3.14)
│       ├── src/
│       │   ├── main.py                # ASGI entrypoint and lifespan
│       │   ├── api/v1/                # Route handlers
│       │   ├── core/                  # Config, AES vault, security
│       │   ├── adapters/              # DatabaseAdapter & PostgresAdapter
│       │   ├── intelligence/          # SQLGlot AST normalizer, fingerprint, plan analyzer
│       │   ├── runner/                # Bounded runner, pgbench orchestrator, watchdog
│       │   ├── models/                # SQLAlchemy ORM models
│       │   └── schemas/               # Pydantic v2 schemas
│       ├── alembic/                   # Database migrations
│       ├── pyproject.toml
│       └── Dockerfile
├── packages/
│   └── cli/                           # `trafiora-ci` Regression Testing CLI Tool
│       ├── trafiora_ci/
│       └── pyproject.toml
├── deploy/
│   ├── docker-compose.yml             # Local production-like composition (PG 18.6)
│   ├── docker-compose.test.yml        # Ephemeral test runner composition
│   └── pgbouncer/pgbouncer.ini        # Reference connection pooler configuration
├── docs/
│   ├── IMPLEMENTATION_BLUEPRINT.md    # This master document
│   ├── ARCHITECTURE.md               # Detailed architectural decision records
│   ├── API_SPECIFICATION.md           # OpenAPI and WebSocket contracts
│   └── SUPPORTED_CAPABILITIES.md      # Database compatibility matrix
├── tests/
│   ├── backend/
│   │   ├── unit/                      # AST parsing, redaction, bootstrap tests
│   │   ├── integration/               # Real disposable PG 18.6 integration tests
│   │   └── conftest.py                # Disposable container test fixtures
│   ├── frontend/
│   │   ├── unit/                      # React component and hook tests
│   │   └── e2e/                       # Playwright browser end-to-end tests
│   └── fixtures/
│       ├── sample_queries.sql         # Test SQL statements across complexity tiers
│       └── sample_explain_plans.json  # Raw PostgreSQL plan trees for testing
├── .env.example                       # Documented environment template
├── .gitignore                         # Comprehensive git exclusions
├── CONTRIBUTING.md                    # Developer guidelines & commit rules
├── LICENSE                            # Apache 2.0 Open Source License
├── README.md                          # Repository overview & quick start
└── Makefile                           # Standard developer tasks (build, test, run)
```

---

## 12. VERIFICATION, CI & QUALITY GATES

### 12.1 Multi-Stage Automated Quality Gates

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          TRAFIORA CI VERIFICATION PIPELINE                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  STAGE 1: STATIC ANALYSIS & SECURITY                                                   │
│  • Backend: `ruff check .`, `ruff format --check .`, `mypy --strict src/`              │
│  • Frontend: `pnpm eslint .`, `pnpm prettier --check .`, `pnpm tsc --noEmit`           │
│  • Security Audit: `pip-audit`, `pnpm audit`, Gitleaks secret scanning                 │
│                                                                                        │
│  STAGE 2: UNIT & DETERMINISTIC FIXTURE TESTS                                           │
│  • SQLGlot AST query normalization, literal stripping, and comment purging             │
│  • Adversarial redaction tests (verifying PII and parameter masking)                   │
│  • Fingerprint collision resistance tests (SHA-256 canonical hashing)                  │
│  • Validation of statistical classifier against 4 ground-truth fixtures:               │
│    Known Improvement, Known Regression, Known No Change, Known High Variance           │
│                                                                                        │
│  STAGE 3: DISPOSABLE DATABASE INTEGRATION TESTS (Real PostgreSQL 18.6 Container)      │
│  • Spin up disposable `postgres:18.6-alpine` container                                 │
│  • Apply Alembic migrations from clean database (upgrade and downgrade test)          │
│  • Verify `PostgresAdapter` probing `pg_stat_statements` under read-only permissions   │
│  • Test `EXPLAIN (FORMAT JSON)` plan parsing across complex joins and CTEs             │
│  • Verify watchdog cleanup: authenticate as trafiora_benchmark_runner, verify          │
│    application_name, and confirm no foreign sessions are terminated                    │
│                                                                                        │
│  STAGE 4: END-TO-END BROWSER TESTING (Playwright)                                      │
│  • Full dashboard navigation: Overview, Query Explorer, AST Detail, Architecture Flow  │
│  • Live WebSocket streaming simulation and reduced-motion toggle validation            │
│  • Accessibility audit (axe-core WCAG 2.1 AA compliant)                                │
│                                                                                        │
│  STAGE 5: CI REGRESSION GATING SUITE                                                   │
│  • Execute `trafiora-ci` CLI against disposable benchmark instance                     │
│  • Validate that unindexed query regression fails the build with exit code 1           │
│  • Validate that proven optimization passes and generates Markdown PR report           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 What Tests Prove vs. What They Cannot Prove
- **What CI Tests Genuinely Prove:**
  - SQL AST normalization and parameter stripping are deterministic.
  - API and WebSocket schemas adhere strictly to Pydantic and TypeScript contracts.
  - Database migrations execute cleanly forward and backward.
  - Safe plan extraction operates properly on PostgreSQL 18.6 without mutating data.
  - Watchdog timers terminate deadlocked benchmark workers and clean up sessions strictly matching role and `application_name`.
  - Statistical algorithms correctly distinguish true improvements from noise on known fixtures.
- **What Local / CI Tests Cannot Prove:**
  - Cannot guarantee identical latency distributions on bare-metal production hardware with NVMe storage.
  - Cannot eliminate multi-tenant cloud virtualization jitter (noisy neighbors).
  - Production verification requires continuous out-of-band telemetry monitoring rather than relying solely on synthetic CI benchmarks.

### 12.3 Pinned GitHub Actions
All GitHub Actions in `.github/workflows/ci.yml` are pinned to full 40-character commit SHAs with semantic version comments:
- `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
- `actions/setup-python@0b93645e9dc2c7925823a22eb24f26661ebe200e # v5.3.0`
- `actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b # v4.1.0`

---

## 13. HONEST 20–30 ATOMIC COMMIT IMPLEMENTATION PLAN

Upon approval, the implementation will be executed across **24 distinct, reviewable, atomic commits**. Every commit represents a complete, verified deliverable that passes its respective quality gate before being pushed to `main`.

| Step # | Commit Scope & Conventional Message | Deliverables & Quality Gates |
| :---: | :--- | :--- |
| **01** | `chore(repo): initialize repository structure, gitignore, and license` | Directory hierarchy, `.gitignore`, Apache 2.0 `LICENSE`, root `README.md`. |
| **02** | `docs(spec): add architecture blueprint and design specifications` | Approved `docs/IMPLEMENTATION_BLUEPRINT.md`, `ARCHITECTURE.md`. |
| **03** | `chore(dev): configure docker-compose and development environment` | `deploy/docker-compose.yml`, test DB container (PG 18.6), `.env.example`. |
| **04** | `build(backend): configure python packaging and dependency toolchain` | `apps/api/pyproject.toml`, ruff & mypy configs, dependencies locked. |
| **05** | `feat(api): implement fastapi core application, config, and health endpoints` | `FastAPI` app lifespan, Pydantic settings, `/api/v1/health` with passing test. |
| **06** | `feat(db): establish sqlalchemy metadata models and alembic migrations` | Models for connections, fingerprints, scenarios, experiments; init migration. |
| **07** | `feat(intelligence): implement sqlglot query normalizer and literal stripper` | AST parser, parameter replacement, sensitive data masking with unit tests. |
| **08** | `feat(intelligence): implement sha256 query fingerprinting and cataloging` | Deterministic fingerprint hashing, AST summary extraction, test suite. |
| **09** | `feat(adapters): create abstract database adapter and postgresql 18 implementation`| `DatabaseAdapter` interface, `PostgresAdapter` probing `pg_stat_statements`. |
| **10** | `feat(adapters): implement safe explain plan parser and buffer hit metrics`| Safe `EXPLAIN (FORMAT JSON)` parser, node classifier, hit-ratio calculator. |
| **11** | `feat(scenarios): implement workload scenario models and validation schemas`| Pydantic scenario definitions, Zipfian skew, concurrency limits, validation. |
| **12** | `feat(runner): implement isolated benchmark execution engine and worker pool`| Bounded async worker runner, timeout traps, cancellation tokens, watchdog. |
| **13** | `feat(runner): integrate pgbench test runner and verified orphan cleanup`| `pgbench` sub-runner with transaction scripts, `application_name` session traps. |
| **14** | `feat(diagnosis): implement bottleneck ranking and evidence-based recommendations`| Rule engine for sequential scan detection, missing indexes, lock warnings. |
| **15** | `feat(protection): implement pgbouncer pool sizing and overload policy generator`| Sizing calculator, statement timeout generator, circuit breaker policies. |
| **16** | `feat(ci-cli): build trafiora-ci regression testing command-line tool` | Standalone CLI runner with latency and buffer degradation threshold evaluation. |
| **17** | `build(frontend): initialize nextjs 16 app router and tailwind css v4 stack`| Next.js 16 setup (Node 24), Tailwind configuration, shadcn/ui base primitives. |
| **18** | `feat(web): build navigation shell, layout, and system health dashboard` | App shell, navigation sidebar, theme toggle, overview stats cards. |
| **19** | `feat(web): build query workload explorer and fingerprint detail views` | Data tables for fingerprints, formatted SQL viewer, AST plan tree view. |
| **20** | `feat(web): build interactive architecture and request flow canvas` | React Flow canvas with custom nodes, animated particles, flow controls. |
| **21** | `feat(web): build baseline vs candidate a/b comparison and monitor view` | Side-by-side metric diff cards, ECharts latency histogram, plan diff. |
| **22** | `feat(web): build overload protection and ci regression history views` | Protection policy exporter, CI test history table, audit log viewer. |
| **23** | `test(e2e): implement playwright browser tests and api integration suite`| End-to-end user journey tests, WebSocket stream tests, integration tests. |
| **24** | `ci(actions): configure github actions workflows for lint, test, and build` | Automated CI pipeline with test matrix, security audit, and build check. |

---

## 14. CONCRETE ACCEPTANCE CRITERIA

Trafiora will be considered genuinely working and production-ready when:
1. **End-to-End Scenario Execution:** A user can configure a workload scenario (e.g., 50 VUs, Zipfian $\alpha=1.2$, 90/10 read/write) in the Web UI, dispatch it via the API, execute it against a disposable PostgreSQL 18.6 database, and observe live latency metrics streaming via WebSockets.
2. **Deterministic Query Fingerprinting:** Multiple complex queries differing only in literal parameters (e.g., `WHERE id = 42` vs. `WHERE id = 9999`) resolve to the exact same SHA-256 fingerprint hash with all sensitive values masked.
3. **Plan Tree & Bottleneck Diagnosis:** An unindexed query run under load is correctly flagged as a `CRITICAL_BOTTLENECK` with evidence of a `Seq Scan` on a large table, and a corresponding unverified `CREATE INDEX` recommendation is generated.
4. **Statistically Verified Comparison Delta:** A candidate benchmark run with an added index demonstrates a measurable, quantified evaluation compared to the baseline run across $K \ge 5$ repetitions, correctly reporting `MEASURED_IMPROVEMENT`, `REGRESSION_DETECTED`, `NO_MATERIAL_CHANGE`, or `INCONCLUSIVE_HIGH_VARIANCE`.
5. **Hardened Orphan Cleanup:** Abrupt worker termination leaves zero dangling benchmark sessions, verified by monitoring `pg_stat_activity` for `usename = 'trafiora_benchmark_runner'`.
6. **Legitimate Overhead Reporting:** The connection health view displays legitimate host CPU overhead when cgroups/cloud metrics are available, or explicitly reports `UNKNOWN (HOST_METRICS_UNAVAILABLE)` with the secondary statement execution ratio fallback.
7. **Functional Interactive Canvas:** The React Flow canvas renders request particles moving between client nodes, poolers, and database engines, visually reacting to live experiment state changes, with a working reduced-motion mode.
8. **Automated CI Gating:** The `trafiora-ci` tool successfully runs against a test pull request and exits with code 1 if p95 latency degrades beyond budget.
9. **Clean Developer Experience:** Running `docker compose up --build` launches the complete stack (Next.js web app, FastAPI backend, metadata PostgreSQL, and disposable target PostgreSQL 18.6) with healthy status checks across all services.

---

## 15. UNRESOLVED RISKS & MITIGATIONS

1. **Host CPU Telemetry Heterogeneity:**  
   *Risk:* Cloud-hosted target databases (e.g. AWS RDS, GCP Cloud SQL) do not allow direct OS `/proc` or cgroups inspection.  
   *Mitigation:* Trafiora explicitly reports `UNKNOWN (HOST_METRICS_UNAVAILABLE)` rather than fabricating CPU metrics, and falls back to clearly labelled `STATEMENT_EXEC_TIME_RATIO`.
2. **Client-Side Heavy Canvas Load:**  
   *Risk:* High numbers of animated SVG particles on lower-powered client machines could drop frame rates.  
   *Mitigation:* Capped maximum active particles, implemented hardware-accelerated canvas fallback, and provided an accessible **Reduced-Motion Mode** that displays quantitative status badges instead of moving particles.
3. **Target Database Host I/O Variance in CI Environments:**  
   *Risk:* Shared GitHub Actions runners experience disk I/O fluctuations that inflate benchmark coefficient of variation.  
   *Mitigation:* Noise detection algorithm explicitly tags noisy runs as `INCONCLUSIVE_HIGH_VARIANCE` rather than incorrectly reporting a false regression.

---

## 16. FINAL APPROVAL CHECKLIST

Please review the following items before granting implementation approval:

- [ ] **Architecture Direction:** Approval of the five-stage workflow (*Observe $\rightarrow$ Diagnose $\rightarrow$ Reproduce $\rightarrow$ Compare $\rightarrow$ Protect*) and three-tier operational risk classification.
- [ ] **Tested Modern Tech Stack (Late 2026):** Node.js 24 Active LTS + Next.js 16.4 + React 19.2 (Frontend); Python 3.14.10 + FastAPI 0.162.0 + Pydantic 2.14.1 + SQLGlot 30.24.0 + SQLAlchemy 2.1.6 (Async) + Psycopg 3.3.6 (Backend).
- [ ] **PostgreSQL 18.6 Primary Target:** Approval of PostgreSQL 18.6 as the certified test engine, keeping all other versions uncertified until adapter test suites pass.
- [ ] **Rollback Inadequacy & Sandbox Isolation:** Approval of the strict rule that transaction rollback alone does not protect against external side effects, prohibiting execution-based EXPLAIN on production targets.
- [ ] **Hardened Session Cleanup:** Dedicated `trafiora_benchmark_runner` role, `application_name = 'trafiora_bench_<uuid>'` verification, and zero termination rights for `trafiora_monitor`.
- [ ] **Statistical Comparison Rigor:** Approval of multi-run ($K \ge 5$) bootstrapped 95% confidence intervals, noise detection ($\text{CV} > 0.05$), and testing against 4 ground-truth fixtures.
- [ ] **Legitimate CPU Overhead Measurement:** Explicit host cgroups/cloud metrics sourcing; reporting `UNKNOWN (HOST_METRICS_UNAVAILABLE)` when unavailable, with query execution ratio strictly marked as a fallback proxy.
- [ ] **24-Commit Execution Plan:** Permission to proceed sequentially through the 24 atomic, verified commits defined in Section 13 of the blueprint.

---
*End of Revised Implementation Blueprint. Awaiting user approval before proceeding to implementation.*
