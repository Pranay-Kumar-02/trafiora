"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Play,
  RotateCw,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { SQLViewer } from "../../components/ui/SQLViewer";

interface BottleneckItem {
  id: string;
  ruleId: string;
  title: string;
  severity: "critical" | "high" | "medium";
  verificationStatus: "UNVERIFIED" | "TESTED_IN_SANDBOX";
  observation: string;
  evidence: {
    fingerprint: string;
    relation: string;
    calls: number;
    meanDurationMs: number;
    totalImpactPct: number;
    timestamp: string;
  };
  confirmedFinding: string;
  likelyCauses: string[];
  proposedAction: {
    description: string;
    ddl?: string;
    safetyWarning: string;
    tradeoffs: string[];
  };
}

const ACTIVE_BOTTLENECKS: BottleneckItem[] = [
  {
    id: "diag-01",
    ruleId: "RULE-01",
    title: "Sequential Scan on High-Impact Relation 'events'",
    severity: "critical",
    verificationStatus: "UNVERIFIED",
    observation: "Query f7d98b12e3a4 accounts for 41.2% total database execution time performing full table scans.",
    evidence: {
      fingerprint: "f7d98b12e3a4",
      relation: "public.events",
      calls: 128450,
      meanDurationMs: 18.4,
      totalImpactPct: 41.2,
      timestamp: "2026-10-27T20:45:00Z",
    },
    confirmedFinding: "EXPLAIN plan confirms 'Seq Scan on events' with Cost=840.2 reading 12,500 rows per execution.",
    likelyCauses: [
      "Missing composite B-tree index on filter columns (user_id, created_at)",
      "PostgreSQL query planner determined existing single-column index selectivity too low",
    ],
    proposedAction: {
      description: "Create composite B-tree index concurrently on (user_id, created_at DESC).",
      ddl: "CREATE INDEX CONCURRENTLY idx_events_user_created ON public.events (user_id, created_at DESC);",
      safetyWarning: "MUST use CONCURRENTLY in production to avoid acquiring ACCESS EXCLUSIVE lock on 'events'. Verify in Tier 3 sandbox first.",
      tradeoffs: [
        "Index disk footprint: ~45 MB",
        "Write amplification: ~2-4% additional latency on high-frequency INSERT into events",
      ],
    },
  },
  {
    id: "diag-02",
    ruleId: "RULE-02",
    title: "Deep OFFSET Pagination Degradation on 'transactions'",
    severity: "high",
    verificationStatus: "UNVERIFIED",
    observation: "Query 7a8b9c0d1e2f consumes 38.2% total time using OFFSET $3 for pagination with large page offsets.",
    evidence: {
      fingerprint: "7a8b9c0d1e2f",
      relation: "public.transactions",
      calls: 48920,
      meanDurationMs: 48.75,
      totalImpactPct: 38.2,
      timestamp: "2026-10-27T20:44:00Z",
    },
    confirmedFinding: "PostgreSQL executor scans and discards N preceding rows linearly: O(N) tuple reads per request.",
    likelyCauses: [
      "Client UI application implements offset-based pagination instead of keyset/cursor pagination",
      "Scanned tuples discarded before reaching network wire, wasting buffer pool memory",
    ],
    proposedAction: {
      description: "Refactor API endpoint to keyset-based cursor pagination: WHERE (created_at, id) < ($1, $2).",
      ddl: "SELECT * FROM transactions WHERE account_id = $1 AND (created_at, id) < ($2, $3) ORDER BY created_at DESC, id DESC LIMIT $4;",
      safetyWarning: "Application code change required. Does not modify database schema.",
      tradeoffs: [
        "Requires client API contract update to pass opaque pagination tokens",
        "Eliminates arbitrary page jumps (e.g. 'jump directly to page 50')",
      ],
    },
  },
  {
    id: "diag-03",
    ruleId: "RULE-03",
    title: "Hot Product Row Lock Contention on 'inventory'",
    severity: "high",
    verificationStatus: "TESTED_IN_SANDBOX",
    observation: "Frequent inventory updates during traffic bursts experience transaction serialization lock waits.",
    evidence: {
      fingerprint: "f1e2d3c4b5a6",
      relation: "public.inventory",
      calls: 85200,
      meanDurationMs: 12.10,
      totalImpactPct: 16.4,
      timestamp: "2026-10-27T20:42:00Z",
    },
    confirmedFinding: "Zipfian popularity skew concentrates 65% of update transactions onto top 5 product rows.",
    likelyCauses: [
      "Synchronous row locks held during checkout transaction commit window",
      "No inventory counter sharding or asynchronous reservation queue",
    ],
    proposedAction: {
      description: "Implement decoupled inventory reservation batches or atomic decrement with condition check.",
      ddl: "-- Atomic conditional update:\nUPDATE inventory SET stock = stock - $1 WHERE product_id = $2 AND stock >= $1;",
      safetyWarning: "Requires transactional isolation verification against overselling.",
      tradeoffs: [
        "Decreases lock wait time by 72% under benchmark simulation",
        "Requires application handling for out-of-stock rollback exceptions",
      ],
    },
  },
];

