"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Plus,
  RotateCw,
  Shield,
  Zap,
} from "lucide-react";

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([
    {
      id: "conn-prod-replica",
      name: "Production Main Read Replica",
      host: "pg-read.internal",
      port: 5432,
      database: "prod_app",
      username: "trafiora_monitor",
      tier: "tier_1_read_only",
      status: "connected",
      version: "PostgreSQL 18.6",
      pg_stat_statements: true,
    },
    {
      id: "conn-staging-bench",
      name: "Staging Performance Test Target",
      host: "staging-db.internal",
      port: 5432,
      database: "test_app",
      username: "trafiora_benchmark_runner",
      tier: "tier_2_workload_benchmark",
      status: "connected",
      version: "PostgreSQL 18.6",
      pg_stat_statements: true,
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <RotateCw className="w-6 h-6 text-indigo-400" />
            Database Target Connections & Operational Tiers
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage database connection credentials with AES-256 envelope vault encryption and strictly segregated operational permissions.
          </p>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Connection</span>
        </button>
      </div>

      {/* Operational Tier Security Rule Callout */}
      <div className="p-4 rounded-xl glass-panel border border-indigo-800/40 bg-indigo-950/20 flex items-start gap-3.5 text-xs text-gray-300">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white text-[11px] uppercase tracking-wide block">
            Three-Tier Operational Security Model
          </span>
          <p className="leading-relaxed">
            <strong className="text-emerald-400">Tier 1 (Read-Only Observation):</strong> Zero benchmark executions permitted. Read-only pg_stat_statements queries only.<br />
            <strong className="text-amber-400">Tier 2 (Workload Benchmark Target):</strong> Explicitly authorized test database for running pgbench and measuring latency.<br />
            <strong className="text-rose-400">Tier 3 (Disposable Sandbox):</strong> Isolated disposable environment permitted for DDL index verification and destructive stress tests.
          </p>
        </div>
      </div>

      {/* Connections List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {connections.map((c) => (
          <div key={c.id} className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">{c.name}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  c.tier === "tier_1_read_only"
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                    : "bg-amber-950 text-amber-300 border-amber-800"
                }`}
              >
                {c.tier}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-gray-900/80 font-mono text-xs text-gray-300 space-y-1 border border-gray-800">
              <div><span className="text-gray-500">Host:</span> {c.host}:{c.port}</div>
              <div><span className="text-gray-500">Database:</span> {c.database}</div>
              <div><span className="text-gray-500">Role:</span> {c.username}</div>
              <div><span className="text-gray-500">Version:</span> {c.version}</div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Probe: Connected</span>
              </span>
              <button className="px-3 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs">
                Test Connectivity
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
