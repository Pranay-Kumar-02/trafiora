"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  GitCompare,
  HardDrive,
  Info,
  Layers,
  Play,
  RotateCw,
  Search,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { MetricCard } from "../components/ui/MetricCard";
import { TimeSeriesChart, DataPoint } from "../components/ui/TimeSeriesChart";

const TELEMETRY_SERIES: DataPoint[] = [
  { time: "20:30:00", throughputQps: 1220.4, latencyP95Ms: 14.8, latencyP50Ms: 4.2 },
  { time: "20:32:00", throughputQps: 1340.1, latencyP95Ms: 12.1, latencyP50Ms: 3.9 },
  { time: "20:34:00", throughputQps: 1450.8, latencyP95Ms: 10.4, latencyP50Ms: 3.6 },
  { time: "20:36:00", throughputQps: 1510.2, latencyP95Ms: 9.8, latencyP50Ms: 3.4 },
  { time: "20:38:00", throughputQps: 1480.0, latencyP95Ms: 8.45, latencyP50Ms: 3.2 },
  { time: "20:40:00", throughputQps: 1620.5, latencyP95Ms: 11.2, latencyP50Ms: 3.7 },
  { time: "20:42:00", throughputQps: 1580.3, latencyP95Ms: 9.1, latencyP50Ms: 3.3 },
  { time: "20:44:00", throughputQps: 1490.6, latencyP95Ms: 8.6, latencyP50Ms: 3.1 },
];

interface WorkloadQuery {
  fingerprint: string;
  statement: string;
  totalTimePct: number;
  calls: number;
  meanLatencyMs: number;
  antiPattern?: string;
}

const TOP_QUERIES: WorkloadQuery[] = [
  {
    fingerprint: "f7d98b12e3a4",
    statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    totalTimePct: 41.2,
    calls: 128450,
    meanLatencyMs: 18.4,
    antiPattern: "Missing composite index on (user_id, created_at)",
  },
  {
    fingerprint: "a310c89e4f21",
    statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id",
    totalTimePct: 24.6,
    calls: 4210,
    meanLatencyMs: 84.2,
    antiPattern: "HashAggregate on unbounded join",
  },
  {
    fingerprint: "8b72e11d09ca",
    statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
    totalTimePct: 15.3,
    calls: 89400,
    meanLatencyMs: 3.2,
  },
  {
    fingerprint: "3e55f01a7d62",
    statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
    totalTimePct: 11.8,
    calls: 210800,
    meanLatencyMs: 1.1,
  },
];

