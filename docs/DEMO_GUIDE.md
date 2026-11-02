# Trafiora — Faculty Demonstration Guide
**Project:** Trafiora — Diagnose. Prove. Protect.  
**Target Environment:** Academic Demonstration & Database Workload Intelligence

---

## 1. How to Start the Application

### Prerequisites
- **Python:** 3.11 or 3.12 with `.venv` created (`uv venv .venv` and `uv pip install -r apps/api/requirements.txt`)
- **Node.js:** v20+ or v22+ (`npm install` inside `apps/web`)

### Starting the Services
Open two terminal windows:

#### Terminal 1 — Backend API (FastAPI)
```bash
# From workspace root
.venv/Scripts/python.exe -m uvicorn apps.api.src.main:app --host 127.0.0.1 --port 8000 --reload
```
*Verification:* Navigate to `http://127.0.0.1:8000/docs` (Interactive OpenAPI Swagger UI) or `http://127.0.0.1:8000/api/v1/health`.

#### Terminal 2 — Frontend Web (Next.js)
```bash
# From workspace root
npm --prefix apps/web run dev
# OR from inside apps/web: npm run dev
```
*Verification:* Open `http://localhost:3000` in your web browser.

---

## 2. Real vs. Simulated Measurements (Integrity Matrix)

Trafiora strictly separates verified live engine telemetry from simulated workload datasets.

| Metric / Feature | Source | Classification | Verification Rule |
| :--- | :--- | :--- | :--- |
| **Demo Scenario Switcher** | Deterministic static dataset in `lib/demo-data.ts` | `DEMO DATA — SIMULATED` | Unambiguously badged on all dashboard panels |
| **Live Database Connection** | `psycopg` connection to real PostgreSQL catalog | `LIVE POSTGRESQL TELEMETRY` | Queried live from `pg_stat_database` and `pg_stat_activity` |
| **Buffer Cache Hit Ratio** | `SELECT blks_hit / (blks_hit + blks_read)` | `GENUINE TELEMETRY` (when live) | Computed from live PostgreSQL engine stats; never fabricated |
| **Query Fingerprinting** | AST parser via `sqlglot` | `REAL DETERMINISTIC AST` | SHA-256 canonical fingerprinting computed in real-time |
| **Plan Diagnostics** | PostgreSQL EXPLAIN plan JSON analyzer | `REAL HEURISTICS` | Seq Scan, non-sargable filters, nested loop detection |
| **Overload Protection Calculator** | Little's Law ($L = \lambda \cdot W$) | `MATHEMATICAL MODEL` | Generates validated PgBouncer pool sizing & timeout configs |
| **Live Benchmark Execution** | `pgbench` or native `psycopg` worker pool | `GENUINE MEASUREMENT` | Measures actual statement latencies (p50, p90, p95, p99) |
| **Wire-Protocol Emulator** | Custom protocol simulation harness | `SIMULATED PROTOCOL` | Explicitly marked `WIRE_EMULATOR_SANDBOX`; never claimed as engine performance |

---

## 3. Recommended Faculty Demonstration Sequence

Follow this structured, 10-minute presentation sequence:

### Step 1: Overview Dashboard — Steady-State Workload (`/`)
1. Open `http://localhost:3000/`.
2. Notice the `DEMO DATA — SIMULATED` badge and the unified green **Control Plane: Active** indicator.
3. Keep scenario set to **1. Normal Traffic**.
4. **Key Talking Points:**
   - 1,480 QPS steady-state transactional throughput.
   - p50 latency is 3.4ms, p95 is 9.8ms.
   - Buffer-cache hit ratio is optimal at 99.4% (hot in shared memory).
   - Only 32 of 100 backend slots are active, zero queuing in PgBouncer.

### Step 2: Traffic Spike & Connection Starvation (`/`)
1. Click **2. Traffic Spike (Pool Saturation)**.
2. Observe visualizations immediately update:
   - Throughput surges to 4,850 QPS.
   - Active backends spike to 92/100, and 34 clients stall in PgBouncer wait queue.
   - Tail latency explodes: p95 reaches 46.8ms, p99 jumps to 142.0ms.
   - Cache hit ratio degrades to 94.1% due to buffer churn.
3. Switch through **3. Slow Query**, **4. Pool Saturation**, **5. Regression**, and **6. Comparison** to show how every operational scenario tells a deterministic story.

