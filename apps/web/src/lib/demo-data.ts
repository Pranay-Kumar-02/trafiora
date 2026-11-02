export interface DemoDataPoint {
  time: string;
  throughputQps: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
}

export interface DemoWorkloadQuery {
  fingerprint: string;
  statement: string;
  calls: number;
  meanLatencyMs: number;
  totalExecTimeMs: number;
  totalTimePct: number;
  sharedBlksHit: number;
  sharedBlksRead: number;
  antiPattern?: string;
  optimizationSuggestion?: string;
  isSimulated: boolean;
}

export interface DemoBottleneck {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH IMPACT" | "MODERATE" | "OPTIMIZED";
  queryFingerprint?: string;
  impact: string;
  rootCause: string;
  recommendation: string;
  proposedDdl?: string;
}

export interface DemoBenchmarkComparison {
  baselineName: string;
  candidateName: string;
  baselineP50: number;
  baselineP95: number;
  baselineP99: number;
  baselineQps: number;
  candidateP50: number;
  candidateP95: number;
  candidateP99: number;
  candidateQps: number;
  p95DeltaPct: number;
  qpsDeltaPct: number;
  outcomeClassification: "MEASURED_IMPROVEMENT" | "REGRESSION_DETECTED" | "NEUTRAL_WITHIN_NOISE";
  summary: string;
  keyTakeaway: string;
}

export type DemoScenarioId =
  | "normal"
  | "traffic_spike"
  | "slow_query"
  | "pool_saturation"
  | "query_regression"
  | "optimization_comparison";

