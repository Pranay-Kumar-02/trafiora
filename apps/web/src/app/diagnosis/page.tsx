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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono uppercase">
            <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
            <span>Database Bottleneck Diagnosis &amp; Root Cause Analysis</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5 font-sans">
            Rule-backed performance heuristics with observed evidence, cost attribution, and verified DDL remediations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning">3 Active Findings</Badge>
          <Badge variant="simulated">SIMULATED ENGINE</Badge>
          <span className="text-[10px] font-mono text-[#626C79] bg-[#0D1014] px-2 py-0.5 rounded border border-[#202630]">
            Heuristics v2.2
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-[#626C79]">Severity Filter:</span>
        <div className="flex items-center gap-1 bg-[#090B0E] p-0.5 rounded border border-[#202630]">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedFilter(lvl)}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                selectedFilter === lvl
                  ? "bg-[#12161C] text-[#E8EAF0] font-semibold border border-[#28323F] shadow-sm"
                  : "text-[#929AA6] hover:text-[#E8EAF0] hover:bg-[#12161C]/50"
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
        <div className="lg:col-span-5 space-y-2">
          {filteredBottlenecks.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`p-3.5 space-y-2 cursor-pointer transition-all rounded border ${
                selectedItem.id === item.id
                  ? "border-[#4E9F8E] bg-[#12161C] shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                  : "border-[#202630] hover:border-[#28323F] bg-[#0D1014] hover:bg-[#12161C]/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold text-[#626C79] uppercase">
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
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      item.verificationStatus === "TESTED_IN_SANDBOX"
                        ? "bg-[#0A1612] text-[#34D399] border-[#17382B]"
                        : "bg-[#090B0E] text-[#626C79] border-[#202630]"
                    }`}
                  >
                    {item.verificationStatus === "TESTED_IN_SANDBOX" ? "SANDBOX VERIFIED" : "UNVERIFIED"}
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-semibold text-[#E8EAF0] leading-snug">
                {item.title}
              </h3>

              <p className="text-[11px] text-[#929AA6] line-clamp-2 leading-relaxed font-sans">
                {item.observation}
              </p>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#626C79] pt-2 border-t border-[#191E25]">
                <span>Relation: <strong className="text-[#CBD5E1]">{item.evidence.relation}</strong></span>
                <span>Impact: <strong className="text-[#E8EAF0] tabular-nums font-bold">{item.evidence.totalImpactPct}%</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Deep Diagnostic Evidence & Proposed Action (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D1014] border border-[#202630] rounded p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#202630] pb-3">
            <div>
              <span className="text-[10px] font-mono text-[#626C79] uppercase tracking-wider block">
                Evidence Dossier &bull; {selectedItem.ruleId}
              </span>
              <h2 className="text-sm font-bold text-[#E8EAF0]">{selectedItem.title}</h2>
            </div>
            <Link
              href="/experiments"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#4E9F8E] hover:bg-[#5bb8a4] text-[#050607] font-semibold text-xs font-mono transition-colors shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Verify in Sandbox</span>
            </Link>
          </div>

          {/* Observed Evidence */}
          <div className="p-3.5 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono">
            <span className="font-semibold text-[#CBD5E1] flex items-center gap-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-[#4E9F8E]" />
              <span>Observed Workload Evidence:</span>
            </span>
            <p className="text-[#929AA6] text-[11px] font-sans leading-relaxed">
              {selectedItem.observation}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#191E25] text-[10px] text-[#626C79]">
              <div>Calls: <strong className="text-[#E8EAF0] tabular-nums">{selectedItem.evidence.calls.toLocaleString()}</strong></div>
              <div>Mean Latency: <strong className="text-[#E8EAF0] tabular-nums">{selectedItem.evidence.meanDurationMs} ms</strong></div>
              <div>Time Share: <strong className="text-[#E8EAF0] tabular-nums font-bold">{selectedItem.evidence.totalImpactPct}%</strong></div>
            </div>
          </div>

          {/* Confirmed Findings vs Likely Causes */}
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-[#34D399] font-mono text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Execution Plan Finding:</span>
              </span>
              <div className="p-3 rounded bg-[#0A1612] border border-[#17382B] text-[#E8EAF0] font-mono text-[11px]">
                {selectedItem.confirmedFinding}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-[#929AA6] font-mono text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#626C79]" />
                <span>Probable Root Causes:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-[#929AA6] text-[11px] bg-[#090B0E] p-3 rounded border border-[#202630]">
                {selectedItem.likelyCauses.map((cause, i) => (
                  <li key={i}>{cause}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Proposed Action & DDL */}
          <div className="p-4 rounded bg-[#090B0E] border border-[#202630] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#E8EAF0] font-mono text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4E9F8E]" />
                <span>Recommended Remediation &amp; DDL</span>
              </span>
              {selectedItem.proposedAction.ddl && (
                <button
                  onClick={() => handleCopyDdl(selectedItem.proposedAction.ddl || "")}
                  className="px-2.5 py-1 rounded bg-[#12161C] hover:bg-[#191E25] text-[#CBD5E1] text-[11px] font-mono flex items-center gap-1 border border-[#202630] transition-colors"
                >
                  <Copy className="w-3 h-3 text-[#929AA6]" />
                  <span>{copiedDdl ? "Copied" : "Copy DDL"}</span>
                </button>
              )}
            </div>

            <p className="text-[#929AA6] text-[11px] leading-relaxed font-sans">
              {selectedItem.proposedAction.description}
            </p>

            {selectedItem.proposedAction.ddl && (
              <pre className="p-3 rounded bg-[#050607] border border-[#202630] font-mono text-xs text-[#E8EAF0] overflow-x-auto whitespace-pre-wrap shadow-inner">
                {selectedItem.proposedAction.ddl}
              </pre>
            )}

            {/* Safety Warning */}
            <div className="p-3 rounded bg-[#181308] border border-[#38290E] text-[11px] text-[#FBBF24] font-mono space-y-1">
              <span className="font-bold block uppercase text-[10px] tracking-wider text-[#FCD34D]">Production Safety Constraint:</span>
              <p className="text-[11px] leading-relaxed">{selectedItem.proposedAction.safetyWarning}</p>
            </div>

            {/* Trade-offs */}
            <div className="space-y-1 text-[11px] text-[#929AA6]">
              <span className="font-semibold text-[#CBD5E1] block font-mono text-[11px]">Known Trade-offs:</span>
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
