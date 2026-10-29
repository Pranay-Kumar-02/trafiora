"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
  GitCompare,
  Layers,
  Play,
  RotateCw,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { TimeSeriesChart, DataPoint } from "@/components/ui/TimeSeriesChart";
import { apiClient } from "@/lib/api-client";

interface ActiveTargetStatus {
  has_connection: boolean;
  connection?: {
    id: string;
    name: string;
    host: string;
    port: number;
    database: string;
    operational_tier: string;
    status: string;
  } | null;
  telemetry?: {
    connected: boolean;
    status: string;
    measurement_source: string;
    buffer_cache_hit_ratio?: number | null;
    active_backends?: number | null;
    max_connections?: number | null;
    active_queries?: number | null;
    waiting_locks?: number | null;
    has_pg_stat_statements: boolean;
    cumulative_calls?: number | null;
    cumulative_exec_time_ms?: number | null;
    overall_avg_latency_ms?: number | null;
    is_simulated: boolean;
  };
}

interface LiveQuery {
  query_id: string;
  query: string;
  calls: number;
  total_exec_time_ms: number;
  mean_exec_time_ms: number;
  rows: number;
  shared_blks_hit: number;
  shared_blks_read: number;
}

interface WorkloadQuery {
  fingerprint: string;
  statement: string;
  totalTimePct: number;
  calls: number;
  meanLatencyMs: number;
  antiPattern?: string;
  isSimulated?: boolean;
}

const SIMULATED_QUERIES: WorkloadQuery[] = [
  {
    fingerprint: "f7d98b12e3a4",
    statement: "SELECT id, payload, created_at FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    totalTimePct: 41.2,
    calls: 128450,
    meanLatencyMs: 18.4,
    antiPattern: "Missing composite index on (user_id, created_at)",
    isSimulated: true,
  },
  {
    fingerprint: "a310c89e4f21",
    statement: "SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id",
    totalTimePct: 24.6,
    calls: 4210,
    meanLatencyMs: 84.2,
    antiPattern: "HashAggregate on unbounded join",
    isSimulated: true,
  },
  {
    fingerprint: "8b72e11d09ca",
    statement: "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
    totalTimePct: 15.3,
    calls: 89400,
    meanLatencyMs: 3.2,
    isSimulated: true,
  },
  {
    fingerprint: "3e55f01a7d62",
    statement: "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
    totalTimePct: 11.8,
    calls: 210800,
    meanLatencyMs: 1.1,
    isSimulated: true,
  },
];

const SIMULATED_TELEMETRY: DataPoint[] = [
  { time: "20:30:00", throughputQps: 1220.4, latencyP95Ms: 14.8, latencyP50Ms: 4.2 },
  { time: "20:32:00", throughputQps: 1340.1, latencyP95Ms: 12.1, latencyP50Ms: 3.9 },
  { time: "20:34:00", throughputQps: 1450.8, latencyP95Ms: 10.4, latencyP50Ms: 3.6 },
  { time: "20:36:00", throughputQps: 1510.2, latencyP95Ms: 9.8, latencyP50Ms: 3.4 },
  { time: "20:38:00", throughputQps: 1480.0, latencyP95Ms: 8.45, latencyP50Ms: 3.2 },
  { time: "20:40:00", throughputQps: 1620.5, latencyP95Ms: 11.2, latencyP50Ms: 3.7 },
  { time: "20:42:00", throughputQps: 1580.3, latencyP95Ms: 9.1, latencyP50Ms: 3.3 },
  { time: "20:44:00", throughputQps: 1490.6, latencyP95Ms: 8.6, latencyP50Ms: 3.1 },
];

