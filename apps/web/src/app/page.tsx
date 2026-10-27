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
  Flame,
  Layers,
  Play,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/health")
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Operational Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            System Workload & Intelligence Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time database performance telemetry, isolated benchmark evaluations, and overload protection status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/canvas"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-medium text-gray-300 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architecture Canvas</span>
          </Link>
          <Link
            href="/experiments"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Benchmark</span>
          </Link>
        </div>
      </div>

      {/* Operational Tier Safety & Simulation Mode Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-amber-800/40 bg-amber-950/20 flex items-start gap-3.5">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                Safety Boundary Active: Tier 2 (Authorized Test Target)
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50 text-[10px] font-mono">
                pg-test.internal
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Target connection is authorized for benchmark workload execution. Cold-cache OS cache flushing is strictly disabled on shared hosts.
              Production Tier 1 connections remain strictly isolated to read-only monitoring queries with 0% termination permissions.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-indigo-800/40 bg-indigo-950/20 flex items-start gap-3.5">
          <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                Data Mode: Architectural Baseline Fixture
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 text-[10px] font-mono">
                {apiOnline === true ? "FastAPI: Connected" : "FastAPI: Checking..."}
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Target PostgreSQL host is offline. Telemetry below represents pre-calculated architectural baseline modeling, not live database hardware statistics. Run a live benchmark in Experiments to capture live metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Throughput */}
        <div className="glass-panel glass-panel-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Query Throughput</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">1,480.2 <span className="text-xs font-sans font-normal text-gray-400">QPS</span></div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>+12.4% vs baseline</span>
          </div>
        </div>

        {/* Latency p95 */}
        <div className="glass-panel glass-panel-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Latency (p95)</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">8.45 <span className="text-xs font-sans font-normal text-gray-400">ms</span></div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <TrendingDown className="w-3 h-3" />
            <span>-22.1% improvement</span>
          </div>
        </div>

        {/* Buffer Hit Ratio */}
        <div className="glass-panel glass-panel-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Buffer Hit Ratio</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">99.2 <span className="text-xs font-sans font-normal text-gray-400">%</span></div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono">
            Target exceeded (&gt; 99%)
          </div>
        </div>

        {/* Active Connections */}
        <div className="glass-panel glass-panel-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Active Connections</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">28 <span className="text-xs font-sans font-normal text-gray-400">/ 100 max</span></div>
          <div className="mt-2 text-[11px] text-gray-400 font-mono">
            PgBouncer transaction mode
          </div>
        </div>

        {/* CPU Monitoring Overhead */}
        <div className="glass-panel glass-panel-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Monitor Overhead</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">0.58 <span className="text-xs font-sans font-normal text-gray-400">%</span></div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono">
            Below 1.0% CPU budget
          </div>
        </div>
      </div>

      {/* Two-Column Section: Recent Experiments & Top Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Experiments Table (2 columns) */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Recent Isolated Workload Experiments
            </h2>
            <Link href="/experiments" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Experiment Run</th>
                  <th className="py-2.5 px-3">Scenario</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Latency (p95)</th>
                  <th className="py-2.5 px-3">Throughput</th>
                  <th className="py-2.5 px-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                <tr className="hover:bg-gray-900/40">
                  <td className="py-3 px-3 font-medium text-white font-sans">Index Verification (B-Tree)</td>
                  <td className="py-3 px-3 text-gray-400">viral_post_spike</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      COMPLETED
                    </span>
                  </td>
                  <td className="py-3 px-3 text-emerald-400">7.20 ms</td>
                  <td className="py-3 px-3 text-gray-300">1,620 TPS</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 font-sans font-semibold">
                      MEASURED_IMPROVEMENT
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-gray-900/40">
                  <td className="py-3 px-3 font-medium text-white font-sans">Baseline Unindexed Pagination</td>
                  <td className="py-3 px-3 text-gray-400">unindexed_pagination</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 border border-gray-700">
                      BASELINE
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-300">34.80 ms</td>
                  <td className="py-3 px-3 text-gray-300">420 TPS</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-900 text-gray-400 font-sans">
                      BASELINE_REFERENCE
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-gray-900/40">
                  <td className="py-3 px-3 font-medium text-white font-sans">Candidate OFFSET 50k Pagination</td>
                  <td className="py-3 px-3 text-gray-400">unindexed_pagination</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800/60">
                      FAILED_GATE
                    </span>
                  </td>
                  <td className="py-3 px-3 text-rose-400">68.20 ms</td>
                  <td className="py-3 px-3 text-rose-300">210 TPS</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 font-sans font-semibold">
                      REGRESSION_DETECTED
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Diagnostic Recommendations (1 column) */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Critical Bottlenecks
            </h2>
            <Link href="/diagnosis" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
              <span>All Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-900/80 border border-rose-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Seq Scan: transactions</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 font-bold">
                  CRITICAL (92.4)
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Plan executes sequential table scan scanning 120,000 rows on <code className="text-gray-300 font-mono">account_id = $1</code>.
              </p>
              <div className="p-2 rounded bg-black/60 font-mono text-[11px] text-emerald-400 overflow-x-auto border border-gray-800">
                CREATE INDEX CONCURRENTLY idx_tx_account ON transactions (account_id);
              </div>
              <div className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Unverified recommendation — test in isolated experiment</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-900/80 border border-amber-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Deep OFFSET Pagination</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 font-bold">
                  HIGH (82.5)
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Queries discard up to 50,000 rows. Recommend refactoring to keyset pagination with cursor IDs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
