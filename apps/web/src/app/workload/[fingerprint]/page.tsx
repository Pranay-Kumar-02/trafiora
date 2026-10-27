"use client";

import { use } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Code,
  Copy,
  Database,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";

export default function QueryDetailPage({
  params,
}: {
  params: Promise<{ fingerprint: string }>;
}) {
  const resolvedParams = use(params);
  const fingerprint = resolvedParams.fingerprint;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href="/workload"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Workload Catalog</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-400 font-mono border border-indigo-800">
              SHA-256 Fingerprint
            </span>
            <span className="text-xs font-mono text-cyan-400">{fingerprint}</span>
          </div>
          <h1 className="text-xl font-bold text-white">Statement Execution Intelligence</h1>
        </div>
      </div>

      {/* Parameterized SQL Box */}
      <div className="glass-panel p-5 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-2 text-white font-semibold">
            <Code className="w-4 h-4 text-indigo-400" />
            Canonical SQL Template
          </span>
          <span className="text-[11px] font-mono text-gray-500">AST Normalized</span>
        </div>
        <div className="p-4 rounded-lg bg-gray-950 border border-gray-800 font-mono text-xs text-indigo-200 overflow-x-auto leading-relaxed">
          SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Total Calls</div>
          <div className="text-xl font-bold font-mono text-white">48,920</div>
          <div className="text-[11px] text-gray-500 mt-1">38.2% workload share</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Mean Execution Time</div>
          <div className="text-xl font-bold font-mono text-white">48.75 ms</div>
          <div className="text-[11px] text-amber-400 mt-1">High latency alert</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Buffer Cache Hit Ratio</div>
          <div className="text-xl font-bold font-mono text-amber-400">92.4 %</div>
          <div className="text-[11px] text-amber-400 mt-1">Disk read degradation</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Bottleneck Impact Score</div>
          <div className="text-xl font-bold font-mono text-rose-400">92.4 / 100</div>
          <div className="text-[11px] text-rose-400 font-semibold mt-1">CRITICAL</div>
        </div>
      </div>

      {/* Execution Plan Tree & Bottleneck Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Explain Plan Tree */}
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Execution Plan Tree Node Analysis
          </h2>
          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 space-y-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-gray-900 border border-gray-800 space-y-1">
              <div className="text-indigo-400 font-bold">&gt; Limit (cost=1425.20..1425.32 rows=50 width=88)</div>
              <div className="text-gray-400 pl-4">&gt; Sort (cost=1425.20..1425.25 rows=20 width=88)</div>
              <div className="text-gray-500 pl-8">Sort Key: created_at DESC</div>
              <div className="text-rose-400 font-bold pl-8">
                &gt; Seq Scan on transactions (cost=0.00..1420.50 rows=120 width=88)
              </div>
              <div className="text-rose-300 pl-12">Filter: (account_id = $1)</div>
            </div>
            <div className="text-[11px] text-gray-400 font-sans">
              Sequential scan on 120,000 rows followed by memory sort accounts for 98.4% of total execution time.
            </div>
          </div>
        </div>

        {/* Right: Evidence-Based Recommendation */}
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            Evidence-Based Optimization Advice
          </h2>
          <div className="p-4 rounded-lg bg-gray-900 border border-rose-900/40 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Composite Index Recommendation</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 font-bold">
                CRITICAL
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Add a composite index on <code className="text-indigo-300 font-mono">transactions(account_id, created_at DESC)</code> to satisfy both the equality filter and avoid the costly sort node.
            </p>
            <div className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-emerald-400 border border-gray-800">
              CREATE INDEX CONCURRENTLY idx_tx_account_created ON transactions (account_id, created_at DESC);
            </div>
            <div className="p-2 rounded bg-amber-950/30 border border-amber-900/40 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Unverified DDL: Run benchmark experiment to prove latency delta before applying to production.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
