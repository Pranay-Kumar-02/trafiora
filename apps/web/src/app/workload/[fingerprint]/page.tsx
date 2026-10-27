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
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href="/workload"
        className="inline-flex items-center gap-1.5 text-xs text-graphite-300 hover:text-brand-teal transition-colors font-mono"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>&larr; Back to Workload Query Catalog</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-graphite-300 uppercase">
              SHA-256 Fingerprint
            </span>
            <span className="text-xs font-mono font-bold text-brand-teal">{fingerprint}</span>
          </div>
          <h1 className="text-lg font-bold text-graphite-50 font-mono">
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
        <span className="text-[11px] font-mono text-graphite-300">Normalized Canonical SQL Template:</span>
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
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h2 className="text-xs font-semibold text-graphite-50 font-mono uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-brand-teal" />
              <span>Evidence-Based Optimization Advice</span>
            </h2>
            <Badge variant="critical">CRITICAL</Badge>
          </div>

          <div className="p-3 rounded bg-graphite-950 border border-graphite-600 space-y-2.5 text-xs font-mono">
            <span className="font-bold text-graphite-50 text-[11px] block">
              Composite Index Recommendation
            </span>
            <p className="text-graphite-200 text-[11px] font-sans leading-relaxed">
              Add a composite index on <code className="text-brand-teal font-mono">transactions(account_id, created_at DESC)</code> to satisfy the equality filter and eliminate the costly table scan and disk sort nodes.
            </p>
            <pre className="p-2.5 rounded bg-graphite-900 border border-graphite-700 font-mono text-xs text-brand-teal overflow-x-auto whitespace-pre-wrap">
              CREATE INDEX CONCURRENTLY idx_tx_account_created ON transactions (account_id, created_at DESC);
            </pre>
            <div className="p-2 rounded bg-status-warningSurface border border-status-warningBorder text-status-warning text-[11px] font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Unverified DDL: Test in isolated Tier 3 sandbox before applying to production.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
