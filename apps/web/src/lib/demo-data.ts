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

export interface DemoScenario {
  id: "normal" | "traffic_spike" | "query_regression";
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
};
