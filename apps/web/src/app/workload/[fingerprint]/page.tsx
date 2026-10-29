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
  Zap,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { MetricCard } from "../../../components/ui/MetricCard";
import { SQLViewer } from "../../../components/ui/SQLViewer";
import { QueryPlanViewer, PlanNode } from "../../../components/ui/QueryPlanViewer";

const SAMPLE_PLAN: PlanNode = {
  nodeType: "Limit",
  totalCost: 1425.32,
  planRows: 50,
  children: [
    {
      nodeType: "Sort",
      totalCost: 1425.25,
      planRows: 20,
      children: [
        {
          nodeType: "Seq Scan",
          relationName: "transactions",
          totalCost: 1420.50,
          planRows: 120000,
          isSeqScan: true,
          filter: "(account_id = $1)",
        },
      ],
    },
  ],
};

export default function QueryDetailPage({
  params,
}: {
  params: Promise<{ fingerprint: string }>;
}) {
  const resolvedParams = use(params);
  const fingerprint = resolvedParams.fingerprint;

  return (
    <div className="space-y-4 sm:space-y-5 max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href="/workload"
        className="inline-flex items-center gap-1.5 text-xs text-[#626C79] hover:text-[#CBD5E1] transition-colors font-mono"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>&larr; Back to Workload Query Catalog</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-[#626C79] uppercase">
              SHA-256 Fingerprint
            </span>
            <span className="text-xs font-mono font-bold text-[#CBD5E1]">{fingerprint}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[#E8EAF0] font-mono tracking-tight">
            STATEMENT EXECUTION INTELLIGENCE &amp; AUDIT
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="critical">CRITICAL BOTTLENECK</Badge>
          <Badge variant="tier2">Tier 2 Target</Badge>
        </div>
      </div>

      {/* Canonical SQL Box */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-[#626C79]">Normalized Canonical SQL Template:</span>
        <SQLViewer
          sql="SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;"
          dialect="postgres"
          isRedacted={true}
        />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Execution Calls"
          value="48,920"
          unit="calls"
          subtext="38.2% workload share"
          source="pg_stat_statements"
          isSimulated={true}
        />
        <MetricCard
          label="Mean Execution Time"
          value="48.75"
          unit="ms"
          delta={{ value: "+24.5% vs baseline", trend: "up", isPositiveGood: false }}
          source="pg_stat_statements"
          isSimulated={true}
        />
        <MetricCard
          label="Buffer Cache Hit Ratio"
          value="92.4"
          unit="%"
          delta={{ value: "Disk Thrashing (< 95%)", trend: "down", isPositiveGood: false }}
          source="pg_statio_user_tables"
          isSimulated={true}
        />
        <MetricCard
          label="Bottleneck Severity Score"
          value="92.4"
          unit="/ 100"
          subtext="Critical Priority"
          source="Diagnosis Heuristic"
        />
      </div>

      {/* Execution Plan Tree & Bottleneck Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Explain Plan Tree */}
        <QueryPlanViewer plan={SAMPLE_PLAN} />

        {/* Right: Evidence-Based Recommendation */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase flex items-center gap-1.5 tracking-tight">
              <Zap className="w-3.5 h-3.5 text-[#4E9F8E]" />
              <span>Evidence-Based Optimization Advice</span>
            </h2>
            <Badge variant="critical">CRITICAL</Badge>
          </div>

          <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-2.5 text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <span className="font-bold text-[#E8EAF0] text-[11px] block">
              Composite Index Recommendation
            </span>
            <p className="text-[#929AA6] text-[11px] font-sans leading-relaxed">
              Add a composite index on <code className="text-[#CBD5E1] font-mono">transactions(account_id, created_at DESC)</code> to satisfy the equality filter and eliminate the costly table scan and disk sort nodes.
            </p>
            <pre className="p-2.5 rounded bg-[#050607] border border-[#202630] font-mono text-xs text-[#CBD5E1] overflow-x-auto whitespace-pre-wrap">
              CREATE INDEX CONCURRENTLY idx_tx_account_created ON transactions (account_id, created_at DESC);
            </pre>
            <div className="p-2 rounded bg-[#191408] border border-[#38290E] text-[#FBBF24] text-[11px] font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Unverified DDL: Test in isolated Tier 3 sandbox before applying to production.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
