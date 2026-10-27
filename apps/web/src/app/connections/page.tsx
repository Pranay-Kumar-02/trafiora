"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  Plus,
  RefreshCw,
  RotateCw,
  Shield,
  X,
  Zap,
} from "lucide-react";

interface ConnectionItem {
  id: string;
  name: string;
  host: string;
  port: number;
  database_name?: string;
  database?: string;
  username: string;
  operational_tier?: string;
  tier?: string;
  is_disposable_sandbox?: boolean;
  capabilities?: {
    connected?: boolean;
    server_version?: string;
    pg_stat_statements_installed?: boolean;
    pg_stat_kcache_installed?: boolean;
    error?: string;
  };
  probe_status?: "idle" | "probing" | "success" | "failed";
  probe_message?: string;
}

const DEFAULT_DEMO_CONNECTIONS: ConnectionItem[] = [
  {
    id: "conn-prod-replica",
    name: "Production Main Read Replica (Demo)",
    host: "pg-read.internal",
    port: 5432,
    database_name: "prod_app",
    username: "trafiora_monitor",
    operational_tier: "tier_1_read_only",
    is_disposable_sandbox: false,
    capabilities: {
      connected: false,
      server_version: "PostgreSQL 18.6 (Simulated)",
      pg_stat_statements_installed: true,
      error: "Host unreachable: pg-read.internal (Demo profile)",
    },
    probe_status: "failed",
    probe_message: "Host unreachable: pg-read.internal (Demo profile)",
  },
  {
    id: "conn-staging-bench",
    name: "Staging Performance Test Target (Demo)",
    host: "127.0.0.1",
    port: 5432,
    database_name: "trafiora_test",
    username: "trafiora_bench",
    operational_tier: "tier_2_workload_benchmark",
    is_disposable_sandbox: true,
    capabilities: {
      connected: false,
      server_version: "PostgreSQL 18.6",
      pg_stat_statements_installed: true,
      error: "Port 5432 closed: no local PostgreSQL daemon listening",
    },
    probe_status: "failed",
    probe_message: "Connection refused: 127.0.0.1:5432",
  },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionItem[]>(DEFAULT_DEMO_CONNECTIONS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(5432);
  const [databaseName, setDatabaseName] = useState("postgres");
  const [username, setUsername] = useState("postgres");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("tier_2_workload_benchmark");
  const [isSandbox, setIsSandbox] = useState(true);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/v1/connections");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setConnections(data);
        } else {
          setConnections(DEFAULT_DEMO_CONNECTIONS);
        }
      }
    } catch {
      // Keep demo list on API network issue
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleProbe = async (connId: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, probe_status: "probing", probe_message: "Testing connection..." } : c))
    );

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/connections/${connId}/probe`, {
        method: "POST",
      });
      if (res.ok) {
        const caps = await res.json();
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connId
              ? {
                  ...c,
                  capabilities: caps,
                  probe_status: caps.connected ? "success" : "failed",
                  probe_message: caps.connected
                    ? `Connected (${caps.server_version || "PostgreSQL"})`
                    : (caps.error || "Connection failed / offline"),
                }
              : c
          )
        );
      } else {
        const err = await res.json().catch(() => ({ detail: "Probe request failed" }));
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connId
              ? {
                  ...c,
                  probe_status: "failed",
                  probe_message: err.detail || "Probe returned error status",
                }
              : c
          )
        );
      }
    } catch {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connId
            ? {
                ...c,
                probe_status: "failed",
                probe_message: "Target host is unreachable / offline",
              }
            : c
        )
      );
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `${host}:${port}/${databaseName}`,
          engine: "postgresql",
          host: host.trim(),
          port: Number(port),
          database_name: databaseName.trim(),
          username: username.trim(),
          password: password,
          ssl_mode: "prefer",
          operational_tier: tier,
          is_disposable_sandbox: isSandbox,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to create connection" }));
        throw new Error(err.detail || "Connection creation failed");
      }

      setShowAddModal(false);
      setName("");
      setPassword("");
      await fetchConnections();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to register connection");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="flex items-center gap-3">
          <button
            onClick={fetchConnections}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs text-gray-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Connection</span>
          </button>
        </div>
      </div>

      {/* Operational Tier Security Rule Callout */}
      <div className="p-4 rounded-xl glass-panel border border-indigo-800/40 bg-indigo-950/20 flex items-start gap-3.5 text-xs text-gray-300">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white text-[11px] uppercase tracking-wide block">
            Three-Tier Operational Security Model
          </span>
          <p className="leading-relaxed">
            <strong className="text-emerald-400">Tier 1 (Read-Only Observation):</strong> Zero benchmark executions permitted. Read-only observation queries only. Mutations and EXPLAIN ANALYZE are strictly rejected.<br />
            <strong className="text-amber-400">Tier 2 (Workload Benchmark Target):</strong> Explicitly authorized test database for running pgbench and measuring latency.<br />
            <strong className="text-rose-400">Tier 3 (Disposable Sandbox):</strong> Isolated disposable environment permitted for DDL index verification and destructive stress tests.
          </p>
        </div>
      </div>

      {/* Connections List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {connections.map((c) => {
          const tierVal = c.operational_tier || c.tier || "tier_1_read_only";
          const dbVal = c.database_name || c.database || "postgres";
          const isConnected = c.capabilities?.connected === true || c.probe_status === "success";

          return (
            <div key={c.id} className="glass-panel p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-white">{c.name}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    tierVal === "tier_1_read_only"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : tierVal === "tier_2_workload_benchmark"
                      ? "bg-amber-950 text-amber-300 border-amber-800"
                      : "bg-rose-950 text-rose-300 border-rose-800"
                  }`}
                >
                  {tierVal}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-gray-900/80 font-mono text-xs text-gray-300 space-y-1 border border-gray-800">
                <div><span className="text-gray-500">Host:</span> {c.host}:{c.port}</div>
                <div><span className="text-gray-500">Database:</span> {dbVal}</div>
                <div><span className="text-gray-500">Role:</span> {c.username}</div>
                <div><span className="text-gray-500">Password:</span> <span className="text-gray-500 font-sans italic">[Vault Encrypted]</span></div>
                {c.capabilities?.server_version && (
                  <div><span className="text-gray-500">Engine:</span> {c.capabilities.server_version}</div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className={`flex items-center gap-1.5 ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
                  {isConnected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate max-w-[280px]">
                    {c.probe_message || (isConnected ? "Online & Verified" : "Offline / Unchecked")}
                  </span>
                </span>
                <button
                  onClick={() => handleProbe(c.id)}
                  disabled={c.probe_status === "probing"}
                  className="px-3 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs transition-colors shrink-0 flex items-center gap-1.5"
                >
                  {c.probe_status === "probing" ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  ) : (
                    <Zap className="w-3 h-3 text-cyan-400" />
                  )}
                  <span>{c.probe_status === "probing" ? "Probing..." : "Test Connectivity"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-gray-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Register New Database Target
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateConnection} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Connection Identifier / Label</label>
                <input
                  type="text"
                  placeholder="e.g., Staging Test Target"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-gray-300 block mb-1">Host / IP</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-300 block mb-1">Database Name</label>
                  <input
                    type="text"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Database Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Password (AES-256 Vault Encrypted)</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Operational Security Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                >
                  <option value="tier_1_read_only">Tier 1: Read-Only Observation (No benchmarking)</option>
                  <option value="tier_2_workload_benchmark">Tier 2: Authorized Benchmark Test Target</option>
                  <option value="tier_3_disposable_sandbox">Tier 3: Disposable Sandbox (DDL & stress allowed)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sandbox-check"
                  checked={isSandbox}
                  onChange={(e) => setIsSandbox(e.target.checked)}
                  className="rounded border-gray-700"
                />
                <label htmlFor="sandbox-check" className="text-gray-400">
                  Explicitly flag as disposable sandbox environment
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
