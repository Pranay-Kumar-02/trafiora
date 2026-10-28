"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { apiClient } from "@/lib/api-client";
import { Badge } from "../../components/ui/Badge";

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
  is_simulated?: boolean;
  capabilities?: {
    connected?: boolean;
    server_version?: string;
    has_pg_stat_statements?: boolean;
    pg_stat_statements_installed?: boolean;
    has_hypopg?: boolean;
    error?: string;
  };
  probe_status?: "idle" | "probing" | "success" | "failed";
  probe_message?: string;
}

const SAMPLE_DEMO_CONNECTIONS: ConnectionItem[] = [
  {
    id: "conn-demo-read-replica",
    name: "Production Read Replica (Simulated Demo Profile)",
    host: "pg-read.internal",
    port: 5432,
    database_name: "prod_app",
    username: "trafiora_monitor",
    operational_tier: "tier_1_read_only",
    is_disposable_sandbox: false,
    is_simulated: true,
    capabilities: {
      connected: false,
      server_version: "PostgreSQL 18.6 (Simulated)",
      has_pg_stat_statements: true,
      error: "Host unreachable (Simulated Profile - Not connected to live target)",
    },
    probe_status: "failed",
    probe_message: "Simulated Profile (Not a live verified database target)",
  },
  {
    id: "conn-demo-staging-bench",
    name: "Staging Perf Test Target (Simulated Demo Profile)",
    host: "127.0.0.1",
    port: 5432,
    database_name: "trafiora_test",
    username: "trafiora_bench",
    operational_tier: "tier_2_workload_benchmark",
    is_disposable_sandbox: true,
    is_simulated: true,
    capabilities: {
      connected: false,
      server_version: "PostgreSQL 18.6 (Simulated)",
      has_pg_stat_statements: true,
      error: "Target not connected (Simulated Profile)",
    },
    probe_status: "failed",
    probe_message: "Simulated Profile (Not a live verified database target)",
  },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [showDemoProfiles, setShowDemoProfiles] = useState<boolean>(false);
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
      const data = await apiClient.get<ConnectionItem[]>("/connections");
      if (Array.isArray(data)) {
        setConnections(data);
      }
    } catch {
      // Retain existing state on fetch error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleProbe = async (connId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connId ? { ...c, probe_status: "probing", probe_message: "Probing target host..." } : c
      )
    );

    try {
      const caps = await apiClient.post<any>(`/connections/${connId}/probe`);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connId
            ? {
                ...c,
                capabilities: caps,
                probe_status: caps.connected ? "success" : "failed",
                probe_message: caps.connected
                  ? `Connected: ${caps.server_version} | pg_stat_statements: ${caps.has_pg_stat_statements ? "Yes" : "No"}`
                  : `Offline: ${caps.error || "Host unreachable"}`,
              }
            : c
        )
      );
    } catch (err: any) {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connId
            ? {
                ...c,
                probe_status: "failed",
                probe_message: err.message || "Connection probe failed",
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
      await apiClient.post("/connections", {
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
      });

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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-50 flex items-center gap-2 font-mono">
            <RotateCw className="w-5 h-5 text-brand-teal" />
            <span>DATABASE TARGET CONNECTIONS &amp; OPERATIONAL TIERS</span>
          </h1>
          <p className="text-xs text-graphite-200 mt-0.5">
            Manage target database connections with AES-256 vault encryption and strict operational tier safety boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchConnections}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-graphite-800 hover:bg-graphite-750 border border-graphite-600 text-xs font-mono text-graphite-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-teal hover:bg-brand-tealLight text-graphite-950 font-bold text-xs font-mono transition-colors shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Connection</span>
          </button>
        </div>
      </div>

      {/* Three-Tier Operational Security Model Callout */}
      <div className="panel p-3.5 border-graphite-600 bg-graphite-850 flex items-start gap-3 text-xs text-graphite-200 font-mono">
        <Shield className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-graphite-50 uppercase text-[11px] block">
            Three-Tier Operational Security Model
          </span>
          <p className="text-graphite-300 leading-relaxed text-[11px] font-sans">
            <strong className="text-status-success font-semibold">Tier 1 (Read-Only Observation):</strong> Zero benchmark executions permitted. All DDL/DML and EXPLAIN ANALYZE are strictly blocked.<br />
            <strong className="text-status-warning font-semibold">Tier 2 (Workload Benchmark Target):</strong> Explicitly authorized test database for running pgbench and measuring latency.<br />
            <strong className="text-status-error font-semibold">Tier 3 (Disposable Sandbox):</strong> Isolated sandbox permitted for DDL index verification and destructive stress tests.
          </p>
        </div>
      </div>

      {/* Empty State when no connections exist */}
      {connections.length === 0 && !isLoading && (
        <div className="panel p-8 text-center space-y-3 border-dashed border-graphite-600">
          <Database className="w-8 h-8 text-graphite-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-graphite-100 font-mono">No Registered Database Targets</h3>
            <p className="text-xs text-graphite-300 max-w-md mx-auto">
              No live database connections are currently registered. Register an authorized PostgreSQL instance or view simulated demo profiles.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded bg-brand-teal text-graphite-950 font-bold text-xs font-mono hover:bg-brand-tealLight transition-colors"
            >
              Add Connection
            </button>
            <button
              onClick={() => setConnections(SAMPLE_DEMO_CONNECTIONS)}
              className="px-3 py-1.5 rounded bg-graphite-800 border border-graphite-600 text-graphite-200 text-xs font-mono hover:bg-graphite-750 transition-colors"
            >
              Load Simulated Demo Profiles
            </button>
          </div>
        </div>
      )}

      {/* Connections List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((c) => {
          const tierVal = c.operational_tier || c.tier || "tier_1_read_only";
          const dbVal = c.database_name || c.database || "postgres";
          const isConnected = c.capabilities?.connected === true || c.probe_status === "success";

          return (
            <div key={c.id} className="panel p-4 space-y-3 panel-interactive">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-teal" />
                  <span className="font-bold text-xs text-graphite-50 font-sans">{c.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.is_simulated && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-graphite-800 text-graphite-300 border border-graphite-600">
                      SIMULATED
                    </span>
                  )}
                  <Badge
                    variant={
                      tierVal === "tier_1_read_only"
                        ? "tier1"
                        : tierVal === "tier_2_workload_benchmark"
                        ? "tier2"
                        : "tier3"
                    }
                  >
                    {tierVal}
                  </Badge>
                </div>
              </div>


              <div className="p-2.5 rounded bg-graphite-950 font-mono text-xs text-graphite-200 space-y-1 border border-graphite-600">
                <div><span className="text-graphite-400">Host:</span> <strong className="text-graphite-100">{c.host}:{c.port}</strong></div>
                <div><span className="text-graphite-400">Database:</span> {dbVal}</div>
                <div><span className="text-graphite-400">Role:</span> {c.username}</div>
                <div><span className="text-graphite-400">Credentials:</span> <span className="text-brand-teal font-sans italic text-[11px]">[Vault Encrypted]</span></div>
                {c.capabilities?.server_version && (
                  <div><span className="text-graphite-400">Engine:</span> {c.capabilities.server_version}</div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className={`flex items-center gap-1.5 ${isConnected ? "text-status-success" : "text-status-warning"}`}>
                  {isConnected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate max-w-[240px] text-[11px] font-mono">
                    {c.probe_message || (isConnected ? "Online & Verified" : "Offline / Unchecked")}
                  </span>
                </span>
                <button
                  onClick={() => handleProbe(c.id)}
                  disabled={c.probe_status === "probing"}
                  className="px-2.5 py-1 rounded bg-graphite-800 hover:bg-graphite-750 border border-graphite-600 text-graphite-100 text-xs font-mono transition-colors shrink-0 flex items-center gap-1.5"
                >
                  {c.probe_status === "probing" ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-brand-teal" />
                  ) : (
                    <Zap className="w-3 h-3 text-brand-teal" />
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
          <div className="panel w-full max-w-lg p-5 border border-graphite-500 space-y-4 shadow-elevated bg-graphite-900">
            <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
              <h2 className="text-xs font-bold text-graphite-50 font-mono uppercase flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-teal" />
                <span>Register New Database Target</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-graphite-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-status-errorSurface border border-status-errorBorder text-xs text-status-error font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateConnection} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite-300 block mb-1">Target Name / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g., Staging Benchmark Target"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 focus:outline-none focus:border-brand-teal"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-graphite-300 block mb-1">Host / IP</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 focus:outline-none focus:border-brand-teal"
                    required
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 tabular-nums focus:outline-none focus:border-brand-teal"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-graphite-300 block mb-1">Database Name</label>
                  <input
                    type="text"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                    className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 focus:outline-none focus:border-brand-teal"
                    required
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 focus:outline-none focus:border-brand-teal"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1">Password (Vault Encrypted with AES-256)</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1">Operational Security Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full bg-graphite-950 border border-graphite-600 rounded p-2 text-graphite-50 focus:outline-none focus:border-brand-teal"
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
                  className="rounded border-graphite-600"
                />
                <label htmlFor="sandbox-check" className="text-graphite-300">
                  Explicitly flag as disposable sandbox environment
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-graphite-600">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-graphite-800 hover:bg-graphite-750 text-graphite-300 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-brand-teal hover:bg-brand-tealLight text-graphite-950 font-bold font-mono shadow-subtle flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Save Target Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