export interface DemoScenario {
  id: DemoScenarioId;
  name: string;
  badge: string;
  subtitle: string;
  narrative: string;
  kpis: {
    throughputQps: number;
    throughputDelta: { value: string; trend: "up" | "down" | "flat"; isPositiveGood: boolean };
    latencyP50Ms: number;
    latencyP95Ms: number;
    latencyP99Ms: number;
    latencyDelta: { value: string; trend: "up" | "down" | "flat"; isPositiveGood: boolean };
    bufferCacheHitRatio: number;
    bufferCacheSubtext: string;
    activeBackends: number;
    maxConnections: number;
    poolUtilizationPct: number;
    pgbouncerQueueWait: number;
    activeQueries: number;
    lockWaits: number;
    hostCpuPct: number;
  };
  timeSeries: DemoDataPoint[];
  queries: DemoWorkloadQuery[];
  bottlenecks: DemoBottleneck[];
  benchmark: DemoBenchmarkComparison;
}

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  normal: {
    id: "normal",
    name: "Normal Steady-State Workload",
    badge: "1,480 QPS • Baseline Stable",
    subtitle: "Nominal e-commerce transactional traffic with balanced index access and low connection saturation.",
    narrative:
      "Database operates in healthy steady-state. 32 of 100 backend slots are active, PgBouncer pool multiplexing maintains zero client queue stalls, and buffer cache hit ratio is optimal at 99.4%. One unindexed event scan constitutes 20.9% of database time.",
    kpis: {
      throughputQps: 1480.0,
      throughputDelta: { value: "+1.8% vs SLA target", trend: "up", isPositiveGood: true },
      latencyP50Ms: 3.4,
      latencyP95Ms: 9.8,
      latencyP99Ms: 18.2,
      latencyDelta: { value: "-0.4ms latency jitter", trend: "down", isPositiveGood: true },
      bufferCacheHitRatio: 99.4,
      bufferCacheSubtext: "Optimal (> 99.0%) • shared_buffers hot",
      activeBackends: 32,
      maxConnections: 100,
      poolUtilizationPct: 28,
      pgbouncerQueueWait: 0,
      activeQueries: 14,
      lockWaits: 0,
      hostCpuPct: 24,
    },
    timeSeries: [
      { time: "14:00:00", throughputQps: 1420.0, latencyP50Ms: 3.2, latencyP95Ms: 9.4, latencyP99Ms: 17.6 },
      { time: "14:02:00", throughputQps: 1460.5, latencyP50Ms: 3.3, latencyP95Ms: 9.6, latencyP99Ms: 17.9 },
      { time: "14:04:00", throughputQps: 1510.2, latencyP50Ms: 3.5, latencyP95Ms: 10.1, latencyP99Ms: 18.8 },
      { time: "14:06:00", throughputQps: 1480.0, latencyP50Ms: 3.4, latencyP95Ms: 9.8, latencyP99Ms: 18.2 },
      { time: "14:08:00", throughputQps: 1495.4, latencyP50Ms: 3.4, latencyP95Ms: 9.7, latencyP99Ms: 18.0 },
      { time: "14:10:00", throughputQps: 1530.8, latencyP50Ms: 3.6, latencyP95Ms: 10.4, latencyP99Ms: 19.1 },
      { time: "14:12:00", throughputQps: 1475.2, latencyP50Ms: 3.3, latencyP95Ms: 9.5, latencyP99Ms: 17.8 },
      { time: "14:14:00", throughputQps: 1480.0, latencyP50Ms: 3.4, latencyP95Ms: 9.8, latencyP99Ms: 18.2 },
    ],
    queries: [
      {
        fingerprint: "3e55f01a7d62",
        statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        calls: 210800,
        meanLatencyMs: 1.1,
        totalExecTimeMs: 231880,
        totalTimePct: 31.2,
        sharedBlksHit: 421600,
        sharedBlksRead: 12,
        antiPattern: undefined,
        optimizationSuggestion: "Optimal B-Tree Index Scan on sessions_token_idx. Cache remains hot.",
        isSimulated: true,
      },
      {
        fingerprint: "8b72e11d09ca",
        statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        calls: 89400,
        meanLatencyMs: 3.2,
        totalExecTimeMs: 286080,
        totalTimePct: 38.5,
        sharedBlksHit: 178800,
        sharedBlksRead: 84,
        antiPattern: undefined,
        optimizationSuggestion: "Single-row primary key update with minimal WAL overhead.",
        isSimulated: true,
      },
      {
        fingerprint: "f7d98b12e3a4",
        statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        calls: 8450,
        meanLatencyMs: 18.4,
        totalExecTimeMs: 155480,
        totalTimePct: 20.9,
        sharedBlksHit: 33800,
        sharedBlksRead: 6420,
        antiPattern: "Missing composite index on (user_id, created_at DESC)",
        optimizationSuggestion: "Add composite index (user_id, created_at DESC) to eliminate sort step.",
        isSimulated: true,
      },
      {
        fingerprint: "a310c89e4f21",
        statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id",
        calls: 820,
        meanLatencyMs: 84.2,
        totalExecTimeMs: 69044,
        totalTimePct: 9.3,
        sharedBlksHit: 12400,
        sharedBlksRead: 1890,
        antiPattern: "HashAggregate on unbounded join",
        optimizationSuggestion: "Bound search interval with date predicate or use incremental rollup table.",
        isSimulated: true,
      },
    ],
    bottlenecks: [
      {
        id: "seqscan_events",
        title: "Sequential Scan on events table (f7d98b12e3a4)",
        severity: "HIGH IMPACT",
        queryFingerprint: "f7d98b12e3a4",
        impact: "Consumes 20.9% of total database execution time despite comprising only 2.7% of total calls.",
        rootCause: "Query filters by user_id and orders by created_at DESC without a composite index, forcing in-memory quicksort.",
        recommendation: "Create a concurrent composite B-tree index on (user_id, created_at DESC).",
        proposedDdl: "CREATE INDEX CONCURRENTLY idx_events_user_created ON events (user_id, created_at DESC);",
      },
      {
        id: "hash_agg_orders",
        title: "Unbounded HashAggregate on Customer Orders (a310c89e4f21)",
        severity: "MODERATE",
        queryFingerprint: "a310c89e4f21",
        impact: "Mean latency 84.2ms. Reads 1,890 blocks per batch run.",
        rootCause: "Full outer hash join across customers and orders without partition or date range bounds.",
        recommendation: "Introduce operational date window or pre-aggregate in an hourly rollup table.",
      },
    ],
    benchmark: {
      baselineName: "pgbench_standard_steady",
      candidateName: "pgbench_prepared_stmts",
      baselineP50: 3.4,
      baselineP95: 9.8,
      baselineP99: 18.2,
      baselineQps: 1480.0,
      candidateP50: 3.1,
      candidateP95: 8.45,
      candidateP99: 14.8,
      candidateQps: 1620.0,
      p95DeltaPct: -13.8,
      qpsDeltaPct: 9.5,
      outcomeClassification: "MEASURED_IMPROVEMENT",
      summary: "Enabling server-side prepared statements reduced query parse and planning overhead.",
      keyTakeaway: "Measured 1.35ms latency reduction (-13.8%) and +140 QPS throughput boost with zero schema modification.",
    },
  },

  traffic_spike: {
    id: "traffic_spike",
    name: "High Traffic Spike & Pool Saturation",
    badge: "4,850 QPS • Pool Saturation (92%)",
    subtitle: "Simulated 3.5x viral surge with Zipfian skew, connection exhaustion, and client queue stalls.",
    narrative:
      "A 3.5x surge drives throughput to 4,850 QPS. 92 of 100 backend connection slots are occupied, causing 34 clients to stall in the PgBouncer wait queue. The missing index on events amplifies CPU burn, causing p95 latency to leap from 9.8ms to 46.8ms and p99 to 142.0ms.",
    kpis: {
      throughputQps: 4850.0,
      throughputDelta: { value: "+227.7% concurrency burst", trend: "up", isPositiveGood: true },
      latencyP50Ms: 8.6,
      latencyP95Ms: 46.8,
      latencyP99Ms: 142.0,
      latencyDelta: { value: "+37.0ms tail degradation", trend: "up", isPositiveGood: false },
      bufferCacheHitRatio: 94.1,
      bufferCacheSubtext: "Degraded (< 95.0%) • Buffer churn from scan load",
      activeBackends: 92,
      maxConnections: 100,
      poolUtilizationPct: 96,
      pgbouncerQueueWait: 34,
      activeQueries: 68,
      lockWaits: 12,
      hostCpuPct: 89,
    },
    timeSeries: [
      { time: "14:00:00", throughputQps: 1520.0, latencyP50Ms: 3.4, latencyP95Ms: 9.8, latencyP99Ms: 18.2 },
      { time: "14:02:00", throughputQps: 2340.0, latencyP50Ms: 4.8, latencyP95Ms: 16.4, latencyP99Ms: 38.0 },
      { time: "14:04:00", throughputQps: 3780.0, latencyP50Ms: 6.9, latencyP95Ms: 32.1, latencyP99Ms: 84.5 },
      { time: "14:06:00", throughputQps: 4850.0, latencyP50Ms: 8.6, latencyP95Ms: 46.8, latencyP99Ms: 142.0 },
      { time: "14:08:00", throughputQps: 4910.0, latencyP50Ms: 9.1, latencyP95Ms: 49.5, latencyP99Ms: 154.0 },
      { time: "14:10:00", throughputQps: 4780.0, latencyP50Ms: 8.4, latencyP95Ms: 45.2, latencyP99Ms: 139.0 },
      { time: "14:12:00", throughputQps: 4820.0, latencyP50Ms: 8.5, latencyP95Ms: 46.1, latencyP99Ms: 141.0 },
      { time: "14:14:00", throughputQps: 4850.0, latencyP50Ms: 8.6, latencyP95Ms: 46.8, latencyP99Ms: 142.0 },
    ],
    queries: [
      {
        fingerprint: "f7d98b12e3a4",
        statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        calls: 128450,
        meanLatencyMs: 44.8,
        totalExecTimeMs: 5754560,
        totalTimePct: 58.4,
        sharedBlksHit: 513800,
        sharedBlksRead: 98400,
        antiPattern: "High Disk Read & Quicksort under Concurrency",
        optimizationSuggestion: "Unindexed sequential scan under 128k calls consumes 58.4% of total cluster execution time.",
        isSimulated: true,
      },
      {
        fingerprint: "8b72e11d09ca",
        statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        calls: 312000,
        meanLatencyMs: 6.8,
        totalExecTimeMs: 2121600,
        totalTimePct: 21.5,
        sharedBlksHit: 624000,
        sharedBlksRead: 4120,
        antiPattern: "Row-level lock contention on hot accounts",
        optimizationSuggestion: "Contention on hot accounts creates lock queueing during peak traffic.",
        isSimulated: true,
      },
      {
        fingerprint: "3e55f01a7d62",
        statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        calls: 740000,
        meanLatencyMs: 1.8,
        totalExecTimeMs: 1332000,
        totalTimePct: 13.5,
        sharedBlksHit: 1480000,
        sharedBlksRead: 210,
        antiPattern: "Pool acquisition wait delay",
        optimizationSuggestion: "Execution remains fast (1.8ms), but connection checkout delay contributes to p99 tail.",
        isSimulated: true,
      },
      {
        fingerprint: "c541e89b21a0",
        statement: "SELECT id, title, body FROM audit_log ORDER BY id DESC OFFSET 50000 LIMIT 25",
        calls: 9200,
        meanLatencyMs: 71.4,
        totalExecTimeMs: 656880,
        totalTimePct: 6.7,
        sharedBlksHit: 36800,
        sharedBlksRead: 18920,
        antiPattern: "Deep OFFSET pagination scanning 50,000 dead rows",
        optimizationSuggestion: "Migrate to cursor/keyset pagination (WHERE id < $last_id ORDER BY id DESC LIMIT 25).",
        isSimulated: true,
      },
    ],
    bottlenecks: [
      {
        id: "pool_exhaustion",
        title: "Connection Pool Saturation (92% backends, 34 queued)",
        severity: "CRITICAL",
        impact: "34 client threads stalled waiting for an available PostgreSQL backend slot in PgBouncer.",
        rootCause: "Session pooling mode pins dedicated backends to idle client connections during network pauses.",
        recommendation: "Switch PgBouncer to transaction pooling mode with default_pool_size=25.",
      },
      {
        id: "scan_amplification",
        title: "Event Scan CPU Amplification (f7d98b12e3a4)",
        severity: "CRITICAL",
        queryFingerprint: "f7d98b12e3a4",
        impact: "Consumes 5,754s cumulative CPU time (58.4% of cluster total), driving host CPU to 89%.",
        rootCause: "Full table scan across 128,450 executions under high concurrency.",
        recommendation: "Deploy composite index (user_id, created_at DESC) immediately.",
        proposedDdl: "CREATE INDEX CONCURRENTLY idx_events_user_created ON events (user_id, created_at DESC);",
      },
      {
        id: "deep_offset_50k",
        title: "Deep OFFSET pagination on audit_log (c541e89b21a0)",
        severity: "HIGH IMPACT",
        queryFingerprint: "c541e89b21a0",
        impact: "Discards 50,000 valid index entries per execution, causing 18,920 disk block reads.",
        rootCause: "OFFSET 50000 requires reading all preceding rows before returning 25.",
        recommendation: "Use keyset pagination WHERE id < $last_id LIMIT 25.",
      },
    ],
    benchmark: {
      baselineName: "unbuffered_traffic_spike",
      candidateName: "pgbouncer_tx_pooling",
      baselineP50: 8.6,
      baselineP95: 46.8,
      baselineP99: 142.0,
      baselineQps: 4850.0,
      candidateP50: 4.8,
      candidateP95: 18.2,
      candidateP99: 38.4,
      candidateQps: 5610.0,
      p95DeltaPct: -61.1,
      qpsDeltaPct: 15.7,
      outcomeClassification: "MEASURED_IMPROVEMENT",
      summary: "PgBouncer transaction pooling multiplexed 500 client connections over 25 PostgreSQL server backends.",
      keyTakeaway: "Eliminated connection checkout queueing, slashing p95 latency by 28.6ms (-61.1%) and p99 from 142ms to 38.4ms.",
    },
  },

  query_regression: {
    id: "query_regression",
    name: "Query Regression (Unindexed Scan & Deep Pagination)",
    badge: "760 QPS • Severe Degradation",
    subtitle: "Problematic application deployment introducing non-sargable predicate and deep unindexed pagination.",
    narrative:
      "A problematic ORM migration introduced `LOWER(user_id)` which invalidates B-tree indexes and `OFFSET 150000` which traverses 150k row pointers. Host CPU pegs at 96%, throughput collapses by 54% to 760 QPS, and p95 latency explodes by 523% to 88.5ms.",
    kpis: {
      throughputQps: 760.0,
      throughputDelta: { value: "-48.6% throughput collapse", trend: "down", isPositiveGood: false },
      latencyP50Ms: 19.4,
      latencyP95Ms: 88.5,
      latencyP99Ms: 310.0,
      latencyDelta: { value: "+78.7ms critical latency regression", trend: "up", isPositiveGood: false },
      bufferCacheHitRatio: 89.2,
      bufferCacheSubtext: "Critical (< 90.0%) • Table scan cache eviction storm",
      activeBackends: 78,
      maxConnections: 100,
      poolUtilizationPct: 84,
      pgbouncerQueueWait: 18,
      activeQueries: 48,
      lockWaits: 8,
      hostCpuPct: 96,
    },
    timeSeries: [
      { time: "14:00:00", throughputQps: 1650.0, latencyP50Ms: 3.8, latencyP95Ms: 14.2, latencyP99Ms: 24.5 },
      { time: "14:02:00", throughputQps: 1420.0, latencyP50Ms: 5.6, latencyP95Ms: 24.8, latencyP99Ms: 56.0 },
      { time: "14:04:00", throughputQps: 1150.0, latencyP50Ms: 9.8, latencyP95Ms: 48.0, latencyP99Ms: 125.0 },
      { time: "14:06:00", throughputQps: 920.0, latencyP50Ms: 14.2, latencyP95Ms: 68.4, latencyP99Ms: 210.0 },
      { time: "14:08:00", throughputQps: 780.0, latencyP50Ms: 18.5, latencyP95Ms: 84.1, latencyP99Ms: 295.0 },
      { time: "14:10:00", throughputQps: 750.0, latencyP50Ms: 19.8, latencyP95Ms: 89.2, latencyP99Ms: 318.0 },
      { time: "14:12:00", throughputQps: 770.0, latencyP50Ms: 19.1, latencyP95Ms: 87.4, latencyP99Ms: 305.0 },
      { time: "14:14:00", throughputQps: 760.0, latencyP50Ms: 19.4, latencyP95Ms: 88.5, latencyP99Ms: 310.0 },
    ],
    queries: [
      {
        fingerprint: "c541e89b21a0",
        statement: "SELECT id, title, body FROM audit_log ORDER BY id DESC OFFSET 150000 LIMIT 50",
        calls: 14200,
        meanLatencyMs: 194.2,
        totalExecTimeMs: 2757640,
        totalTimePct: 46.8,
        sharedBlksHit: 56800,
        sharedBlksRead: 84200,
        antiPattern: "Deep OFFSET pagination: traversing 150,000 tuple pointers",
        optimizationSuggestion: "Traversing 150k dead rows on every page request causes 84.2k disk reads and 194ms average latency.",
        isSimulated: true,
      },
      {
        fingerprint: "f7d98b12e3a4",
        statement: "SELECT id, payload, created_at FROM events WHERE LOWER(user_id) = $1 ORDER BY created_at DESC LIMIT $2",
        calls: 38100,
        meanLatencyMs: 56.4,
        totalExecTimeMs: 2148840,
        totalTimePct: 36.5,
        sharedBlksHit: 152400,
        sharedBlksRead: 62300,
        antiPattern: "Non-sargable LOWER(user_id) invalidating btree index",
        optimizationSuggestion: "Wrapping column in LOWER() prevents index lookup; Postgres performs a sequential scan over 4M rows.",
        isSimulated: true,
      },
      {
        fingerprint: "a310c89e4f21",
        statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id",
        calls: 4800,
        meanLatencyMs: 112.5,
        totalExecTimeMs: 540000,
        totalTimePct: 9.2,
        sharedBlksHit: 19200,
        sharedBlksRead: 14500,
        antiPattern: "HashAggregate spilling work_mem to temporary disk files",
        optimizationSuggestion: "work_mem = 4MB is exceeded by aggregate hash table, spilling 32MB to disk.",
        isSimulated: true,
      },
      {
        fingerprint: "3e55f01a7d62",
        statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        calls: 180000,
        meanLatencyMs: 2.5,
        totalExecTimeMs: 450000,
        totalTimePct: 7.6,
        sharedBlksHit: 360000,
        sharedBlksRead: 420,
        antiPattern: "CPU scheduling starvation from background table scans",
        optimizationSuggestion: "Normally 1.1ms; degraded to 2.5ms due to 96% host CPU contention.",
        isSimulated: true,
      },
    ],
    bottlenecks: [
      {
        id: "deep_offset_150k",
        title: "Deep OFFSET 150000 Pagination on audit_log (c541e89b21a0)",
        severity: "CRITICAL",
        queryFingerprint: "c541e89b21a0",
        impact: "Mean latency 194.2ms. Accounts for 46.8% of cluster query execution time.",
        rootCause: "Database must scan and discard 150,000 index pointers before yielding 50 rows.",
        recommendation: "Refactor API to use Keyset / Seek pagination (WHERE id < :cursor ORDER BY id DESC LIMIT 50).",
      },
      {
        id: "nonsargable_lower",
        title: "Non-Sargable LOWER(user_id) Expression (f7d98b12e3a4)",
        severity: "CRITICAL",
        queryFingerprint: "f7d98b12e3a4",
        impact: "Forces full sequential scan across 4M rows in events table, consuming 36.5% total time.",
        rootCause: "Function call on indexed column prevents index seek on standard B-Tree index.",
        recommendation: "Add functional index or enforce lowercased storage at ingestion time.",
        proposedDdl: "CREATE INDEX CONCURRENTLY idx_events_lower_user ON events (LOWER(user_id), created_at DESC);",
      },
      {
        id: "cache_eviction_storm",
        title: "Buffer Cache Eviction Storm (Hit ratio dropped to 89.2%)",
        severity: "HIGH IMPACT",
        impact: "Disk block reads surge to 161,420 blocks, blowing out shared_buffers and stalling disk I/O.",
        rootCause: "Massive sequential scans from unindexed queries evict hot application data from shared memory.",
        recommendation: "Fix queries to restore > 99% cache hit ratio and prevent I/O thrashing.",
      },
    ],
    benchmark: {
      baselineName: "v2.4_stable_production",
      candidateName: "v2.5_unindexed_release",
      baselineP50: 3.8,
      baselineP95: 14.2,
      baselineP99: 24.5,
      baselineQps: 1650.0,
      candidateP50: 19.4,
      candidateP95: 88.5,
      candidateP99: 310.0,
      candidateQps: 760.0,
      p95DeltaPct: 523.2,
      qpsDeltaPct: -53.9,
      outcomeClassification: "REGRESSION_DETECTED",
      summary: "CRITICAL REGRESSION DETECTED: Candidate release caused a 6.2x spike in p95 latency and halved throughput.",
      keyTakeaway: "Unindexed OFFSET pagination and non-sargable predicate saturated database CPU. DO NOT PROMOTE TO PRODUCTION.",
    },
  },

  slow_query: {
    id: "slow_query",
    name: "Slow-Query Bottleneck (Unindexed Sequential Scan)",
    badge: "920 QPS • Heavy Disk I/O & Quicksort",
    subtitle: "Heavy unindexed table scan and HashAggregate consuming 64.2% of cluster CPU and evicting shared_buffers.",
    narrative:
      "A missing composite index on `events (user_id, created_at DESC)` forces PostgreSQL to scan 4.2M table blocks and execute an in-memory Quicksort on every call. Buffer cache hit drops to 91.5% due to cache thrashing, and p95 latency jumps to 72.4ms.",
    kpis: {
      throughputQps: 920.0,
      throughputDelta: { value: "-37.8% throughput drop", trend: "down", isPositiveGood: false },
      latencyP50Ms: 12.2,
      latencyP95Ms: 72.4,
      latencyP99Ms: 240.0,
      latencyDelta: { value: "+62.6ms tail latency spike", trend: "up", isPositiveGood: false },
      bufferCacheHitRatio: 91.5,
      bufferCacheSubtext: "Degraded (< 95.0%) • 48,200 shared_blks_read from storage",
      activeBackends: 54,
      maxConnections: 100,
      poolUtilizationPct: 62,
      pgbouncerQueueWait: 6,
      activeQueries: 38,
      lockWaits: 4,
      hostCpuPct: 82,
    },
    timeSeries: [
      { time: "14:00:00", throughputQps: 1420.0, latencyP50Ms: 3.4, latencyP95Ms: 11.2, latencyP99Ms: 22.0 },
      { time: "14:02:00", throughputQps: 1280.0, latencyP50Ms: 5.8, latencyP95Ms: 24.5, latencyP99Ms: 65.0 },
      { time: "14:04:00", throughputQps: 1050.0, latencyP50Ms: 8.9, latencyP95Ms: 48.0, latencyP99Ms: 140.0 },
      { time: "14:06:00", throughputQps: 940.0, latencyP50Ms: 11.4, latencyP95Ms: 68.2, latencyP99Ms: 220.0 },
      { time: "14:08:00", throughputQps: 910.0, latencyP50Ms: 12.6, latencyP95Ms: 74.0, latencyP99Ms: 248.0 },
      { time: "14:10:00", throughputQps: 925.0, latencyP50Ms: 12.1, latencyP95Ms: 71.8, latencyP99Ms: 238.0 },
      { time: "14:12:00", throughputQps: 930.0, latencyP50Ms: 12.0, latencyP95Ms: 71.5, latencyP99Ms: 236.0 },
      { time: "14:14:00", throughputQps: 920.0, latencyP50Ms: 12.2, latencyP95Ms: 72.4, latencyP99Ms: 240.0 },
    ],
    queries: [
      {
        fingerprint: "f7d98b12e3a4",
        statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        calls: 84200,
        meanLatencyMs: 68.5,
        totalExecTimeMs: 5767700,
        totalTimePct: 64.2,
        sharedBlksHit: 336800,
        sharedBlksRead: 78400,
        antiPattern: "Missing composite index (user_id, created_at DESC) forcing Seq Scan & Sort",
        optimizationSuggestion: "Create composite index to replace Seq Scan + Quicksort with backwards Index Scan.",
        isSimulated: true,
      },
      {
        fingerprint: "a310c89e4f21",
        statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id",
        calls: 3200,
        meanLatencyMs: 98.4,
        totalExecTimeMs: 314880,
        totalTimePct: 18.5,
        sharedBlksHit: 16400,
        sharedBlksRead: 9200,
        antiPattern: "Full table hash join without range filter",
        optimizationSuggestion: "Bound search with created_at predicate to restrict working set.",
        isSimulated: true,
      },
      {
        fingerprint: "8b72e11d09ca",
        statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        calls: 54000,
        meanLatencyMs: 5.4,
        totalExecTimeMs: 291600,
        totalTimePct: 10.2,
        sharedBlksHit: 108000,
        sharedBlksRead: 640,
        antiPattern: undefined,
        optimizationSuggestion: "PK update latency elevated due to disk I/O contention.",
        isSimulated: true,
      },
      {
        fingerprint: "3e55f01a7d62",
        statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        calls: 110000,
        meanLatencyMs: 1.6,
        totalExecTimeMs: 176000,
        totalTimePct: 7.1,
        sharedBlksHit: 220000,
        sharedBlksRead: 40,
        antiPattern: undefined,
        optimizationSuggestion: "Hot point lookup.",
        isSimulated: true,
      },
    ],
    bottlenecks: [
      {
        id: "seqscan_events_slow",
        title: "Sequential Scan & Quicksort Bottleneck on events (f7d98b12e3a4)",
        severity: "CRITICAL",
        queryFingerprint: "f7d98b12e3a4",
        impact: "Accounts for 64.2% of cluster execution time. Reads 78,400 disk blocks and causes I/O bottlenecks.",
        rootCause: "Full table scan across 4.2M rows combined with in-memory Quicksort.",
        recommendation: "Create concurrent composite index idx_events_user_created ON events (user_id, created_at DESC).",
        proposedDdl: "CREATE INDEX CONCURRENTLY idx_events_user_created ON events (user_id, created_at DESC);",
      },
      {
        id: "buffer_cache_churn",
        title: "Disk I/O Contention & Cache Churn (8,200 IOPS)",
        severity: "HIGH IMPACT",
        impact: "Shared buffer cache hit dropped to 91.5%, forcing PostgreSQL to fetch from storage subsystem.",
        rootCause: "Table scan reads evict hot user session buffers from shared_buffers.",
        recommendation: "Add index to reduce working set size to hot cache.",
      },
    ],
    benchmark: {
      baselineName: "unindexed_seqscan_baseline",
      candidateName: "composite_index_candidate",
      baselineP50: 12.2,
      baselineP95: 72.4,
      baselineP99: 240.0,
      baselineQps: 920.0,
      candidateP50: 3.2,
      candidateP95: 8.8,
      candidateP99: 16.5,
      candidateQps: 2450.0,
      p95DeltaPct: -87.8,
      qpsDeltaPct: 166.3,
      outcomeClassification: "MEASURED_IMPROVEMENT",
      summary: "Composite index eliminated the sequential scan and sort step, slashing p95 latency by 87.8%.",
      keyTakeaway: "Measured 63.6ms latency improvement and +1,530 QPS throughput boost with verified result correctness.",
    },
  },

  pool_saturation: {
    id: "pool_saturation",
    name: "Connection-Pool Saturation (100% Slots, 65 Queued)",
    badge: "2,150 QPS • Connection Starvation",
    subtitle: "Exhaustion of max_connections with 65 client threads blocked in PgBouncer pool wait queue.",
    narrative:
      "All 100 backend PostgreSQL process slots are pinned by idle client connections in session pooling mode. 65 concurrent application threads are stalled in PgBouncer checkout queue. Latency p95 reaches 118.0ms despite healthy underlying CPU.",
    kpis: {
      throughputQps: 2150.0,
      throughputDelta: { value: "-32.5% pool throttled", trend: "down", isPositiveGood: false },
      latencyP50Ms: 24.5,
      latencyP95Ms: 118.0,
      latencyP99Ms: 380.0,
      latencyDelta: { value: "+108.2ms queueing delay", trend: "up", isPositiveGood: false },
      bufferCacheHitRatio: 98.2,
      bufferCacheSubtext: "Nominal (98.2%) • Bottleneck is connection queueing",
      activeBackends: 100,
      maxConnections: 100,
      poolUtilizationPct: 100,
      pgbouncerQueueWait: 65,
      activeQueries: 98,
      lockWaits: 24,
      hostCpuPct: 64,
    },
    timeSeries: [
      { time: "14:00:00", throughputQps: 1800.0, latencyP50Ms: 4.5, latencyP95Ms: 18.2, latencyP99Ms: 45.0 },
      { time: "14:02:00", throughputQps: 2400.0, latencyP50Ms: 8.2, latencyP95Ms: 38.5, latencyP99Ms: 95.0 },
      { time: "14:04:00", throughputQps: 2300.0, latencyP50Ms: 14.5, latencyP95Ms: 68.0, latencyP99Ms: 180.0 },
      { time: "14:06:00", throughputQps: 2180.0, latencyP50Ms: 21.0, latencyP95Ms: 98.4, latencyP99Ms: 290.0 },
      { time: "14:08:00", throughputQps: 2120.0, latencyP50Ms: 25.8, latencyP95Ms: 122.0, latencyP99Ms: 395.0 },
      { time: "14:10:00", throughputQps: 2140.0, latencyP50Ms: 24.2, latencyP95Ms: 116.5, latencyP99Ms: 375.0 },
      { time: "14:12:00", throughputQps: 2160.0, latencyP50Ms: 24.0, latencyP95Ms: 115.0, latencyP99Ms: 370.0 },
      { time: "14:14:00", throughputQps: 2150.0, latencyP50Ms: 24.5, latencyP95Ms: 118.0, latencyP99Ms: 380.0 },
    ],
    queries: [
      {
        fingerprint: "3e55f01a7d62",
        statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        calls: 380000,
        meanLatencyMs: 18.5,
        totalExecTimeMs: 7030000,
        totalTimePct: 44.2,
        sharedBlksHit: 760000,
        sharedBlksRead: 40,
        antiPattern: "Queue wait delay: 17.4ms checkout wait before query execute",
        optimizationSuggestion: "Database execution takes 1.1ms; remainder is connection acquisition queue stall.",
        isSimulated: true,
      },
      {
        fingerprint: "8b72e11d09ca",
        statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        calls: 140000,
        meanLatencyMs: 32.4,
        totalExecTimeMs: 4536000,
        totalTimePct: 28.5,
        sharedBlksHit: 280000,
        sharedBlksRead: 210,
        antiPattern: "Connection pinned across extended transaction boundary",
        optimizationSuggestion: "Transaction holds connection slot open across application round-trips.",
        isSimulated: true,
      },
      {
        fingerprint: "f7d98b12e3a4",
        statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        calls: 32000,
        meanLatencyMs: 65.2,
        totalExecTimeMs: 2086400,
        totalTimePct: 18.2,
        sharedBlksHit: 128000,
        sharedBlksRead: 8400,
        antiPattern: "Unindexed query holds connection open longer",
        optimizationSuggestion: "Slow query execution exacerbates backend exhaustion by holding slots.",
        isSimulated: true,
      },
      {
        fingerprint: "a310c89e4f21",
        statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id",
        calls: 1200,
        meanLatencyMs: 114.0,
        totalExecTimeMs: 136800,
        totalTimePct: 9.1,
        sharedBlksHit: 8200,
        sharedBlksRead: 1400,
        antiPattern: "Heavy batch query blocking pool slot",
        optimizationSuggestion: "Route analytics to read replica or dedicated analytics pool.",
        isSimulated: true,
      },
    ],
    bottlenecks: [
      {
        id: "pool_100_percent",
        title: "Connection Pool Exhaustion (100/100 slots, 65 queued)",
        severity: "CRITICAL",
        impact: "65 clients stalled in PgBouncer pool wait queue; tail p99 latency spikes to 380.0ms.",
        rootCause: "Session pooling mode allows idle client connections to retain dedicated PostgreSQL backends.",
        recommendation: "Migrate PgBouncer to transaction pooling mode with recommended pool size of 24.",
      },
      {
        id: "tx_idle_slots",
        title: "Extended Idle In Transaction Connections",
        severity: "HIGH IMPACT",
        impact: "24 backends stuck in 'idle in transaction' state holding row locks.",
        rootCause: "Application network round-trips while transaction is active.",
        recommendation: "Configure idle_in_transaction_session_timeout = '10s'.",
      },
    ],
    benchmark: {
      baselineName: "session_pooling_saturated",
      candidateName: "transaction_pooling_optimized",
      baselineP50: 24.5,
      baselineP95: 118.0,
      baselineP99: 380.0,
      baselineQps: 2150.0,
      candidateP50: 3.4,
      candidateP95: 11.2,
      candidateP99: 22.0,
      candidateQps: 4620.0,
      p95DeltaPct: -90.5,
      qpsDeltaPct: 114.9,
      outcomeClassification: "MEASURED_IMPROVEMENT",
      summary: "Transaction pooling multiplexed 1,000 client connections over 24 dedicated PostgreSQL backends.",
      keyTakeaway: "Zero queued clients, 90.5% p95 latency reduction (-106.8ms), and more than doubled throughput.",
    },
  },

  optimization_comparison: {
    id: "optimization_comparison",
    name: "Optimization Comparison (Before vs After Evidence)",
    badge: "2,840 QPS vs 1,120 QPS • +153.6% Throughput",
    subtitle: "Empirical proof of composite index deployment, server-side prepared statements, and transaction pooling.",
    narrative:
      "Direct baseline-versus-candidate demonstration under identical synthetic concurrency (50 VUs, 10s duration). The candidate demonstrates an 85.6% p95 latency reduction (from 54.2ms to 7.8ms), +153.6% throughput gain, and zero regression in query correctness.",
    kpis: {
      throughputQps: 2840.0,
      throughputDelta: { value: "+153.6% verified improvement", trend: "up", isPositiveGood: true },
      latencyP50Ms: 2.8,
      latencyP95Ms: 7.8,
      latencyP99Ms: 14.5,
      latencyDelta: { value: "-46.4ms latency reduction", trend: "down", isPositiveGood: true },
      bufferCacheHitRatio: 99.6,
      bufferCacheSubtext: "Optimal (99.6%) • Disk I/O eliminated by index",
      activeBackends: 24,
      maxConnections: 100,
      poolUtilizationPct: 24,
      pgbouncerQueueWait: 0,
      activeQueries: 18,
      lockWaits: 0,
      hostCpuPct: 32,
    },
    timeSeries: [
      { time: "14:00:00", throughputQps: 1120.0, latencyP50Ms: 14.2, latencyP95Ms: 54.2, latencyP99Ms: 110.0 },
      { time: "14:02:00", throughputQps: 1140.0, latencyP50Ms: 13.8, latencyP95Ms: 53.0, latencyP99Ms: 108.0 },
      { time: "14:04:00", throughputQps: 1100.0, latencyP50Ms: 14.5, latencyP95Ms: 55.4, latencyP99Ms: 115.0 },
      { time: "14:06:00", throughputQps: 2650.0, latencyP50Ms: 3.1, latencyP95Ms: 8.5, latencyP99Ms: 16.0 },
      { time: "14:08:00", throughputQps: 2810.0, latencyP50Ms: 2.9, latencyP95Ms: 8.0, latencyP99Ms: 15.0 },
      { time: "14:10:00", throughputQps: 2840.0, latencyP50Ms: 2.8, latencyP95Ms: 7.8, latencyP99Ms: 14.5 },
      { time: "14:12:00", throughputQps: 2850.0, latencyP50Ms: 2.8, latencyP95Ms: 7.7, latencyP99Ms: 14.2 },
      { time: "14:14:00", throughputQps: 2840.0, latencyP50Ms: 2.8, latencyP95Ms: 7.8, latencyP99Ms: 14.5 },
    ],
    queries: [
      {
        fingerprint: "f7d98b12e3a4",
        statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        calls: 160000,
        meanLatencyMs: 3.4,
        totalExecTimeMs: 544000,
        totalTimePct: 29.5,
        sharedBlksHit: 480000,
        sharedBlksRead: 120,
        antiPattern: undefined,
        optimizationSuggestion: "Verified: Index Scan using idx_events_user_created eliminates table scan and quicksort.",
        isSimulated: true,
      },
      {
        fingerprint: "3e55f01a7d62",
        statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
        calls: 420000,
        meanLatencyMs: 0.9,
        totalExecTimeMs: 378000,
        totalTimePct: 24.2,
        sharedBlksHit: 840000,
        sharedBlksRead: 10,
        antiPattern: undefined,
        optimizationSuggestion: "Prepared statement execution plan cached in session.",
        isSimulated: true,
      },
      {
        fingerprint: "8b72e11d09ca",
        statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        calls: 180000,
        meanLatencyMs: 2.8,
        totalExecTimeMs: 504000,
        totalTimePct: 32.5,
        sharedBlksHit: 360000,
        sharedBlksRead: 45,
        antiPattern: undefined,
        optimizationSuggestion: "Single row transaction committed immediately.",
        isSimulated: true,
      },
      {
        fingerprint: "a310c89e4f21",
        statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.created_at > NOW() - INTERVAL '7 days' GROUP BY c.id",
        calls: 4500,
        meanLatencyMs: 18.2,
        totalExecTimeMs: 81900,
        totalTimePct: 13.8,
        sharedBlksHit: 36000,
        sharedBlksRead: 420,
        antiPattern: undefined,
        optimizationSuggestion: "Search bounded by 7-day interval index scan.",
        isSimulated: true,
      },
    ],
    bottlenecks: [
      {
        id: "optim_verified",
        title: "All Top Bottlenecks Remediated & Proven",
        severity: "OPTIMIZED",
        impact: "Zero active critical bottlenecks. Cluster latency SLA fully met.",
        rootCause: "Composite index idx_events_user_created and PgBouncer transaction pooling operational.",
        recommendation: "Maintain automated CI regression gate to prevent reintroduction of sequential scans.",
      },
    ],
    benchmark: {
      baselineName: "baseline_unoptimized_v1",
      candidateName: "candidate_composite_index_and_pool_v2",
      baselineP50: 14.2,
      baselineP95: 54.2,
      baselineP99: 110.0,
      baselineQps: 1120.0,
      candidateP50: 2.8,
      candidateP95: 7.8,
      candidateP99: 14.5,
      candidateQps: 2840.0,
      p95DeltaPct: -85.6,
      qpsDeltaPct: 153.6,
      outcomeClassification: "MEASURED_IMPROVEMENT",
      summary: "EMPIRICAL PROOF OF OPTIMIZATION: Candidate delivers an 85.6% p95 latency reduction and +153.6% QPS gain.",
      keyTakeaway: "Index Scan on events and transaction pooling eliminated disk I/O and checkout delay. Production promotion recommended.",
    },
  },
};
