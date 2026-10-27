# Trafiora Supported Capabilities Matrix

## 1. Database Engines

| Database Engine | Version Status | Read-Only Observation | Workload Benchmarking | Execution-Based EXPLAIN | Certification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 18.6** | Primary Target | Fully Supported (`pg_stat_statements`) | Fully Supported (`pgbench` / async pool) | Supported (Tier 3 disposable sandbox ONLY) | **Certified & Verified** |
| **PostgreSQL 14–17** | Planned | Untested | Untested | Untested | **Explicitly Unsupported** (Pending test matrix) |
| **MySQL 8.4** | Abstracted | Planned (sys schema) | Planned | Planned | **Explicitly Unsupported** (Adapter in development) |
| **Oracle 23ai** | Abstracted | Planned (AWR) | Planned | Planned | **Explicitly Unsupported** (Adapter in development) |

---

## 2. Statement & AST Analysis Capabilities (SQLGlot)

| Statement Type | Parsing & AST | Parameter Redaction | Execution Plan Tree |
| :--- | :--- | :--- | :--- |
| `SELECT` (Simple & Filtered) | Fully Supported | Fully Supported | Supported via `EXPLAIN (FORMAT JSON)` |
| `SELECT` with `JOIN` (Inner/Outer/Cross) | Fully Supported | Fully Supported | Supported via `EXPLAIN (FORMAT JSON)` |
| Common Table Expressions (`WITH ...`) | Fully Supported | Fully Supported | Supported via `EXPLAIN (FORMAT JSON)` |
| Window Functions (`OVER (...)`) | Fully Supported | Fully Supported | Supported via `EXPLAIN (FORMAT JSON)` |
| Aggregations (`GROUP BY`, `HAVING`) | Fully Supported | Fully Supported | Supported via `EXPLAIN (FORMAT JSON)` |
| DML (`INSERT`, `UPDATE`, `DELETE`) | Fully Supported | Fully Supported | Disposable sandbox ONLY |
| Stored Procedures / PL/pgSQL | Fallback Hash | Partial | Unsupported |
