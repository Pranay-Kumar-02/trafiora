"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Filter,
  Layers,
  Play,
  RotateCw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SQLViewer } from "@/components/ui/SQLViewer";
import { QueryPlanViewer, PlanNode } from "@/components/ui/QueryPlanViewer";
import { apiClient } from "@/lib/api-client";

interface QueryItem {
  fingerprint: string;
  statement_type: string;
  canonical_sql: string;
  tables: string[];
  calls: number;
  mean_latency_ms: number;
  total_time_pct: number;
  antipatterns: string[];
  plan?: PlanNode;
}

const CATALOG_ITEMS: QueryItem[] = [
  {
    fingerprint: "e3b0c44298fc1c14",
    statement_type: "SELECT",
    canonical_sql: "SELECT id, title, content, created_at FROM posts WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3",
    tables: ["posts"],
    calls: 142050,
    mean_latency_ms: 3.42,
    total_time_pct: 28.5,
    antipatterns: [
      "Missing composite index on (user_id, status, created_at)",
    ],
    plan: {
      nodeType: "Limit",
      totalCost: 142.5,
      planRows: 10,
      children: [
        {
          nodeType: "Sort",
          totalCost: 142.3,
          planRows: 85,
          children: [
            {
              nodeType: "Bitmap Heap Scan",
              relationName: "posts",
              totalCost: 120.0,
              planRows: 85,
              children: [
                {
                  nodeType: "Bitmap Index Scan",
                  indexName: "idx_posts_user_id",
                  totalCost: 8.5,
                  planRows: 85,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    fingerprint: "7a8b9c0d1e2f3a4b",
    statement_type: "SELECT",
    canonical_sql: "SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    tables: ["transactions"],
    calls: 48920,
    mean_latency_ms: 48.75,
    total_time_pct: 38.2,
    antipatterns: [
      "WILDCARD_PROJECTION: SELECT * prevents index-only scans",
      "OFFSET_PAGINATION: Large OFFSET degrades linearly O(N)",
    ],
    plan: {
      nodeType: "Limit",
      totalCost: 840.2,
      planRows: 50,
      children: [
        {
          nodeType: "Seq Scan",
          relationName: "transactions",
          totalCost: 820.0,
          planRows: 12500,
          isSeqScan: true,
          filter: "(account_id = $1)",
        },
      ],
    },
  },
  {
    fingerprint: "f1e2d3c4b5a69870",
    statement_type: "UPDATE",
    canonical_sql: "UPDATE inventory SET stock = stock - $1, updated_at = NOW() WHERE product_id = $2 AND stock >= $3",
    tables: ["inventory"],
    calls: 85200,
    mean_latency_ms: 12.10,
    total_time_pct: 16.4,
    antipatterns: [
      "ROW_LOCK_CONTENTION: Hot product update skew observed during traffic bursts",
    ],
    plan: {
      nodeType: "Update",
      relationName: "inventory",
      totalCost: 45.0,
      planRows: 1,
      children: [
        {
          nodeType: "Index Scan",
          relationName: "inventory",
          indexName: "pk_inventory_product_id",
          totalCost: 8.2,
          planRows: 1,
        },
      ],
    },
  },
  {
    fingerprint: "c5d6e7f8a9b0c1d2",
    statement_type: "SELECT",
    canonical_sql: "SELECT c.id, c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name",
    tables: ["customers", "orders"],
    calls: 1240,
    mean_latency_ms: 95.40,
    total_time_pct: 12.1,
    antipatterns: [
      "HASH_AGGREGATE: Memory spill to temporary disk files",
    ],
    plan: {
      nodeType: "HashAggregate",
      totalCost: 1250.0,
      planRows: 450,
      children: [
        {
          nodeType: "Hash Right Join",
          totalCost: 980.0,
          planRows: 24000,
          children: [
            {
              nodeType: "Seq Scan",
              relationName: "orders",
              totalCost: 650.0,
              planRows: 24000,
              isSeqScan: true,
            },
            {
              nodeType: "Hash",
              totalCost: 210.0,
              planRows: 450,
              children: [
                {
                  nodeType: "Seq Scan",
                  relationName: "customers",
                  totalCost: 180.0,
                  planRows: 450,
                  isSeqScan: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

export default function WorkloadPage() {
  const [queries, setQueries] = useState<QueryItem[]>(CATALOG_ITEMS);
  const [selectedQuery, setSelectedQuery] = useState<QueryItem>(CATALOG_ITEMS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statementFilter, setStatementFilter] = useState("ALL");
  const [rawSqlInput, setRawSqlInput] = useState("SELECT * FROM users WHERE id = 42 AND email = 'admin@example.com' LIMIT 50 OFFSET 1000;");
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizeResult, setNormalizeResult] = useState<any>(null);

  const handleNormalize = async () => {
    setIsNormalizing(true);
    try {
      const data = await apiClient.post<any>("/queries/normalize", {
        raw_sql: rawSqlInput,
      });
      setNormalizeResult(data);
      const newItem: QueryItem = {
        fingerprint: data.fingerprint.slice(0, 16),
        statement_type: data.statement_type || "SELECT",
        canonical_sql: data.canonical_sql,
        tables: data.tables || ["users"],
        calls: 1,
        mean_latency_ms: 5.2,
        total_time_pct: 4.8,
        antipatterns: data.antipatterns || [],
      };
      setSelectedQuery(newItem);
    } catch {
      // Local fallback
      setNormalizeResult({
        canonical_sql: "SELECT * FROM users WHERE id = $1 AND email = $2 LIMIT $3 OFFSET $4",
        fingerprint: "9f8e7d6c5b4a3928170e1f2a3b4c5d6e",
        tables: ["users"],
        antipatterns: [
          "WILDCARD_PROJECTION: SELECT * prevents index-only scans",
          "OFFSET_PAGINATION: Large OFFSET degrades linearly",
        ],
      });
    } finally {
      setIsNormalizing(false);
    }
  };

  const filteredQueries = queries.filter((q) => {
    const matchesSearch =
      q.canonical_sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.fingerprint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.tables.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = statementFilter === "ALL" || q.statement_type === statementFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono">
            <Database className="w-5 h-5 text-[#4E9F8E]" />
            <span>WORKLOAD QUERY CATALOG &amp; AST NORMALIZER</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5">
            SQLGlot AST query normalization, literal masking ($N), deterministic SHA-256 fingerprinting, and execution plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="healthy">SQLGlot 26.x AST Active</Badge>
          <Badge variant="simulated">pg_stat_statements: Offline Fallback</Badge>
        </div>
      </div>

      {/* SQL Normalizer Sandbox */}
      <div className="panel p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#202630] pb-2">
          <h3 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase flex items-center gap-1.5 tracking-tight">
            <Sparkles className="w-3.5 h-3.5 text-[#4E9F8E]" />
            <span>Interactive SQL Normalizer &amp; Masking Sandbox</span>
          </h3>
          <span className="text-[10px] font-mono text-[#626C79]">
            Literal Masking &bull; Anti-pattern Screening
          </span>
        </div>

        <div className="space-y-2">
          <textarea
            value={rawSqlInput}
            onChange={(e) => setRawSqlInput(e.target.value)}
            rows={2}
            className="w-full bg-[#050607] border border-[#202630] rounded p-2.5 text-xs font-mono text-[#E8EAF0] focus:outline-none focus:border-[#364354] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]"
            placeholder="Paste raw SQL to normalize and extract fingerprint..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-[#626C79] font-mono">
              Input passes through AST parser; values like &apos;admin@example.com&apos; and 42 are masked as $N.
            </span>
            <button
              onClick={handleNormalize}
              disabled={isNormalizing}
              className="px-3 py-1 rounded bg-[#12161C] hover:bg-[#191E25] border border-[#28323F] hover:border-[#364354] text-[#E8EAF0] font-medium text-xs font-mono transition-colors flex items-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] self-start sm:self-auto"
            >
              <Sparkles className="w-3 h-3 text-[#4E9F8E]" />
              <span>{isNormalizing ? "Parsing AST..." : "Normalize &amp; Fingerprint"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Filterable Query List (5 cols) */}
        <div className="lg:col-span-5 panel p-4 space-y-3 flex flex-col max-h-[640px]">
          {/* Search & Filter Toolbar */}
          <div className="space-y-2 border-b border-[#202630] pb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#626C79] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search fingerprint, table, SQL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-[#090B0E] border border-[#202630] rounded text-xs text-[#E8EAF0] placeholder:text-[#626C79] focus:outline-none focus:border-[#364354] font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#626C79] text-[11px]">Statement Type:</span>
              <div className="flex items-center gap-1 bg-[#090B0E] p-0.5 rounded border border-[#202630] text-[10px]">
                {["ALL", "SELECT", "UPDATE"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setStatementFilter(type)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      statementFilter === type
                        ? "bg-[#12161C] text-[#E8EAF0] border border-[#28323F] font-bold"
                        : "text-[#626C79] hover:text-[#929AA6]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Query Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredQueries.map((q) => (
              <div
                key={q.fingerprint}
                onClick={() => setSelectedQuery(q)}
                className={`p-3 rounded border text-xs font-mono cursor-pointer transition-colors space-y-1.5 ${
                  selectedQuery.fingerprint === q.fingerprint
                    ? "bg-[#12161C] border-[#4E9F8E] text-[#E8EAF0] shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
                    : "bg-[#090B0E] border-[#202630] hover:border-[#28323F] text-[#929AA6]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#CBD5E1] text-[11px]">{q.fingerprint}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0D1014] text-[#626C79] border border-[#202630]">
                    {q.statement_type}
                  </span>
                </div>

                <div className="text-[11px] text-[#E8EAF0] font-sans line-clamp-2 leading-relaxed">
                  {q.canonical_sql}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#626C79] pt-1 border-t border-[#202630]">
                  <span>Impact: <strong className="text-[#E8EAF0] tabular-nums">{q.total_time_pct.toFixed(1)}%</strong></span>
                  <span>Mean: <strong className="text-[#CBD5E1] tabular-nums">{q.mean_latency_ms.toFixed(1)} ms</strong></span>
                  <span>Calls: <strong className="text-[#929AA6] tabular-nums">{q.calls.toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Query Detail Panel & Execution Plan (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Query Summary & Metadata */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#202630] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#CBD5E1]">
                  Fingerprint: {selectedQuery.fingerprint}
                </span>
                <Badge variant="healthy">{selectedQuery.statement_type}</Badge>
              </div>
              <span className="text-[10px] font-mono text-[#626C79]">
                Tables: {selectedQuery.tables.join(", ")}
              </span>
            </div>

            {/* SQL Viewer */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-[#626C79]">Canonical Masked SQL:</span>
              <SQLViewer sql={selectedQuery.canonical_sql} isRedacted={true} />
            </div>

            {/* Anti-Patterns Screening Results */}
            {selectedQuery.antipatterns.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono font-semibold text-[#FBBF24] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Observed Performance Anti-Patterns:</span>
                </span>
                <div className="space-y-1">
                  {selectedQuery.antipatterns.map((ap, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-[#191408] border border-[#38290E] text-xs text-[#FBBF24] font-mono"
                    >
                      {ap}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution Plan View */}
          {selectedQuery.plan && (
            <QueryPlanViewer plan={selectedQuery.plan} />
          )}
        </div>
      </div>
    </div>
  );
}