export default function OverviewPage() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [activeTarget, setActiveTarget] = useState<ActiveTargetStatus | null>(null);
  const [liveQueries, setLiveQueries] = useState<LiveQuery[]>([]);
  const [hasPgStatStatements, setHasPgStatStatements] = useState<boolean>(false);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [querySearch, setQuerySearch] = useState("");
  const [selectedQuery, setSelectedQuery] = useState<WorkloadQuery | null>(null);
  const [showSimulatedQueries, setShowSimulatedQueries] = useState(false);
  const [showSimulatedChart, setShowSimulatedChart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 1. Health check
      const healthRes = await apiClient.get<{ status: string }>("/health").catch(() => null);
      setApiOnline(healthRes?.status === "ok");

      // 2. Active connection status & catalog telemetry
      const targetRes = await apiClient
        .get<ActiveTargetStatus>("/connections/active/status")
        .catch(() => null);
      setActiveTarget(targetRes);

      // 3. If connected, fetch pg_stat_statements queries
      if (targetRes?.has_connection && targetRes.connection?.id) {
        const queryRes = await apiClient
          .get<{
            has_pg_stat_statements: boolean;
            measurement_source: string;
            is_simulated: boolean;
            queries: LiveQuery[];
          }>(`/connections/${targetRes.connection.id}/queries`)
          .catch(() => null);

        if (queryRes) {
          setHasPgStatStatements(queryRes.has_pg_stat_statements);
          setLiveQueries(queryRes.queries || []);
        }
      } else {
        setLiveQueries([]);
        setHasPgStatStatements(false);
      }

      // 4. Fetch real recent experiments
      const expRes = await apiClient.get<any[]>("/experiments?limit=5").catch(() => []);
      if (Array.isArray(expRes)) {
        setExperiments(expRes);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Format queries for view
  const totalExecTime = liveQueries.reduce((sum, q) => sum + (q.total_exec_time_ms || 0), 0) || 1;
  const realFormattedQueries: WorkloadQuery[] = liveQueries.map((q) => ({
    fingerprint: q.query_id.slice(0, 12),
    statement: q.query,
    totalTimePct: Math.round(((q.total_exec_time_ms || 0) / totalExecTime) * 1000) / 10,
    calls: q.calls,
    meanLatencyMs: Math.round((q.mean_exec_time_ms || 0) * 100) / 100,
    antiPattern:
      q.shared_blks_read > 500
        ? `High Disk Read: ${q.shared_blks_read.toLocaleString()} blocks read from storage`
        : undefined,
    isSimulated: false,
  }));

  const activeQueriesList =
    realFormattedQueries.length > 0
      ? realFormattedQueries
      : showSimulatedQueries
      ? SIMULATED_QUERIES
      : [];

  const filteredQueries = activeQueriesList.filter(
    (q) =>
      q.statement.toLowerCase().includes(querySearch.toLowerCase()) ||
      q.fingerprint.toLowerCase().includes(querySearch.toLowerCase()) ||
      (q.antiPattern && q.antiPattern.toLowerCase().includes(querySearch.toLowerCase()))
  );

  // Derive real experiment metric if available
  const completedExperiments = experiments.filter((e) => e.status === "COMPLETED");
  const latestCompleted = completedExperiments[0];
  const baselineExp = completedExperiments.find((e) => e.is_baseline);
  const candidateExp = completedExperiments.find((e) => !e.is_baseline && e.baseline_id);

  // Time series data points from real completed experiments or empty
  const realChartPoints: DataPoint[] = completedExperiments
    .slice()
    .reverse()
    .map((e) => {
      const p95 = e.summary_metrics?.mean_p95 ?? e.summary_metrics?.latency_p95_ms;
      const p50 = e.summary_metrics?.latency_p50_ms;
      const qps = e.summary_metrics?.throughput_qps_avg ?? 0;
      const timeStr = e.completed_at
        ? new Date(e.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : e.name.slice(0, 8);
      return {
        time: timeStr,
        throughputQps: qps,
        latencyP95Ms: p95 ?? 0,
        latencyP50Ms: p50 ?? 0,
      };
    });

  const chartData = realChartPoints.length > 0 ? realChartPoints : showSimulatedChart ? SIMULATED_TELEMETRY : [];

  // Telemetry status
  const isTargetOnline = activeTarget?.has_connection && activeTarget.telemetry?.status === "ONLINE";
  const telemetry = activeTarget?.telemetry;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono">
            <span>DATABASE WORKLOAD INTELLIGENCE OVERVIEW</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5">
            Diagnostic observability, workload execution trends, and resource saturation for PostgreSQL target.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsLoading(true);
              fetchData();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D1014] hover:bg-[#12161C] border border-[#202630] hover:border-[#28323F] text-xs font-mono text-[#E8EAF0] transition-colors shadow-subtle"
            title="Refresh live telemetry from PostgreSQL catalog"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#4E9F8E] ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/canvas"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D1014] hover:bg-[#12161C] border border-[#202630] hover:border-[#28323F] text-xs font-mono text-[#E8EAF0] transition-colors shadow-subtle"
          >
            <Layers className="w-3.5 h-3.5 text-[#4E9F8E]" />
            <span>Architecture Canvas</span>
          </Link>
          <Link
            href="/experiments"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#12161C] hover:bg-[#191E25] border border-[#28323F] hover:border-[#364354] text-xs font-mono text-[#E8EAF0] font-medium transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <Play className="w-3 h-3 text-[#4E9F8E] fill-[#4E9F8E]" />
            <span>New Benchmark</span>
          </Link>
        </div>
      </div>

      {/* System Health Strip */}
      <div className="panel p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 border-r border-[#202630] pr-2">
          <span
            className={`w-2 h-2 rounded-full ${
              apiOnline === null ? "bg-[#626C79]" : apiOnline ? "bg-[#34D399]" : "bg-[#FB7185]"
            }`}
          />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">CONTROL PLANE</span>
            <span className="text-[#E8EAF0] font-semibold">
              {apiOnline === null ? "Probing..." : apiOnline ? "Active (/api/v1)" : "Offline"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-[#202630] pr-2">
          <Database className="w-4 h-4 text-[#4E9F8E] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">TARGET DB STATUS</span>
            <span className="text-[#E8EAF0] font-semibold truncate">
              {activeTarget?.has_connection
                ? isTargetOnline
                  ? `Online (${activeTarget.connection?.name})`
                  : `Offline (${activeTarget.connection?.name})`
                : "No Target Configured"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-[#202630] pr-2">
          <Shield className="w-4 h-4 text-[#FBBF24] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">OPERATIONAL TIER</span>
            <span className="text-[#FBBF24] font-semibold truncate max-w-[140px]">
              {activeTarget?.connection?.operational_tier
                ? activeTarget.connection.operational_tier.replace(/_/g, " ").toUpperCase()
                : "None Configured"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#CBD5E1] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">PG_STAT_STATEMENTS</span>
            <span className="text-[#E8EAF0] font-semibold">
              {isTargetOnline
                ? hasPgStatStatements
                  ? "Installed & Active"
                  : "Not Installed"
                : "Unavailable (Offline)"}
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Throughput */}
        <MetricCard
          label="Query Throughput"
          value={
            latestCompleted?.summary_metrics?.throughput_qps_avg != null
              ? latestCompleted.summary_metrics.throughput_qps_avg.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : telemetry?.cumulative_calls != null
              ? telemetry.cumulative_calls.toLocaleString()
              : "—"
          }
          unit={
            latestCompleted?.summary_metrics?.throughput_qps_avg != null
              ? "QPS"
              : telemetry?.cumulative_calls != null
              ? "calls"
              : undefined
          }
          subtext={
            latestCompleted?.summary_metrics?.throughput_qps_avg != null
              ? `Benchmark: ${latestCompleted.name}`
              : telemetry?.cumulative_calls != null
              ? "Cumulative pg_stat_statements"
              : "Unavailable (No Benchmark Executed)"
          }
          source={
            latestCompleted?.summary_metrics?.throughput_qps_avg != null
              ? "pgbench (Real Benchmark Run)"
              : telemetry?.cumulative_calls != null
              ? "pg_stat_statements"
              : "UNAVAILABLE"
          }
          isSimulated={false}
        />

        {/* Metric 2: Latency p95 */}
        <MetricCard
          label="Latency (p95)"
          value={
            latestCompleted
              ? latestCompleted.summary_metrics?.mean_p95 != null
                ? (latestCompleted.summary_metrics.mean_p95 as number).toFixed(2)
                : latestCompleted.summary_metrics?.latency_p95_ms != null
                ? (latestCompleted.summary_metrics.latency_p95_ms as number).toFixed(2)
                : "Unavailable"
              : telemetry?.overall_avg_latency_ms != null
              ? telemetry.overall_avg_latency_ms.toFixed(2)
              : "—"
          }
          unit={
            (latestCompleted && (latestCompleted.summary_metrics?.mean_p95 != null || latestCompleted.summary_metrics?.latency_p95_ms != null)) ||
            telemetry?.overall_avg_latency_ms != null
              ? "ms"
              : undefined
          }
          subtext={
            latestCompleted
              ? latestCompleted.summary_metrics?.mean_p95 != null
                ? `Measured across ${latestCompleted.summary_metrics.repetitions_completed || 1} reps`
                : latestCompleted.summary_metrics?.latency_p95_ms != null
                ? "Measured from transaction logs"
                : "Transaction log unrecorded"
              : telemetry?.overall_avg_latency_ms != null
              ? "Average latency (all statements)"
              : "Unavailable (No Benchmark Run)"
          }
          source={
            latestCompleted?.summary_metrics?.mean_p95 != null || latestCompleted?.summary_metrics?.latency_p95_ms != null
              ? "pgbench -l transaction log"
              : telemetry?.overall_avg_latency_ms != null
              ? "pg_stat_statements"
              : "UNAVAILABLE"
          }
          isSimulated={false}
        />

        {/* Metric 3: Buffer Cache Hit Ratio */}
        <MetricCard
          label="Buffer Cache Hit Ratio"
          value={
            telemetry?.buffer_cache_hit_ratio != null
              ? telemetry.buffer_cache_hit_ratio.toFixed(1)
              : "—"
          }
          unit={telemetry?.buffer_cache_hit_ratio != null ? "%" : undefined}
          subtext={
            isTargetOnline
              ? telemetry?.buffer_cache_hit_ratio != null && telemetry.buffer_cache_hit_ratio >= 99
                ? "Optimal (> 99%)"
                : "Live Catalog Measurement"
              : "Target DB Disconnected"
          }
          source={isTargetOnline ? "pg_stat_database" : "POSTGRES_CATALOG (OFFLINE)"}
          isSimulated={false}
        />

        {/* Metric 4: Active Database Backends */}
        <MetricCard
          label="Active Database Backends"
          value={
            telemetry?.active_backends != null
              ? `${telemetry.active_backends} / ${telemetry.max_connections || 100}`
              : "—"
          }
          unit={telemetry?.active_backends != null ? "conn" : undefined}
          subtext={
            isTargetOnline
              ? `${telemetry?.active_queries || 0} active queries, ${telemetry?.waiting_locks || 0} lock waits`
              : "Target DB Disconnected"
          }
          source={isTargetOnline ? "pg_stat_activity" : "POSTGRES_CATALOG (OFFLINE)"}
          isSimulated={false}
        />
      </div>

      {/* Main Performance Chart & Saturation Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Primary Time-Series (2 cols) */}
        <div className="lg:col-span-2 space-y-2">
          <TimeSeriesChart
            data={chartData}
            title={
              realChartPoints.length > 0
                ? "Benchmark Execution Telemetry (Throughput & Latency)"
                : "Workload Execution Telemetry"
            }
            source={
              realChartPoints.length > 0
                ? "Trafiora Benchmark Runs (Genuine Measurements)"
                : showSimulatedChart
                ? "Simulated Demo Profile"
                : "UNAVAILABLE (No Runs)"
            }
            isSimulated={realChartPoints.length === 0 && showSimulatedChart}
          />
          {realChartPoints.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowSimulatedChart(!showSimulatedChart)}
                className="text-[11px] font-mono text-[#626C79] hover:text-[#CBD5E1] transition-colors underline"
              >
                {showSimulatedChart ? "Hide Demo Trace" : "Preview Simulated Demo Trace"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Resource Saturation Context (1 col) */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight">
              Resource Saturation & Limits
            </h3>
            <span className="text-[10px] font-mono text-[#626C79]">
              {isTargetOnline ? "Live Catalog" : "Unavailable"}
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {/* Active Connections */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>Active Server Connections:</span>
                <span className="text-[#E8EAF0] font-bold tabular-nums">
                  {telemetry?.active_backends != null
                    ? `${telemetry.active_backends} / ${telemetry.max_connections || 100} (${Math.round(
                        (telemetry.active_backends / (telemetry.max_connections || 100)) * 100
                      )}%)`
                    : "Unavailable (Offline)"}
                </span>
              </div>
              <div className="w-full bg-[#050607] border border-[#202630] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#4E9F8E] h-full rounded-full transition-all"
                  style={{
                    width:
                      telemetry?.active_backends != null
                        ? `${Math.min(
                            100,
                            Math.round((telemetry.active_backends / (telemetry.max_connections || 100)) * 100)
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* PgBouncer / Connection Pool */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>PgBouncer Client Queue Wait:</span>
                <span className="text-[#626C79] font-bold tabular-nums">
                  {isTargetOnline ? "0 clients" : "Unavailable"}
                </span>
              </div>
              <div className="w-full bg-[#050607] border border-[#202630] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#34D399] h-full rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            {/* Host CPU Utilization */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>Database Host CPU Usage:</span>
                <span className="text-[#626C79] font-bold tabular-nums">
                  Unavailable (Requires host cgroups v2)
                </span>
              </div>
              <div className="w-full bg-[#050607] border border-[#202630] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#12161C] h-full rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            {/* Lock Contention */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>Transaction Lock Waits:</span>
                <span
                  className={`font-bold tabular-nums ${
                    (telemetry?.waiting_locks || 0) > 0 ? "text-[#FBBF24]" : "text-[#34D399]"
                  }`}
                >
                  {telemetry?.waiting_locks != null ? `${telemetry.waiting_locks} waiting` : "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#090B0E] border border-[#202630] text-[11px] text-[#929AA6] space-y-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <span className="font-semibold text-[#E8EAF0] block font-mono">Overload Circuit Breaker:</span>
            <p className="leading-relaxed">
              Target operational tier:{" "}
              <strong className="text-[#CBD5E1] font-mono">
                {activeTarget?.connection?.operational_tier || "UNCONFIGURED"}
              </strong>
              . Safe observation and execution boundaries are strictly enforced.
            </p>
          </div>
        </div>
      </div>

      {/* Query Workload Table & Details */}
      <div className="panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202630] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight">
                Top Workload Execution Impact Queries
              </h3>
              {realFormattedQueries.length > 0 ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0A1912] text-[#34D399] border border-[#173B2B]">
                  LIVE PG_STAT_STATEMENTS
                </span>
              ) : showSimulatedQueries ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12161C] text-[#929AA6] border border-[#202630]">
                  SIMULATED DEMO PROFILE
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090B0E] text-[#626C79] border border-[#202630]">
                  UNAVAILABLE
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#626C79]">
              {realFormattedQueries.length > 0
                ? "Queried live from target database pg_stat_statements extension."
                : "Shows queries sorted by cumulative execution time when target is active with pg_stat_statements."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#626C79] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter statement or anti-pattern..."
                value={querySearch}
                onChange={(e) => setQuerySearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#090B0E] border border-[#202630] rounded text-xs text-[#E8EAF0] placeholder:text-[#626C79] focus:outline-none focus:border-[#364354] w-64 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              />
            </div>
            <Link
              href="/workload"
              className="text-xs font-mono text-[#CBD5E1] hover:text-[#E8EAF0] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Workload Explorer</span>
              <ExternalLink className="w-3 h-3 text-[#626C79]" />
            </Link>
          </div>
        </div>

        {/* Empty State when no real queries and not showing demo */}
        {activeQueriesList.length === 0 ? (
          <div className="p-8 text-center space-y-2 border border-[#202630] rounded bg-[#090B0E]">
            <Database className="w-8 h-8 text-[#626C79] mx-auto" />
            <div className="text-xs font-mono text-[#E8EAF0] font-semibold">
              {activeTarget?.has_connection
                ? isTargetOnline
                  ? hasPgStatStatements
                    ? "No query statistics recorded yet in pg_stat_statements."
                    : "pg_stat_statements extension is not installed or enabled on the target database."
                  : "PostgreSQL target is currently offline or unreachable."
                : "No database target connection configured."}
            </div>
            <p className="text-xs text-[#626C79] max-w-md mx-auto">
              {activeTarget?.has_connection
                ? "Run a benchmark or execute database transactions to populate live query telemetry."
                : "Register and connect a PostgreSQL target in the Connections view to inspect queries."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/connections"
                className="px-3 py-1 bg-[#12161C] hover:bg-[#191E25] border border-[#202630] rounded text-xs font-mono text-[#E8EAF0] transition-colors"
              >
                Manage Connections
              </Link>
              <button
                onClick={() => setShowSimulatedQueries(true)}
                className="px-3 py-1 bg-[#12161C] hover:bg-[#191E25] border border-[#202630] rounded text-xs font-mono text-[#CBD5E1] transition-colors"
              >
                Preview Simulated Demo Queries
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#202630] text-[10px] text-[#626C79] uppercase">
                  <th className="py-2 px-3">Fingerprint</th>
                  <th className="py-2 px-3">Normalized Statement</th>
                  <th className="py-2 px-3 text-right">Exec Impact</th>
                  <th className="py-2 px-3 text-right">Calls</th>
                  <th className="py-2 px-3 text-right">Mean Latency</th>
                  <th className="py-2 px-3">Diagnostic Heuristic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202630]/60">
                {filteredQueries.map((q) => (
                  <tr
                    key={q.fingerprint}
                    onClick={() => setSelectedQuery(q)}
                    className={`cursor-pointer transition-colors ${
                      selectedQuery?.fingerprint === q.fingerprint
                        ? "bg-[#12161C] text-[#E8EAF0]"
                        : "hover:bg-[#12161C]/50 text-[#929AA6]"
                    }`}
                  >
                    <td className="py-2.5 px-3 text-[#CBD5E1] font-semibold flex items-center gap-1.5">
                      <span>{q.fingerprint}</span>
                      {q.isSimulated && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#090B0E] text-[#626C79] border border-[#202630]">
                          SIM
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-md truncate font-sans text-xs text-[#E8EAF0]">
                      {q.statement}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-[#E8EAF0]">
                      {q.totalTimePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#626C79]">
                      {q.calls.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#CBD5E1]">
                      {q.meanLatencyMs.toFixed(1)} ms
                    </td>
                    <td className="py-2.5 px-3">
                      {q.antiPattern ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#191408] text-[#FBBF24] border border-[#38290E]">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[200px]">{q.antiPattern}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#626C79]">Normal Scan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Grid: Latest Experiment Comparison & Actionable Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest Experiment Delta */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#4E9F8E]" />
              <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight">
                Latest Benchmark Comparison
              </h3>
            </div>
            {candidateExp ? (
              <Badge
                variant={
                  candidateExp.outcome_classification === "MEASURED_IMPROVEMENT"
                    ? "healthy"
                    : candidateExp.outcome_classification === "REGRESSION_DETECTED"
                    ? "critical"
                    : "warning"
                }
              >
                {candidateExp.outcome_classification || "PENDING"}
              </Badge>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12161C] text-[#626C79] border border-[#202630]">
                SIMULATED REFERENCE
              </span>
            )}
          </div>

          {candidateExp && baselineExp ? (
            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between text-[#626C79] text-[11px]">
                <span>
                  Candidate: <strong className="text-[#E8EAF0]">{candidateExp.name}</strong>
                </span>
                <span>
                  Baseline: <strong className="text-[#E8EAF0]">{baselineExp.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#202630]">
                <div>
                  <span className="text-[10px] text-[#626C79] block">BASELINE p95</span>
                  <span className="text-sm font-bold text-[#E8EAF0] tabular-nums">
                    {baselineExp.summary_metrics?.mean_p95 != null
                      ? `${(baselineExp.summary_metrics.mean_p95 as number).toFixed(2)} ms`
                      : baselineExp.summary_metrics?.latency_p95_ms != null
                      ? `${(baselineExp.summary_metrics.latency_p95_ms as number).toFixed(2)} ms`
                      : "Unavailable"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">CANDIDATE p95</span>
                  <span className="text-sm font-bold text-[#4E9F8E] tabular-nums">
                    {candidateExp.summary_metrics?.mean_p95 != null
                      ? `${(candidateExp.summary_metrics.mean_p95 as number).toFixed(2)} ms`
                      : candidateExp.summary_metrics?.latency_p95_ms != null
                      ? `${(candidateExp.summary_metrics.latency_p95_ms as number).toFixed(2)} ms`
                      : "Unavailable"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">STATUS</span>
                  <span className="text-xs font-bold text-[#CBD5E1]">
                    {candidateExp.outcome_classification}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#929AA6] font-sans pt-1">
                Completed {candidateExp.repetitions_completed} repetitions. Target:{" "}
                {activeTarget?.connection?.name || "PostgreSQL Target"}.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between text-[#626C79] text-[11px]">
                <span>
                  Scenario: <strong className="text-[#E8EAF0]">Hot-Record Read Spikes [SIMULATED]</strong>
                </span>
                <span>
                  Target: <strong className="text-[#E8EAF0]">Reference Benchmark Model</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#202630]">
                <div>
                  <span className="text-[10px] text-[#626C79] block">BASELINE p95</span>
                  <span className="text-sm font-bold text-[#CBD5E1] tabular-nums">18.45 ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">CANDIDATE p95</span>
                  <span className="text-sm font-bold text-[#4E9F8E] tabular-nums">12.10 ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">LATENCY DELTA</span>
                  <span className="text-sm font-bold text-[#34D399] tabular-nums">-34.4%</span>
                </div>
              </div>

              <p className="text-[11px] text-[#626C79] font-sans pt-1 italic">
                Reference demonstration baseline. Launch a candidate benchmark against a registered target to produce real comparative distributions.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Link
              href="/compare"
              className="text-xs font-mono text-[#CBD5E1] hover:text-[#E8EAF0] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Full A/B Distribution Evidence</span>
              <ArrowRight className="w-3 h-3 text-[#626C79]" />
            </Link>
          </div>
        </div>

        {/* Actionable Diagnosis */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
              <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight">
                Active Bottleneck Diagnosis
              </h3>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12161C] text-[#626C79] border border-[#202630]">
              SIMULATED HEURISTIC
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded bg-[#090B0E] border border-[#38290E] space-y-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between font-mono">
                <span className="font-semibold text-[#FBBF24]">Sequential Scan on events table</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#191408] text-[#FBBF24] border border-[#38290E]">
                  HIGH IMPACT
                </span>
              </div>
              <p className="text-[#929AA6] text-[11px] leading-relaxed">
                Query <code className="text-[#CBD5E1] font-mono">f7d98b12e3a4</code> consumes 41.2% total time filtering by <code className="text-[#E8EAF0] font-mono">user_id</code> and ordering by <code className="text-[#E8EAF0] font-mono">created_at</code> without a matching composite index.
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#626C79]">
                <span>Proposed: <code className="text-[#CBD5E1] font-mono">CREATE INDEX CONCURRENTLY...</code></span>
                <Link href="/diagnosis" className="text-[#CBD5E1] hover:text-[#E8EAF0] hover:underline transition-colors">
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