export default function OverviewPage() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [querySearch, setQuerySearch] = useState("");
  const [selectedQuery, setSelectedQuery] = useState<WorkloadQuery | null>(TOP_QUERIES[0]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/health")
      .then((res) => setApiOnline(res.ok))
      .catch(() => setApiOnline(false));
  }, []);

  const filteredQueries = TOP_QUERIES.filter(
    (q) =>
      q.statement.toLowerCase().includes(querySearch.toLowerCase()) ||
      q.fingerprint.toLowerCase().includes(querySearch.toLowerCase()) ||
      (q.antiPattern && q.antiPattern.toLowerCase().includes(querySearch.toLowerCase()))
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-50 flex items-center gap-2 font-mono">
            <span>DATABASE WORKLOAD INTELLIGENCE OVERVIEW</span>
          </h1>
          <p className="text-xs text-graphite-200 mt-0.5">
            Diagnostic observability, workload execution trends, and resource saturation for PostgreSQL target.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/canvas"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-graphite-800 hover:bg-graphite-750 border border-graphite-500 text-xs font-mono text-graphite-100 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-brand-teal" />
            <span>Architecture Canvas</span>
          </Link>
          <Link
            href="/experiments"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-teal hover:bg-brand-tealLight text-graphite-950 font-semibold text-xs font-mono transition-colors shadow-subtle"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>New Benchmark</span>
          </Link>
        </div>
      </div>

      {/* System Health Strip */}
      <div className="panel p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 border-r border-graphite-600/60 pr-2">
          <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-status-success" : "bg-status-error"}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-graphite-300">CONTROL PLANE</span>
            <span className="text-graphite-50 font-semibold">{apiOnline ? "Active (Port 8000)" : "Offline"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-graphite-600/60 pr-2">
          <Database className="w-4 h-4 text-brand-teal shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-graphite-300">TARGET DB STATUS</span>
            <span className="text-graphite-50 font-semibold">Offline (Sim Fallback)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-graphite-600/60 pr-2">
          <Shield className="w-4 h-4 text-status-warning shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-graphite-300">OPERATIONAL TIER</span>
            <span className="text-status-warning font-semibold">Tier 2: Authorized Bench</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-status-info shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-graphite-300">PROTECTION ENGINE</span>
            <span className="text-graphite-50 font-semibold">Pool Limit: 35 conn</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Query Throughput"
          value="1,480.2"
          unit="QPS"
          delta={{ value: "+12.4% vs baseline", isPositiveGood: true, trend: "up" }}
          source="pg_stat_statements"
          isSimulated={true}
        />
        <MetricCard
          label="Latency (p95)"
          value="8.45"
          unit="ms"
          delta={{ value: "-22.1% improvement", isPositiveGood: true, trend: "down" }}
          source="pg_stat_statements"
          isSimulated={true}
        />
        <MetricCard
          label="Buffer Cache Hit Ratio"
          value="99.2"
          unit="%"
          delta={{ value: "Stable (> 99%)", trend: "flat" }}
          source="pg_statio_user_tables"
          isSimulated={true}
        />
        <MetricCard
          label="Active Database Backends"
          value="28 / 35"
          unit="conn"
          delta={{ value: "80% of pool limit", trend: "up" }}
          source="pg_stat_activity"
          isSimulated={true}
        />
      </div>

      {/* Main Performance Chart & Saturation Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Primary Time-Series (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <TimeSeriesChart
            data={TELEMETRY_SERIES}
            title="Workload Execution Telemetry (Throughput & Latency)"
            source="pg_stat_statements (2m intervals)"
            isSimulated={true}
          />
        </div>

        {/* Right: Resource Saturation Context (1 col) */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
              Resource Saturation & Limits
            </h3>
            <span className="text-[10px] font-mono text-graphite-300">Live Guards</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {/* Active Connections */}
            <div className="space-y-1">
              <div className="flex justify-between text-graphite-200">
                <span>Active Server Connections:</span>
                <span className="text-graphite-50 font-bold tabular-nums">28 / 35 (80%)</span>
              </div>
              <div className="w-full bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-teal h-full rounded-full" style={{ width: "80%" }} />
              </div>
            </div>

            {/* PgBouncer Wait Queue */}
            <div className="space-y-1">
              <div className="flex justify-between text-graphite-200">
                <span>PgBouncer Client Queue Wait:</span>
                <span className="text-status-success font-bold tabular-nums">0 clients</span>
              </div>
              <div className="w-full bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-status-success h-full rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            {/* Host CPU Utilization */}
            <div className="space-y-1">
              <div className="flex justify-between text-graphite-200">
                <span>Database Host CPU Usage:</span>
                <span className="text-graphite-50 font-bold tabular-nums">18.4% (8 Cores)</span>
              </div>
              <div className="w-full bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-teal h-full rounded-full" style={{ width: "18.4%" }} />
              </div>
            </div>

            {/* Monitoring Overhead */}
            <div className="space-y-1">
              <div className="flex justify-between text-graphite-200">
                <span>Trafiora CPU Overhead:</span>
                <span className="text-brand-teal font-bold tabular-nums">0.58% (&lt; 1% Budget)</span>
              </div>
              <div className="w-full bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-teal h-full rounded-full" style={{ width: "29%" }} />
              </div>
            </div>

            {/* Lock Contention */}
            <div className="space-y-1">
              <div className="flex justify-between text-graphite-200">
                <span>Transaction Lock Waits:</span>
                <span className="text-status-success font-bold tabular-nums">0 waiting</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-graphite-850 border border-graphite-600 text-[11px] text-graphite-200 space-y-1">
            <span className="font-semibold text-graphite-50 block font-mono">Overload Circuit Breaker:</span>
            <p className="leading-relaxed">
              Max client queue wait is set to 5.0s. If queue depth exceeds 15 clients, adaptive backpressure sheds incoming reads.
            </p>
          </div>
        </div>
      </div>

      {/* Query Workload Table & Details */}
      <div className="panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-graphite-600 pb-3">
          <div>
            <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
              Top Workload Execution Impact Queries
            </h3>
            <span className="text-[11px] text-graphite-300">
              Aggregated from pg_stat_statements by cumulative execution time.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-graphite-300 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter statement or anti-pattern..."
                value={querySearch}
                onChange={(e) => setQuerySearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-graphite-850 border border-graphite-600 rounded text-xs text-graphite-100 placeholder:text-graphite-300 focus:outline-none focus:border-brand-teal w-64 font-mono"
              />
            </div>
            <Link
              href="/workload"
              className="text-xs font-mono text-brand-teal hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Queries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-graphite-600 text-[10px] text-graphite-300 uppercase">
                <th className="py-2 px-3">Fingerprint</th>
                <th className="py-2 px-3">Normalized Statement</th>
                <th className="py-2 px-3 text-right">Exec Impact</th>
                <th className="py-2 px-3 text-right">Calls</th>
                <th className="py-2 px-3 text-right">Mean Latency</th>
                <th className="py-2 px-3">Diagnostic Heuristic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-600/60">
              {filteredQueries.map((q) => (
                <tr
                  key={q.fingerprint}
                  onClick={() => setSelectedQuery(q)}
                  className={`cursor-pointer transition-colors ${
                    selectedQuery?.fingerprint === q.fingerprint
                      ? "bg-graphite-800 text-graphite-50"
                      : "hover:bg-graphite-850/60 text-graphite-200"
                  }`}
                >
                  <td className="py-2.5 px-3 text-brand-teal font-semibold">{q.fingerprint}</td>
                  <td className="py-2.5 px-3 max-w-md truncate font-sans text-xs text-graphite-100">
                    {q.statement}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-graphite-50">
                    {q.totalTimePct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-graphite-300">
                    {q.calls.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-graphite-100">
                    {q.meanLatencyMs.toFixed(1)} ms
                  </td>
                  <td className="py-2.5 px-3">
                    {q.antiPattern ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-status-warningSurface text-status-warning border border-status-warningBorder">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[200px]">{q.antiPattern}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-graphite-400">Optimal Index Scan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Latest Experiment Comparison & Actionable Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest Experiment Delta */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-brand-teal" />
              <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
                Latest Verified Benchmark Comparison
              </h3>
            </div>
            <Badge variant="healthy">IMPROVEMENT VERIFIED</Badge>
          </div>

          <div className="p-3 rounded bg-graphite-850 border border-graphite-600 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-graphite-300 text-[11px]">
              <span>Scenario: <strong className="text-graphite-100">Hot-Record Read Spikes (Zipfian)</strong></span>
              <span>Target: <strong className="text-graphite-100">Tier 2 Authorized</strong></span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-graphite-600/60">
              <div>
                <span className="text-[10px] text-graphite-300 block">BASELINE p95</span>
                <span className="text-sm font-bold text-graphite-100 tabular-nums">18.45 ms</span>
              </div>
              <div>
                <span className="text-[10px] text-graphite-300 block">CANDIDATE p95</span>
                <span className="text-sm font-bold text-brand-teal tabular-nums">12.10 ms</span>
              </div>
              <div>
                <span className="text-[10px] text-graphite-300 block">LATENCY DELTA</span>
                <span className="text-sm font-bold text-status-success tabular-nums">-34.4%</span>
              </div>
            </div>

            <p className="text-[11px] text-graphite-200 font-sans pt-1">
              Statistically significant improvement (p &lt; 0.001, Welch&apos;s t-test, N=2,500 transactions). Candidate composite index reduced shared buffer read blocks by 68%.
            </p>
          </div>

          <div className="flex justify-end">
            <Link
              href="/compare"
              className="text-xs font-mono text-brand-teal hover:underline flex items-center gap-1"
            >
              <span>Full A/B Distribution Evidence</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Actionable Diagnosis */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-warning" />
              <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
                Active Bottleneck Diagnosis
              </h3>
            </div>
            <span className="text-[10px] font-mono text-graphite-300">1 High &bull; 1 Medium</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded bg-graphite-850 border border-status-warningBorder/60 space-y-1">
              <div className="flex items-center justify-between font-mono">
                <span className="font-semibold text-status-warning">Sequential Scan on events table</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-status-warningSurface text-status-warning border border-status-warningBorder">
                  HIGH IMPACT
                </span>
              </div>
              <p className="text-graphite-200 text-[11px] leading-relaxed">
                Query <code className="text-brand-teal font-mono">f7d98b12e3a4</code> consumes 41.2% total time filtering by <code className="text-graphite-100 font-mono">user_id</code> and ordering by <code className="text-graphite-100 font-mono">created_at</code> without a matching composite index.
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-graphite-300">
                <span>Proposed: <code className="text-graphite-100 font-mono">CREATE INDEX CONCURRENTLY...</code></span>
                <Link href="/diagnosis" className="text-brand-teal hover:underline">
                  Inspect DDL & Risk &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
