# Trafiora API & WebSocket Specification

All endpoints are prefixed with `/api/v1`.

---

## 1. Core Endpoints

### 1.1 Health & Capabilities
- `GET /api/v1/health`: Returns API status, metadata DB connectivity, and version.
- `GET /api/v1/capabilities`: Returns the supported database engines and statement feature matrix.

### 1.2 Database Connections
- `GET /api/v1/connections`: List configured database connections.
- `POST /api/v1/connections`: Register a new database connection.
- `GET /api/v1/connections/{id}/probe`: Test connectivity and probe available extensions (`pg_stat_statements`, host cgroups).

### 1.3 Query Intelligence
- `POST /api/v1/queries/normalize`: Ingests raw SQL, strips literals, returns normalized SQL and SHA-256 fingerprint.
- `GET /api/v1/queries`: List discovered query fingerprints with execution counts and latency percentiles.
- `GET /api/v1/queries/{fingerprint}`: Detailed AST summary, table/column lineage, and plan tree.

### 1.4 Scenarios & Experiments
- `GET /api/v1/scenarios`: List workload scenario templates (Viral spike, Hot key contention, etc.).
- `POST /api/v1/scenarios`: Create or customize a workload scenario.
- `POST /api/v1/experiments`: Dispatch a benchmark experiment against an authorized target.
- `GET /api/v1/experiments/{id}`: Detailed experiment results, bootstrap confidence intervals, and outcome classification.
- `POST /api/v1/experiments/{id}/cancel`: Trigger targeted orphan cleanup for active worker sessions.

### 1.5 Real-Time WebSocket Streaming
- `WS /api/v1/ws/experiments/{id}`: Streams real-time TPS, p50, p90, p99 latency samples, and architecture particle events.

### 1.6 CI Regression & Protection
- `POST /api/v1/ci/evaluate`: Evaluates candidate run metrics against baseline run for regression gating.
- `GET /api/v1/protection/pgbouncer`: Generates calculated `pgbouncer.ini` configuration.
- `GET /api/v1/protection/timeouts`: Generates PostgreSQL role timeout scripts.
