<p align="center">
  <img src="apps/web/public/brand/logo.svg" alt="Trafiora Logo" width="120" height="120" />
</p>

<h1 align="center">Trafiora</h1>

<p align="center">
  <strong>Diagnose. Prove. Protect.</strong><br>
  Open-Source Database Workload Intelligence, Performance Engineering, and Reliability Platform.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#core-capabilities">Core Capabilities</a> •
  <a href="#safety--risk-boundaries">Safety & Risk Model</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## What is Trafiora?

Engineering teams operating SQL-backed applications face a persistent dilemma:
1. **APMs & query logs** show *that* a database is slow or saturated, but cannot safely *reproduce* the underlying load or prove that an optimization will work.
2. **Generic load testers** generate synthetic traffic disconnected from actual production access skew and execution plans.
3. **Query analyzers** suggest index changes in isolation without assessing write amplification, lock contention, or buffer cache churn.
4. **CI pipelines** check functional correctness, but allow catastrophic query regressions to slip silently into production.

**Trafiora** closes this loop by unifying five mission-critical activities into one workflow:

```
  [ OBSERVE ] ──> [ DIAGNOSE ] ──> [ REPRODUCE ] ──> [ COMPARE ] ──> [ PROTECT ]
  Capture real    Extract AST,     Synthesize       A/B test against  Enforce circuit
  queries &       detect plan      skewed load in   repeatable        breakers, pool
  telemetry       bottlenecks      disposable env   baselines         caps, & CI gates
```

---

## Core Capabilities

- **Dialect-Aware SQL Intelligence:** Normalizes complex SQL queries, strips literals into parameters, and generates deterministic SHA-256 fingerprints via AST traversal (`SQLGlot`).
- **Evidence-Based Plan Inspection:** Safe `EXPLAIN (FORMAT JSON)` plan trees, buffer cache analysis, and sequential scan detection.
- **Deterministic Workload Reproduction:** Configurable synthetic scenarios (Zipfian key distribution, traffic spikes, read/write ratios, concurrent worker pools).
- **Statistically Rigorous A/B Comparison:** Evaluates candidate optimizations across $K \ge 5$ independent repetitions using bootstrap 95% confidence intervals and noise rejection.
- **Automated CI Regression Gating:** Standalone CLI runner (`trafiora-ci`) that executes benchmarks against disposable test databases and fails builds on performance regressions.
- **Actionable Overload Protection:** Synthesizes verified `pgbouncer.ini` connection pool sizing profiles, PostgreSQL statement timeout commands, and proxy rate-limiting rules.
- **Interactive Architecture Visualizer:** High-fidelity animated canvas modeling client apps, connection pools, Redis cache, database engines, and storage subsystems.

---

## Safety & Operational Risk Model

Trafiora enforces an uncompromising three-tier operational risk classification:

| Operational Tier | Permitted Operations | Target Classification | Guarantees |
| :--- | :--- | :--- | :--- |
| **Tier 1: Read-Only Observation** | `pg_stat_statements`, `pg_stat_activity`, non-executing `EXPLAIN (FORMAT JSON)`. | Monitored production & staging databases. | Zero statement execution, zero mutations, bounded CPU overhead ($<1\%$), statement timeout $\le 2\text{s}$. |
| **Tier 2: Workload Benchmarking** | Synthetic load generation (`pgbench`, async runner), replayed queries. | Authorized test targets with explicit consent token. | Hard wall-clock limits ($\le 300\text{s}$), concurrency caps ($\le 50\text{ VUs}$), verified session ownership cleanup. |
| **Tier 3: Administrative Mutation** | Schema migrations, index creation, table resets, `EXPLAIN (ANALYZE, BUFFERS)`. | Ephemeral, disposable sandboxes ONLY (`is_disposable_sandbox = true`). | Never permitted on production targets, even within a transaction rollback. |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TRAFIORA ARCHITECTURE                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ Next.js 16 Web Dashboard ] ◄── WebSocket / REST ──► [ FastAPI Control Plane ]     │
│   • 12 Dedicated Views & Canvas                          • Auth, Vault, Job Scheduler  │
│   • ECharts Canvas Time-Series                           • AST & Plan Intelligence     │
│                                                                        │               │
│                     ┌──────────────────────────────────────────────────┴──────────┐    │
│                     ▼                                                             ▼    │
│   [ PostgreSQL Adapter Layer ]                                  [ Isolated Benchmark ] │
│   • PostgresAdapter (pg_stat_statements)                        • pgbench Sub-Runner   │
│   • Safe non-executing EXPLAIN parser                           • Async Worker Pool    │
│   • Monitored Host CPU / Fallback Proxy                         • Targeted PID Cleanup │
│                     │                                                             │    │
│                     └──────────────────────────┬──────────────────────────────────┘    │
│                                                ▼                                       │
│                        [ Multi-Run Bootstrap Comparison Engine ]                       │
│                        • 95% Confidence Intervals & Noise Detection (CV > 0.05)        │
│                        • Ground-truth synthetic validation fixtures                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Prerequisites
- **Node.js:** Node.js 24 Active LTS (compatible with Node.js 22 LTS)
- **Python:** Python 3.12+ (Python 3.14 recommended)
- **PostgreSQL:** PostgreSQL 18.6 (for metadata and disposable benchmarking)
- **Docker & Docker Compose:** (Optional, for containerized multi-service launch)

### 2. Local Docker Compose Launch

```bash
# Clone the repository
git clone https://github.com/Pranay-Kumar-02/trafiora.git
cd trafiora

# Copy environment configuration
cp .env.example .env

# Launch complete stack (Next.js web, FastAPI backend, internal metadata DB, disposable target DB)
docker compose up --build
```

Access the web interface at `http://localhost:3000` and API documentation at `http://localhost:8000/docs`.

### 3. Local Development (Without Docker)

```bash
# 1. Setup Backend
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# 2. Setup Frontend
cd ../../apps/web
npm install
npm run dev
```

---

## Monorepo Layout

```
trafiora/
├── apps/
│   ├── web/                           # Next.js 16 App Router Frontend
│   └── api/                           # FastAPI Control Plane & Adapters
├── packages/
│   └── cli/                           # `trafiora-ci` Regression Testing CLI
├── deploy/
│   ├── docker-compose.yml             # Local production-like composition
│   ├── docker-compose.test.yml        # Ephemeral test runner composition
│   └── pgbouncer/                     # Reference connection pooler setup
├── docs/
│   ├── IMPLEMENTATION_BLUEPRINT.md    # Master architectural blueprint
│   ├── ARCHITECTURE.md               # Architecture decision records
│   ├── API_SPECIFICATION.md           # OpenAPI & WebSocket protocol specs
│   └── SUPPORTED_CAPABILITIES.md      # Database capability matrix
└── tests/
    ├── backend/                       # Unit, integration, and ground-truth tests
    └── frontend/                      # Unit & Playwright E2E browser tests
```

---

## License

Trafiora is licensed under the [Apache License, Version 2.0](LICENSE).