### Step 3: Workload Query Inspection & Fingerprinting (`/workload`)
1. Click **Workload** in the navigation header.
2. Paste an unindexed SQL query or pick one from the table:
   ```sql
   SELECT id, payload, created_at FROM events WHERE user_id = 9482 ORDER BY created_at DESC LIMIT 50;
   ```
3. Click **Normalize & Fingerprint**.
4. **Key Talking Points:**
   - The AST normalizer strips literal values (`$1`), standardizes whitespace, purges comments, and outputs a canonical SHA-256 fingerprint (`64 hex characters`).
   - Structural variants with different user IDs map to the exact same fingerprint, grouping execution statistics without security leaks.

### Step 4: Bottleneck Diagnosis & Plan Explanation (`/diagnosis`)
1. Click **Diagnosis** in the navigation.
2. Review the detected bottlenecks categorized by severity (`CRITICAL`, `HIGH IMPACT`).
3. Click on the sequential scan bottleneck on the `events` table.
4. **Key Talking Points:**
   - Highlights that this single query accounts for over 50% of total cluster execution time.
   - Generates non-destructive, safe DDL (`CREATE INDEX CONCURRENTLY idx_events_user_created ON events (user_id, created_at DESC);`).
   - Emphasizes that optimizations are clearly marked `is_verified: false` until empirically proven in an isolated benchmark run.

### Step 5: Interactive Architecture Canvas (`/canvas`)
1. Click **Canvas** in the header.
2. Demonstrate node inspection: Client Apps $\to$ PgBouncer Pool $\to$ Primary PostgreSQL Engine $\to$ Storage Subsystem.
3. Use playback controls (Play, Pause, Step) and zoom/pan to trace request flow and see where connection queues and disk I/O bottlenecks occur.

### Step 6: Overload Protection & Little's Law Pool Sizing (`/protection`)
1. Click **Protection** in the header.
2. Input parameters:
   - Arrival QPS: `1,200`
   - Mean Latency: `15.0 ms`
   - CPU Cores: `8`
   - Disk Type: `SSD`
3. Click **Calculate Protection & Sizing**.
4. **Key Talking Points:**
   - Applies Little's Law ($L = \lambda \cdot W$): $1,200 \text{ req/s} \times 0.015 \text{ s} = 18 \text{ concurrent connections}$.
   - Prevents Postgres backend thread explosion ($N_{\text{backends}} \le 2 \times \text{Cores} + \text{Spindle Effective} \approx 20$).
   - Generates ready-to-deploy, validated `pgbouncer.ini` configuration with transaction pooling and query timeouts.

### Step 7: Benchmark Experiments & A/B Comparison (`/experiments` and `/compare`)
1. Open **Experiments** to demonstrate isolated test execution.
2. Highlight the 3-tier safety gate:
   - **Tier 1 (Read-Only Production):** Benchmark execution is strictly blocked by API (`403 Forbidden`).
   - **Tier 2 (Authorized Test Target):** Requires explicit admin consent.
   - **Tier 3 (Disposable Sandbox):** Isolated ephemeral benchmarking.
3. Open **A/B Comparison** (`/compare`) to show the baseline-versus-candidate evaluation:
   - Evaluates p95 latency, throughput, and coefficient of variation ($CV \le 0.12$).
   - Four possible outcomes: `MEASURED_IMPROVEMENT`, `REGRESSION_DETECTED`, `NO_MATERIAL_CHANGE`, or `INCONCLUSIVE_HIGH_VARIANCE`.

---

## 4. Known Limitations & Faculty Q&A Notes

1. **Host CPU Telemetry in Cloud/Container Runtimes:**
   - Host CPU metrics use `psutil` when executed directly on local bare-metal/VM hosts. When running inside containerized cloud instances without `/sys/fs/cgroup` mounts, CPU metrics are reported as unavailable (`null`) rather than inventing fake percentages.
2. **PostgreSQL Version Compatibility:**
   - Primary target is PostgreSQL 16, 17, and 18 with `pg_stat_statements` enabled.
3. **pgbench Subprocess vs. Native Driver:**
   - If `pgbench` command-line binary is not installed on the host OS, Trafiora seamlessly uses its native async `psycopg` worker pool to execute concurrent queries with exact timestamp latency tracking.