export default function DiagnosisPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<BottleneckItem>(ACTIVE_BOTTLENECKS[0]);
  const [copiedDdl, setCopiedDdl] = useState(false);

  const filteredBottlenecks = ACTIVE_BOTTLENECKS.filter(
    (b) => selectedFilter === "ALL" || b.severity === selectedFilter.toLowerCase()
  );

  const handleCopyDdl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-50 flex items-center gap-2 font-mono">
            <AlertTriangle className="w-5 h-5 text-status-warning" />
            <span>DATABASE BOTTLENECK DIAGNOSIS &amp; OPTIMIZATION</span>
          </h1>
          <p className="text-xs text-graphite-200 mt-0.5">
            Rule-backed performance diagnostics with observed evidence, root cause analysis, and verified DDL recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning">3 Active Findings</Badge>
          <Badge variant="simulated">SIMULATED DEMO RULES</Badge>
          <Badge variant="healthy">Heuristics Engine v2.2</Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-graphite-300">Filter Severity:</span>
        <div className="flex items-center gap-1 bg-graphite-850 p-1 rounded border border-graphite-600">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedFilter(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                selectedFilter === lvl
                  ? "bg-graphite-700 text-graphite-50 font-bold"
                  : "text-graphite-300 hover:text-graphite-100"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Findings List + Detail Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Finding Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredBottlenecks.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`panel p-4 space-y-2 cursor-pointer transition-colors border ${
                selectedItem.id === item.id
                  ? "border-brand-teal bg-graphite-800"
                  : "border-graphite-600 hover:border-graphite-500 bg-graphite-850/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-graphite-300 uppercase">
                  {item.ruleId}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      item.severity === "critical"
                        ? "critical"
                        : item.severity === "high"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {item.severity.toUpperCase()}
                  </Badge>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                      item.verificationStatus === "TESTED_IN_SANDBOX"
                        ? "bg-status-successSurface text-status-success border-status-successBorder"
                        : "bg-graphite-700 text-graphite-300 border-graphite-600"
                    }`}
                  >
                    {item.verificationStatus}
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-semibold text-graphite-50 leading-snug">
                {item.title}
              </h3>

              <p className="text-[11px] text-graphite-200 line-clamp-2 leading-relaxed">
                {item.observation}
              </p>

              <div className="flex items-center justify-between text-[10px] font-mono text-graphite-300 pt-1.5 border-t border-graphite-700/60">
                <span>Relation: <strong className="text-brand-teal">{item.evidence.relation}</strong></span>
                <span>Impact: <strong className="text-graphite-50 tabular-nums">{item.evidence.totalImpactPct}%</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Deep Diagnostic Evidence & Proposed Action (7 cols) */}
        <div className="lg:col-span-7 panel p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-graphite-600 pb-3">
            <div>
              <span className="text-[10px] font-mono text-graphite-300 uppercase block">
                Diagnostic Finding &bull; {selectedItem.ruleId}
              </span>
              <h2 className="text-sm font-bold text-graphite-50">{selectedItem.title}</h2>
            </div>
            <Link
              href="/experiments"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-teal hover:bg-brand-tealLight text-graphite-950 font-semibold text-xs font-mono transition-colors shadow-subtle"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Verify in Sandbox</span>
            </Link>
          </div>

          {/* Observed Evidence */}
          <div className="p-3 rounded bg-graphite-850 border border-graphite-600 space-y-1.5 text-xs font-mono">
            <span className="font-semibold text-graphite-100 flex items-center gap-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-brand-teal" />
              <span>Observed Workload Evidence:</span>
            </span>
            <p className="text-graphite-200 text-[11px] font-sans leading-relaxed">
              {selectedItem.observation}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-graphite-700/60 text-[10px] text-graphite-300">
              <div>Calls: <strong className="text-graphite-100 tabular-nums">{selectedItem.evidence.calls.toLocaleString()}</strong></div>
              <div>Mean Latency: <strong className="text-graphite-100 tabular-nums">{selectedItem.evidence.meanDurationMs} ms</strong></div>
              <div>Total Time %: <strong className="text-graphite-100 tabular-nums">{selectedItem.evidence.totalImpactPct}%</strong></div>
            </div>
          </div>

          {/* Confirmed Findings vs Likely Causes */}
          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-status-success font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmed Ground Truth Finding:</span>
              </span>
              <p className="p-2.5 rounded bg-status-successSurface/40 border border-status-successBorder text-graphite-100 font-mono text-[11px]">
                {selectedItem.confirmedFinding}
              </p>
            </div>

            <div className="space-y-1 pt-1">
              <span className="font-semibold text-graphite-300 font-mono text-[11px] flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-status-info" />
                <span>Likely Root Causes:</span>
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-graphite-200 text-[11px]">
                {selectedItem.likelyCauses.map((cause, i) => (
                  <li key={i}>{cause}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Proposed Action & DDL */}
          <div className="p-4 rounded bg-graphite-950 border border-graphite-600 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-graphite-50 font-mono text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                <span>Proposed Action &amp; Recommended DDL</span>
              </span>
              {selectedItem.proposedAction.ddl && (
                <button
                  onClick={() => handleCopyDdl(selectedItem.proposedAction.ddl || "")}
                  className="px-2 py-0.5 rounded bg-graphite-800 hover:bg-graphite-700 text-graphite-200 text-[11px] font-mono flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedDdl ? "Copied DDL" : "Copy DDL"}</span>
                </button>
              )}
            </div>

            <p className="text-graphite-200 text-[11px] leading-relaxed">
              {selectedItem.proposedAction.description}
            </p>

            {selectedItem.proposedAction.ddl && (
              <pre className="p-2.5 rounded bg-graphite-900 border border-graphite-700 font-mono text-xs text-brand-teal overflow-x-auto whitespace-pre-wrap">
                {selectedItem.proposedAction.ddl}
              </pre>
            )}

            {/* Safety Warning */}
            <div className="p-2.5 rounded bg-status-warningSurface border border-status-warningBorder text-[11px] text-status-warning font-mono space-y-0.5">
              <span className="font-bold block uppercase text-[10px]">Production Safety Boundary:</span>
              <p>{selectedItem.proposedAction.safetyWarning}</p>
            </div>

            {/* Trade-offs */}
            <div className="space-y-1 text-[11px] text-graphite-300">
              <span className="font-semibold text-graphite-100 block font-mono">Known Trade-offs:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {selectedItem.proposedAction.tradeoffs.map((to, i) => (
                  <li key={i}>{to}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
