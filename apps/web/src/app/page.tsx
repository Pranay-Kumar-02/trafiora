"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Flame,
  GitCompare,
  Info,
  Layers,
  Play,
  RotateCw,
  Search,
  Server,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { TimeSeriesChart, DataPoint } from "@/components/ui/TimeSeriesChart";
import { apiClient } from "@/lib/api-client";
import {
  DEMO_SCENARIOS,
  DemoScenario,
  DemoWorkloadQuery,
  DemoBottleneck,
} from "@/lib/demo-data";

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

interface UnifiedWorkloadQuery {
  fingerprint: string;
  statement: string;
  totalTimePct: number;
  calls: number;
  meanLatencyMs: number;
  totalExecTimeMs: number;
  antiPattern?: string;
  optimizationSuggestion?: string;
  sharedBlksHit?: number;
  sharedBlksRead?: number;
  isSimulated: boolean;
}

export default function OverviewPage() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [activeTarget, setActiveTarget] = useState<ActiveTargetStatus | null>(null);
  const [liveQueries, setLiveQueries] = useState<LiveQuery[]>([]);
  const [hasPgStatStatements, setHasPgStatStatements] = useState<boolean>(false);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Demo Mode state
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<"normal" | "traffic_spike" | "query_regression">("normal");
  const [querySearch, setQuerySearch] = useState<string>("");
  const [selectedQuery, setSelectedQuery] = useState<UnifiedWorkloadQuery | null>(null);

  const currentDemoScenario: DemoScenario = DEMO_SCENARIOS[selectedScenarioKey];

  const fetchData = async () => {
    try {
      // 1. Health check - unified with header
      const healthRes = await apiClient
        .get<{ status: string; healthy?: boolean; ok?: boolean }>("/health")
        .catch(() => null);
      const isHealthy =
        healthRes?.status === "healthy" || healthRes?.status === "ok" || healthRes?.healthy === true;
      setApiOnline(isHealthy);

      // 2. Active connection status & catalog telemetry
      const targetRes = await apiClient
        .get<ActiveTargetStatus>("/connections/active/status")
        .catch(() => null);
      setActiveTarget(targetRes);

      // If a real connection is active, default demoMode to false unless user explicitly turns it on
      if (targetRes?.has_connection && targetRes.connection?.id) {
        // Query pg_stat_statements
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

      // 3. Recent experiments
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
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Format real queries if target is active
  const realTotalTime = liveQueries.reduce((sum, q) => sum + (q.total_exec_time_ms || 0), 0) || 1;
  const realFormattedQueries: UnifiedWorkloadQuery[] = useMemo(() => {
    return liveQueries.map((q) => ({
      fingerprint: q.query_id.slice(0, 12),
      statement: q.query,
      totalTimePct: Math.round(((q.total_exec_time_ms || 0) / realTotalTime) * 1000) / 10,
      calls: q.calls,
      meanLatencyMs: Math.round((q.mean_exec_time_ms || 0) * 100) / 100,
      totalExecTimeMs: Math.round(q.total_exec_time_ms || 0),
      antiPattern:
        q.shared_blks_read > 500
          ? `High Disk Read: ${q.shared_blks_read.toLocaleString()} blocks read from storage`
          : undefined,
      optimizationSuggestion:
        q.shared_blks_read > 500
          ? "Investigate query execution plan with EXPLAIN (ANALYZE, BUFFERS) to determine if index scan can eliminate disk I/O."
          : undefined,
      sharedBlksHit: q.shared_blks_hit,
      sharedBlksRead: q.shared_blks_read,
      isSimulated: false,
    }));
  }, [liveQueries, realTotalTime]);

  // Determine active queries list
  const activeQueriesList: UnifiedWorkloadQuery[] = useMemo(() => {
    if (demoMode) {
      return currentDemoScenario.queries.map((q) => ({
        ...q,
        isSimulated: true,
      }));
    }
    return realFormattedQueries;
  }, [demoMode, currentDemoScenario, realFormattedQueries]);

  const filteredQueries = useMemo(() => {
    return activeQueriesList.filter(
      (q) =>
        q.statement.toLowerCase().includes(querySearch.toLowerCase()) ||
        q.fingerprint.toLowerCase().includes(querySearch.toLowerCase()) ||
        (q.antiPattern && q.antiPattern.toLowerCase().includes(querySearch.toLowerCase()))
    );
  }, [activeQueriesList, querySearch]);

  // Chart data
  const chartData: DataPoint[] = useMemo(() => {
    if (demoMode) {
      return currentDemoScenario.timeSeries;
    }
    const completed = experiments.filter((e) => e.status === "COMPLETED");
    if (completed.length > 0) {
      return completed
        .slice()
        .reverse()
        .map((e) => {
          const p95 = e.summary_metrics?.mean_p95 ?? e.summary_metrics?.latency_p95_ms ?? 0;
          const p50 = e.summary_metrics?.latency_p50_ms ?? p95 * 0.4;
          const p99 = e.summary_metrics?.latency_p99_ms ?? p95 * 1.5;
          const qps = e.summary_metrics?.throughput_qps_avg ?? 0;
          const timeStr = e.completed_at
            ? new Date(e.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : e.name.slice(0, 8);
          return {
            time: timeStr,
            throughputQps: qps,
            latencyP95Ms: p95,
            latencyP50Ms: p50,
            latencyP99Ms: p99,
          };
        });
    }
    return [];
  }, [demoMode, currentDemoScenario, experiments]);

  const isTargetOnline = activeTarget?.has_connection && activeTarget.telemetry?.status === "ONLINE";
  const telemetry = activeTarget?.telemetry;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-10">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-[#4E9F8E]" />
              <span>DATABASE WORKLOAD INTELLIGENCE OVERVIEW</span>
            </h1>
            {demoMode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#191408] text-[#FBBF24] border border-[#38290E] font-semibold tracking-wide">
                DEMO MODE ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-[#929AA6] mt-0.5">
            Diagnostic observability, workload execution trends, and resource saturation for PostgreSQL target.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors shadow-subtle ${
              demoMode
                ? "bg-[#191408] text-[#FBBF24] border-[#38290E] hover:bg-[#231B0B]"
                : "bg-[#0D1014] text-[#929AA6] border-[#202630] hover:text-[#E8EAF0] hover:border-[#28323F]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>{demoMode ? "Exit Demo Mode" : "Load Demo Scenario"}</span>
          </button>

          <Link
            href="/canvas"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D1014] hover:bg-[#12161C] border border-[#202630] hover:border-[#28323F] text-xs font-mono text-[#E8EAF0] transition-colors shadow-subtle"
          >
            <Layers className="w-3.5 h-3.5 text-[#4E9F8E]" />
            <span>Canvas</span>
          </Link>
          <Link
            href="/experiments"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#12161C] hover:bg-[#191E25] border border-[#28323F] hover:border-[#364354] text-xs font-mono text-[#E8EAF0] font-medium transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <Play className="w-3 h-3 text-[#4E9F8E] fill-[#4E9F8E]" />
            <span>Run Benchmark</span>
          </Link>
        </div>
      </div>

      {/* Persistent, Unmistakable Demo Banner when in Demo Mode */}
      {demoMode && (
        <div className="p-3.5 rounded-md bg-[#0D0B06] border border-[#38290E] shadow-[0_4px_20px_rgba(0,0,0,0.6)] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-[#38290E]/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FBBF24] text-[#090B0E] tracking-wider uppercase">
                DEMO DATA — SIMULATED
              </span>
              <span className="text-xs font-mono text-[#CBD5E1] font-semibold">
                Interactive Demonstration Workload Environment
              </span>
            </div>

            {/* Scenario Switcher Controls */}
            <div className="flex items-center gap-1.5 bg-[#050607] p-1 rounded border border-[#202630] text-xs font-mono overflow-x-auto">
              <span className="text-[10px] text-[#626C79] uppercase px-1.5 font-bold">Scenario:</span>
              <button
                onClick={() => setSelectedScenarioKey("normal")}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors font-medium flex items-center gap-1.5 shrink-0 ${
                  selectedScenarioKey === "normal"
                    ? "bg-[#12161C] text-[#34D399] border border-[#173B2B] shadow-sm"
                    : "text-[#626C79] hover:text-[#929AA6]"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>1. Normal Traffic</span>
              </button>
              <button
                onClick={() => setSelectedScenarioKey("traffic_spike")}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors font-medium flex items-center gap-1.5 shrink-0 ${
                  selectedScenarioKey === "traffic_spike"
                    ? "bg-[#191408] text-[#FBBF24] border border-[#38290E] shadow-sm"
                    : "text-[#626C79] hover:text-[#929AA6]"
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>2. Traffic Spike (Pool Saturation)</span>
              </button>
              <button
                onClick={() => setSelectedScenarioKey("query_regression")}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors font-medium flex items-center gap-1.5 shrink-0 ${
                  selectedScenarioKey === "query_regression"
                    ? "bg-[#190B0E] text-[#FB7185] border border-[#38141B] shadow-sm"
                    : "text-[#626C79] hover:text-[#929AA6]"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>3. Query Regression</span>
              </button>
            </div>
          </div>

          {/* Performance Narrative */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono gap-2 text-[#929AA6]">
            <p className="leading-relaxed">
              <strong className="text-[#E8EAF0]">{currentDemoScenario.name}:</strong>{" "}
              <span>{currentDemoScenario.narrative}</span>
            </p>
            <span className="text-[11px] text-[#626C79] shrink-0 font-mono italic">
              Deterministic scenario profile
            </span>
          </div>
        </div>
      )}

      {/* System Health Strip */}
      <div className="panel p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        {/* Control Plane Status */}
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

        {/* Target DB Status */}
        <div className="flex items-center gap-2 border-r border-[#202630] pr-2">
          <Database className="w-4 h-4 text-[#4E9F8E] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">TARGET DB STATUS</span>
            <span className="text-[#E8EAF0] font-semibold truncate">
              {demoMode ? (
                <span className="text-[#FBBF24]">Demo Workload Model</span>
              ) : activeTarget?.has_connection ? (
                isTargetOnline ? (
                  `Online (${activeTarget.connection?.name})`
                ) : (
                  `Offline (${activeTarget.connection?.name})`
                )
              ) : (
                "No Target Configured"
              )}
            </span>
          </div>
        </div>

        {/* Operational Tier */}
        <div className="flex items-center gap-2 border-r border-[#202630] pr-2">
          <Shield className="w-4 h-4 text-[#FBBF24] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">OPERATIONAL TIER</span>
            <span className="text-[#FBBF24] font-semibold truncate max-w-[140px]">
              {demoMode
                ? "DEMO SIMULATION"
                : activeTarget?.connection?.operational_tier
                ? activeTarget.connection.operational_tier.replace(/_/g, " ").toUpperCase()
                : "None Configured"}
            </span>
          </div>
        </div>

        {/* pg_stat_statements */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#CBD5E1] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#626C79]">PG_STAT_STATEMENTS</span>
            <span className="text-[#E8EAF0] font-semibold">
              {demoMode
                ? "Simulated Catalog"
                : isTargetOnline
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
            demoMode
              ? currentDemoScenario.kpis.throughputQps.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : experiments[0]?.summary_metrics?.throughput_qps_avg != null
              ? experiments[0].summary_metrics.throughput_qps_avg.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : telemetry?.cumulative_calls != null
              ? telemetry.cumulative_calls.toLocaleString()
              : "—"
          }
          unit={
            demoMode
              ? "QPS"
              : experiments[0]?.summary_metrics?.throughput_qps_avg != null
              ? "QPS"
              : telemetry?.cumulative_calls != null
              ? "calls"
              : undefined
          }
          delta={demoMode ? currentDemoScenario.kpis.throughputDelta : undefined}
          subtext={
            demoMode
              ? currentDemoScenario.subtitle
              : experiments[0]?.summary_metrics?.throughput_qps_avg != null
              ? `Benchmark: ${experiments[0].name}`
              : telemetry?.cumulative_calls != null
              ? "Cumulative pg_stat_statements"
              : "Unavailable (No Benchmark Executed)"
          }
          source={
            demoMode
              ? `SIMULATED: ${currentDemoScenario.name}`
              : experiments[0]?.summary_metrics?.throughput_qps_avg != null
              ? "pgbench (Real Benchmark Run)"
              : telemetry?.cumulative_calls != null
              ? "pg_stat_statements"
              : "UNAVAILABLE"
          }
          isSimulated={demoMode}
        />

        {/* Metric 2: Latency p95 / Percentiles */}
        <MetricCard
          label="Latency (p95)"
          value={
            demoMode
              ? currentDemoScenario.kpis.latencyP95Ms.toFixed(2)
              : experiments[0]
              ? experiments[0].summary_metrics?.mean_p95 != null
                ? (experiments[0].summary_metrics.mean_p95 as number).toFixed(2)
                : experiments[0].summary_metrics?.latency_p95_ms != null
                ? (experiments[0].summary_metrics.latency_p95_ms as number).toFixed(2)
                : "Unavailable"
              : telemetry?.overall_avg_latency_ms != null
              ? telemetry.overall_avg_latency_ms.toFixed(2)
              : "—"
          }
          unit={
            demoMode ||
            (experiments[0] && (experiments[0].summary_metrics?.mean_p95 != null || experiments[0].summary_metrics?.latency_p95_ms != null)) ||
            telemetry?.overall_avg_latency_ms != null
              ? "ms"
              : undefined
          }
          delta={demoMode ? currentDemoScenario.kpis.latencyDelta : undefined}
          subtext={
            demoMode
              ? `p50: ${currentDemoScenario.kpis.latencyP50Ms.toFixed(1)}ms | p99: ${currentDemoScenario.kpis.latencyP99Ms.toFixed(1)}ms`
              : experiments[0]
              ? experiments[0].summary_metrics?.mean_p95 != null
                ? `Measured across ${experiments[0].summary_metrics.repetitions_completed || 1} reps`
                : "Measured from transaction logs"
              : telemetry?.overall_avg_latency_ms != null
              ? "Average latency (all statements)"
              : "Unavailable (No Benchmark Run)"
          }
          source={
            demoMode
              ? `SIMULATED: ${currentDemoScenario.name}`
              : experiments[0]?.summary_metrics?.mean_p95 != null || experiments[0]?.summary_metrics?.latency_p95_ms != null
              ? "pgbench -l transaction log"
              : telemetry?.overall_avg_latency_ms != null
              ? "pg_stat_statements"
              : "UNAVAILABLE"
          }
          isSimulated={demoMode}
        />

        {/* Metric 3: Buffer Cache Hit Ratio */}
        <MetricCard
          label="Buffer Cache Hit Ratio"
          value={
            demoMode
              ? currentDemoScenario.kpis.bufferCacheHitRatio.toFixed(1)
              : telemetry?.buffer_cache_hit_ratio != null
              ? telemetry.buffer_cache_hit_ratio.toFixed(1)
              : "—"
          }
          unit={demoMode || telemetry?.buffer_cache_hit_ratio != null ? "%" : undefined}
          subtext={
            demoMode
              ? currentDemoScenario.kpis.bufferCacheSubtext
              : isTargetOnline
              ? telemetry?.buffer_cache_hit_ratio != null && telemetry.buffer_cache_hit_ratio >= 99
                ? "Optimal (> 99%)"
                : "Live Catalog Measurement"
              : "Target DB Disconnected"
          }
          source={
            demoMode
              ? "SIMULATED BUFFER HIT RATIO"
              : isTargetOnline
              ? "pg_stat_database"
              : "POSTGRES_CATALOG (OFFLINE)"
          }
          isSimulated={demoMode}
        />

        {/* Metric 4: Active Database Backends & Pool */}
        <MetricCard
          label="Active Database Backends"
          value={
            demoMode
              ? `${currentDemoScenario.kpis.activeBackends} / ${currentDemoScenario.kpis.maxConnections}`
              : telemetry?.active_backends != null
              ? `${telemetry.active_backends} / ${telemetry.max_connections || 100}`
              : "—"
          }
          unit={demoMode || telemetry?.active_backends != null ? "conn" : undefined}
          subtext={
            demoMode
              ? `Pool: ${currentDemoScenario.kpis.poolUtilizationPct}% | Queue: ${currentDemoScenario.kpis.pgbouncerQueueWait} clients`
              : isTargetOnline
              ? `${telemetry?.active_queries || 0} active queries, ${telemetry?.waiting_locks || 0} lock waits`
              : "Target DB Disconnected"
          }
          source={
            demoMode
              ? "SIMULATED CONNECTION POOL"
              : isTargetOnline
              ? "pg_stat_activity"
              : "POSTGRES_CATALOG (OFFLINE)"
          }
          isSimulated={demoMode}
        />
      </div>

      {/* Main Performance Chart & Saturation Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Primary Time-Series (2 cols) */}
        <div className="lg:col-span-2 space-y-2">
          <TimeSeriesChart
            data={chartData}
            title={
              demoMode
                ? `Workload Telemetry: ${currentDemoScenario.name}`
                : "Benchmark Execution Telemetry (Throughput & Latency)"
            }
            source={
              demoMode
                ? `Simulated Scenario Trace (${currentDemoScenario.badge})`
                : "Trafiora Benchmark Runs (Genuine Measurements)"
            }
            isSimulated={demoMode}
          />
        </div>

        {/* Right: Resource Saturation Context (1 col) */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#4E9F8E]" />
              <span>Resource Saturation &amp; Limits</span>
            </h3>
            <span className="text-[10px] font-mono text-[#626C79]">
              {demoMode ? "SIMULATED" : isTargetOnline ? "Live Catalog" : "Unavailable"}
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            {/* Active Connections */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>Active Server Backends:</span>
                <span className="text-[#E8EAF0] font-bold tabular-nums">
                  {demoMode ? (
                    `${currentDemoScenario.kpis.activeBackends} / ${currentDemoScenario.kpis.maxConnections} (${Math.round(
                      (currentDemoScenario.kpis.activeBackends / currentDemoScenario.kpis.maxConnections) * 100
                    )}%)`
                  ) : telemetry?.active_backends != null ? (
                    `${telemetry.active_backends} / ${telemetry.max_connections || 100} (${Math.round(
                      (telemetry.active_backends / (telemetry.max_connections || 100)) * 100
                    )}%)`
                  ) : (
                    "Unavailable (Offline)"
                  )}
                </span>
              </div>
              <div className="w-full bg-[#050607] border border-[#202630] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    demoMode
                      ? currentDemoScenario.kpis.activeBackends > 80
                        ? "bg-[#FB7185]"
                        : currentDemoScenario.kpis.activeBackends > 50
                        ? "bg-[#FBBF24]"
                        : "bg-[#4E9F8E]"
                      : "bg-[#4E9F8E]"
                  }`}
                  style={{
                    width: demoMode
                      ? `${Math.min(100, Math.round((currentDemoScenario.kpis.activeBackends / currentDemoScenario.kpis.maxConnections) * 100))}%`
                      : telemetry?.active_backends != null
                      ? `${Math.min(100, Math.round((telemetry.active_backends / (telemetry.max_connections || 100)) * 100))}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            {/* PgBouncer / Connection Pool */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>PgBouncer Client Queue Wait:</span>
                <span
                  className={`font-bold tabular-nums ${
                    demoMode && currentDemoScenario.kpis.pgbouncerQueueWait > 0
                      ? "text-[#FB7185]"
                      : "text-[#34D399]"
                  }`}
                >
                  {demoMode
                    ? `${currentDemoScenario.kpis.pgbouncerQueueWait} clients (${currentDemoScenario.kpis.poolUtilizationPct}% pool)`
                    : isTargetOnline
                    ? "0 clients"
                    : "Unavailable"}
                </span>
              </div>
              <div className="w-full bg-[#050607] border border-[#202630] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    demoMode && currentDemoScenario.kpis.poolUtilizationPct > 80
                      ? "bg-[#FB7185]"
                      : "bg-[#34D399]"
                  }`}
                  style={{
                    width: demoMode ? `${currentDemoScenario.kpis.poolUtilizationPct}%` : "0%",
                  }}
                />
              </div>
            </div>

            {/* Host CPU Utilization */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>Database Host CPU Usage:</span>
                <span
                  className={`font-bold tabular-nums ${
                    demoMode && currentDemoScenario.kpis.hostCpuPct > 85
                      ? "text-[#FB7185]"
                      : demoMode && currentDemoScenario.kpis.hostCpuPct > 60
                      ? "text-[#FBBF24]"
                      : "text-[#E8EAF0]"
                  }`}
                >
                  {demoMode ? `${currentDemoScenario.kpis.hostCpuPct}% (Simulated)` : "Unavailable (Requires host cgroups v2)"}
                </span>
              </div>
              <div className="w-full bg-[#050607] border border-[#202630] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    demoMode && currentDemoScenario.kpis.hostCpuPct > 85
                      ? "bg-[#FB7185]"
                      : demoMode && currentDemoScenario.kpis.hostCpuPct > 60
                      ? "bg-[#FBBF24]"
                      : "bg-[#4E9F8E]"
                  }`}
                  style={{
                    width: demoMode ? `${currentDemoScenario.kpis.hostCpuPct}%` : "0%",
                  }}
                />
              </div>
            </div>

            {/* Lock Contention */}
            <div className="space-y-1">
              <div className="flex justify-between text-[#929AA6]">
                <span>Transaction Lock Waits:</span>
                <span
                  className={`font-bold tabular-nums ${
                    (demoMode ? currentDemoScenario.kpis.lockWaits : telemetry?.waiting_locks || 0) > 0
                      ? "text-[#FBBF24]"
                      : "text-[#34D399]"
                  }`}
                >
                  {demoMode
                    ? `${currentDemoScenario.kpis.lockWaits} lock waits`
                    : telemetry?.waiting_locks != null
                    ? `${telemetry.waiting_locks} waiting`
                    : "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#090B0E] border border-[#202630] text-[11px] text-[#929AA6] space-y-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <span className="font-semibold text-[#E8EAF0] block font-mono">Overload Circuit Breaker:</span>
            <p className="leading-relaxed">
              Target operational tier:{" "}
              <strong className="text-[#CBD5E1] font-mono">
                {demoMode ? "TIER 2 (DEMO SANDBOX)" : activeTarget?.connection?.operational_tier || "UNCONFIGURED"}
              </strong>
              . Safe observation and isolation boundaries strictly enforced.
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
              {demoMode ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#191408] text-[#FBBF24] border border-[#38290E]">
                  DEMO WORKLOAD PROFILE
                </span>
              ) : realFormattedQueries.length > 0 ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0A1912] text-[#34D399] border border-[#173B2B]">
                  LIVE PG_STAT_STATEMENTS
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090B0E] text-[#626C79] border border-[#202630]">
                  UNAVAILABLE
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#626C79]">
              {demoMode
                ? "Deterministic scenario queries sorted by execution impact. Click any row to inspect execution profile and tuning suggestion."
                : realFormattedQueries.length > 0
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

        {/* Empty State when no real queries and demo mode turned off */}
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
              Load a demo workload scenario to inspect example SQL execution footprints and anti-patterns.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setDemoMode(true)}
                className="px-3 py-1 bg-[#12161C] hover:bg-[#191E25] border border-[#28323F] rounded text-xs font-mono text-[#CBD5E1] transition-colors"
              >
                Load Demo Scenario Workload
              </button>
              <Link
                href="/connections"
                className="px-3 py-1 bg-[#0D1014] hover:bg-[#12161C] border border-[#202630] rounded text-xs font-mono text-[#E8EAF0] transition-colors"
              >
                Manage Connections
              </Link>
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
                  <th className="py-2 px-3 text-right">Total Exec Time</th>
                  <th className="py-2 px-3">Diagnostic Heuristic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202630]/60">
                {filteredQueries.map((q) => (
                  <tr
                    key={q.fingerprint}
                    onClick={() => setSelectedQuery(selectedQuery?.fingerprint === q.fingerprint ? null : q)}
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
                    <td className="py-2.5 px-3 max-w-sm truncate font-sans text-xs text-[#E8EAF0]">
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
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#929AA6]">
                      {(q.totalExecTimeMs / 1000).toFixed(1)}s
                    </td>
                    <td className="py-2.5 px-3">
                      {q.antiPattern ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#191408] text-[#FBBF24] border border-[#38290E]">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[200px]">{q.antiPattern}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#34D399] flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Index Scan</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Query Detail Inspector */}
        {selectedQuery && (
          <div className="p-3.5 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#202630] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#626C79]">QUERY INSPECTOR:</span>
                <span className="text-[#CBD5E1] font-bold">{selectedQuery.fingerprint}</span>
                {selectedQuery.isSimulated && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#12161C] text-[#FBBF24] border border-[#38290E]">
                    SIMULATED WORKLOAD
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedQuery(null)}
                className="text-[11px] text-[#626C79] hover:text-[#E8EAF0] transition-colors"
              >
                Close Inspector &times;
              </button>
            </div>

            <div className="bg-[#050607] p-2 rounded border border-[#202630] text-[11px] text-[#E8EAF0] overflow-x-auto">
              <code>{selectedQuery.statement}</code>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-[#626C79] block">Execution Calls:</span>
                <span className="text-[#E8EAF0] font-bold tabular-nums">{selectedQuery.calls.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#626C79] block">Mean Execution Latency:</span>
                <span className="text-[#E8EAF0] font-bold tabular-nums">{selectedQuery.meanLatencyMs.toFixed(2)} ms</span>
              </div>
              <div>
                <span className="text-[#626C79] block">Total Execution Time:</span>
                <span className="text-[#E8EAF0] font-bold tabular-nums">{(selectedQuery.totalExecTimeMs / 1000).toFixed(2)} seconds</span>
              </div>
              <div>
                <span className="text-[#626C79] block">Shared Blocks (Hit / Read):</span>
                <span className="text-[#E8EAF0] font-bold tabular-nums">
                  {(selectedQuery.sharedBlksHit ?? 0).toLocaleString()} / {(selectedQuery.sharedBlksRead ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {selectedQuery.optimizationSuggestion && (
              <div className="pt-2 border-t border-[#202630] text-[11px] text-[#929AA6]">
                <strong className="text-[#34D399] font-semibold">Tuning Recommendation:</strong>{" "}
                <span className="leading-relaxed">{selectedQuery.optimizationSuggestion}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Grid: Benchmark Comparison & Actionable Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest Benchmark Comparison */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#4E9F8E]" />
              <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight">
                Benchmark Comparison &amp; Impact
              </h3>
            </div>
            {demoMode ? (
              <Badge
                variant={
                  currentDemoScenario.benchmark.outcomeClassification === "MEASURED_IMPROVEMENT"
                    ? "healthy"
                    : currentDemoScenario.benchmark.outcomeClassification === "REGRESSION_DETECTED"
                    ? "critical"
                    : "warning"
                }
              >
                {currentDemoScenario.benchmark.outcomeClassification}
              </Badge>
            ) : experiments[0] ? (
              <Badge
                variant={
                  experiments[0].outcome_classification === "MEASURED_IMPROVEMENT"
                    ? "healthy"
                    : experiments[0].outcome_classification === "REGRESSION_DETECTED"
                    ? "critical"
                    : "warning"
                }
              >
                {experiments[0].outcome_classification || "PENDING"}
              </Badge>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12161C] text-[#626C79] border border-[#202630]">
                NO RUNS
              </span>
            )}
          </div>

          {demoMode ? (
            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between text-[#626C79] text-[11px]">
                <span>
                  Baseline: <strong className="text-[#E8EAF0]">{currentDemoScenario.benchmark.baselineName}</strong>
                </span>
                <span>
                  Candidate: <strong className="text-[#E8EAF0]">{currentDemoScenario.benchmark.candidateName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#202630]">
                <div>
                  <span className="text-[10px] text-[#626C79] block">BASELINE p95</span>
                  <span className="text-sm font-bold text-[#CBD5E1] tabular-nums">
                    {currentDemoScenario.benchmark.baselineP95.toFixed(2)} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">CANDIDATE p95</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      currentDemoScenario.benchmark.p95DeltaPct < 0 ? "text-[#34D399]" : "text-[#FB7185]"
                    }`}
                  >
                    {currentDemoScenario.benchmark.candidateP95.toFixed(2)} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">LATENCY DELTA</span>
                  <span
                    className={`text-sm font-bold tabular-nums flex items-center gap-1 ${
                      currentDemoScenario.benchmark.p95DeltaPct < 0 ? "text-[#34D399]" : "text-[#FB7185]"
                    }`}
                  >
                    {currentDemoScenario.benchmark.p95DeltaPct < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5" />
                    )}
                    {currentDemoScenario.benchmark.p95DeltaPct > 0 ? "+" : ""}
                    {currentDemoScenario.benchmark.p95DeltaPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#202630] space-y-1">
                <p className="text-[11px] text-[#CBD5E1] font-sans leading-relaxed">
                  <strong>Executive Summary:</strong> {currentDemoScenario.benchmark.summary}
                </p>
                <p className="text-[11px] text-[#929AA6] font-sans leading-relaxed">
                  <strong>Performance Takeaway:</strong> {currentDemoScenario.benchmark.keyTakeaway}
                </p>
              </div>
            </div>
          ) : experiments.length >= 2 ? (
            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between text-[#626C79] text-[11px]">
                <span>
                  Candidate: <strong className="text-[#E8EAF0]">{experiments[0].name}</strong>
                </span>
                <span>
                  Baseline: <strong className="text-[#E8EAF0]">{experiments[1].name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#202630]">
                <div>
                  <span className="text-[10px] text-[#626C79] block">BASELINE p95</span>
                  <span className="text-sm font-bold text-[#E8EAF0] tabular-nums">
                    {(experiments[1].summary_metrics?.mean_p95 ?? experiments[1].summary_metrics?.latency_p95_ms ?? 0).toFixed(2)} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">CANDIDATE p95</span>
                  <span className="text-sm font-bold text-[#4E9F8E] tabular-nums">
                    {(experiments[0].summary_metrics?.mean_p95 ?? experiments[0].summary_metrics?.latency_p95_ms ?? 0).toFixed(2)} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#626C79] block">STATUS</span>
                  <span className="text-xs font-bold text-[#CBD5E1]">
                    {experiments[0].outcome_classification || "COMPLETED"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#929AA6] font-sans pt-1">
                Completed {experiments[0].repetitions_completed || 1} repetitions against target.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded bg-[#090B0E] border border-[#202630] text-center space-y-2">
              <span className="text-xs font-mono text-[#626C79]">NO BENCHMARK EVIDENCE RECORDED</span>
              <p className="text-xs text-[#929AA6] max-w-sm mx-auto">
                Execute a candidate benchmark against a baseline to populate statistical A/B distributions.
              </p>
              <button
                onClick={() => setDemoMode(true)}
                className="text-xs font-mono text-[#FBBF24] hover:underline"
              >
                Preview Demo Benchmark Scenarios &rarr;
              </button>
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

        {/* Actionable Bottlenecks */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
              <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase tracking-tight">
                Active Bottleneck Diagnosis
              </h3>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12161C] text-[#626C79] border border-[#202630]">
              {demoMode ? "SIMULATED FINDINGS" : "LIVE HEURISTICS"}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {demoMode ? (
              currentDemoScenario.bottlenecks.map((b) => (
                <div
                  key={b.id}
                  className={`p-3 rounded bg-[#090B0E] border space-y-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] ${
                    b.severity === "CRITICAL"
                      ? "border-[#38141B]"
                      : b.severity === "HIGH IMPACT"
                      ? "border-[#38290E]"
                      : "border-[#202630]"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span
                      className={`font-semibold ${
                        b.severity === "CRITICAL"
                          ? "text-[#FB7185]"
                          : b.severity === "HIGH IMPACT"
                          ? "text-[#FBBF24]"
                          : "text-[#E8EAF0]"
                      }`}
                    >
                      {b.title}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        b.severity === "CRITICAL"
                          ? "bg-[#190B0E] text-[#FB7185] border border-[#38141B]"
                          : b.severity === "HIGH IMPACT"
                          ? "bg-[#191408] text-[#FBBF24] border border-[#38290E]"
                          : "bg-[#0A1912] text-[#34D399] border border-[#173B2B]"
                      }`}
                    >
                      {b.severity}
                    </span>
                  </div>

                  <p className="text-[#929AA6] text-[11px] leading-relaxed">
                    <strong className="text-[#CBD5E1]">Root Cause:</strong> {b.rootCause}
                  </p>
                  <p className="text-[#929AA6] text-[11px] leading-relaxed">
                    <strong className="text-[#CBD5E1]">Impact:</strong> {b.impact}
                  </p>

                  {b.proposedDdl && (
                    <div className="bg-[#050607] p-1.5 rounded border border-[#202630] text-[10px] font-mono text-[#34D399] overflow-x-auto">
                      <code>{b.proposedDdl}</code>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#626C79]">
                    <span>{b.recommendation}</span>
                    <Link
                      href="/diagnosis"
                      className="text-[#CBD5E1] hover:text-[#E8EAF0] hover:underline transition-colors shrink-0 flex items-center gap-0.5 ml-2"
                    >
                      <span>Inspect DDL</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded bg-[#090B0E] border border-[#202630] text-center space-y-2">
                <span className="text-xs font-mono text-[#626C79]">NO LIVE BOTTLENECK DETECTED</span>
                <p className="text-xs text-[#929AA6] max-w-sm mx-auto">
                  Run a workload benchmark to trigger real-time plan analysis and bottleneck heuristics.
                </p>
                <button
                  onClick={() => setDemoMode(true)}
                  className="text-xs font-mono text-[#FBBF24] hover:underline"
                >
                  Preview Simulated Bottlenecks &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
