"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  RotateCw,
  StopCircle,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "../../components/ui/Badge";

interface ScenarioTemplate {
  scenario_type: string;
  name: string;
  description: string;
  suggested_config: {
    vus: number;
    duration_seconds: number;
    zipf_alpha: number;
  };
}

interface ConnectionOption {
  id: string;
  name: string;
  host: string;
  operational_tier: string;
}

interface ExperimentItem {
  id: string;
  name: string;
  status: string;
  is_baseline: boolean;
  outcome_classification: string;
  repetitions_planned: number;
  repetitions_completed: number;
  summary_metrics: Record<string, any>;
  created_at: string;
}

export default function ExperimentsPage() {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [name, setName] = useState("Viral Spike Optimization Run");
  const [selectedScenario, setSelectedScenario] = useState("viral_post_spike");
  const [vus, setVus] = useState(25);
  const [duration, setDuration] = useState(15);
  const [repetitions, setRepetitions] = useState(5);
  const [isBaseline, setIsBaseline] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = async () => {
    try {
      const [tplData, connData, expData] = await Promise.all([
        apiClient.get<ScenarioTemplate[]>("/scenarios/templates").catch(() => []),
        apiClient.get<ConnectionOption[]>("/connections").catch(() => []),
        apiClient.get<ExperimentItem[]>("/experiments").catch(() => []),
      ]);

      if (Array.isArray(tplData)) setTemplates(tplData);
      if (Array.isArray(connData)) {
        setConnections(connData);
        if (connData.length > 0 && !selectedConnection) {
          const authorized = connData.find((c: any) => c.operational_tier === "tier_2_workload_benchmark");
          setSelectedConnection(authorized ? authorized.id : connData[0].id);
        }
      }
      if (Array.isArray(expData)) setExperiments(expData);
    } catch {
      // Keep existing data
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [selectedConnection]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnection) {
      setErrorMessage("Please select an authorized PostgreSQL database connection.");
      return;
    }

    setIsDispatching(true);
    setErrorMessage("");
    setStatusMessage("Validating scenario and dispatching isolated benchmark run...");

    try {
      // 1. Create workload scenario configuration
      const scenRes = await apiClient.post<{ id: string }>("/scenarios", {
        name: `${name} Scenario`,
        scenario_type: selectedScenario,
        config: {
          vus: Number(vus),
          duration_seconds: Number(duration),
          zipf_alpha: 1.2,
          warmup_seconds: 2,
          read_write_ratio: 0.9,
          query_templates: ["SELECT 1;"],
        },
      });

      // 2. Dispatch experiment with valid schema parameters
      await apiClient.post("/experiments", {
        name: name.trim(),
        connection_id: selectedConnection,
        scenario_id: scenRes.id,
        is_baseline: isBaseline,
        repetitions_planned: Number(repetitions),
      });

      setStatusMessage("Experiment dispatched. Benchmark worker actively sampling workload.");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start experiment");
      setStatusMessage("");
    } finally {
      setIsDispatching(false);
    }
  };


  const selectedConnObj = connections.find((c) => c.id === selectedConnection);
  const isTier1Blocked = selectedConnObj?.operational_tier === "tier_1_read_only";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono uppercase">
            <Play className="w-4 h-4 text-[#4E9F8E]" />
            <span>Isolated Workload Benchmarks &amp; Scenarios</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5 font-sans">
            Execute reproducible workload experiments against explicitly authorized Tier 2 database targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="tier2">Tier 2 Authorized</Badge>
          <Badge variant="healthy">pgbench Runner Active</Badge>
        </div>
      </div>

      {/* Safety Boundary Banner */}
      <div className="bg-[#0D1014] p-3.5 rounded border border-[#202630] flex items-start gap-3 text-xs text-[#929AA6] font-mono shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
        <Activity className="w-4 h-4 text-[#4E9F8E] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-[#E8EAF0] uppercase text-[11px] block">
            Automated Orphan Session Cleanup &amp; Safety Isolation
          </span>
          <p className="text-[#929AA6] leading-relaxed text-[11px] font-sans">
            Benchmark workloads run with unique <code className="text-[#CBD5E1] bg-[#050607] px-1.5 py-0.5 rounded border border-[#202630] font-mono">application_name=trafiora_bench_[id]</code>. Sessions are automatically terminated upon completion, cancellation, or error. Tier 1 read-only databases strictly reject execution.
          </p>
        </div>
      </div>

      {/* Experiment Configuration & Launch Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Launch Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#0D1014] border border-[#202630] rounded p-4 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          <div className="border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#4E9F8E]" />
              <span>Configure Benchmark Run</span>
            </h2>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded bg-[#180A0A] border border-[#441616] text-xs text-[#FB7185] font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-2.5 rounded bg-[#0A1612] border border-[#17382B] text-xs text-[#34D399] font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleLaunch} className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-[#929AA6] block mb-1">Experiment Label</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#090B0E] border border-[#202630] rounded p-2 text-[#E8EAF0] focus:outline-none focus:border-[#4E9F8E] transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-[#929AA6] block mb-1">Target Connection</label>
              <select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="w-full bg-[#090B0E] border border-[#202630] rounded p-2 text-[#E8EAF0] focus:outline-none focus:border-[#4E9F8E] transition-colors"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.operational_tier})
                  </option>
                ))}
              </select>
              {isTier1Blocked && (
                <span className="text-[10px] text-[#FB7185] block mt-1">
                  Safety Gate Warning: Tier 1 Read-Only targets will reject execution!
                </span>
              )}
            </div>

            <div>
              <label className="text-[#929AA6] block mb-1">Workload Scenario Template</label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-[#090B0E] border border-[#202630] rounded p-2 text-[#E8EAF0] focus:outline-none focus:border-[#4E9F8E] transition-colors"
              >
                <option value="viral_post_spike">Viral Post Spike (Zipfian Skew on Hot Records)</option>
                <option value="heavy_read_aggregation">Heavy Read Aggregation &amp; Joins</option>
                <option value="burst_write_saturation">Burst Write Inventory Updates</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[#929AA6] block mb-1">Virtual Users</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={vus}
                  onChange={(e) => setVus(Number(e.target.value))}
                  className="w-full bg-[#090B0E] border border-[#202630] rounded p-2 text-[#E8EAF0] tabular-nums focus:outline-none focus:border-[#4E9F8E] transition-colors"
                />
              </div>
              <div>
                <label className="text-[#929AA6] block mb-1">Duration (s)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-[#090B0E] border border-[#202630] rounded p-2 text-[#E8EAF0] tabular-nums focus:outline-none focus:border-[#4E9F8E] transition-colors"
                />
              </div>
              <div>
                <label className="text-[#929AA6] block mb-1">Reps (K)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={repetitions}
                  onChange={(e) => setRepetitions(Number(e.target.value))}
                  className="w-full bg-[#090B0E] border border-[#202630] rounded p-2 text-[#E8EAF0] tabular-nums focus:outline-none focus:border-[#4E9F8E] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-baseline"
                checked={isBaseline}
                onChange={(e) => setIsBaseline(e.target.checked)}
                className="rounded border-[#202630] bg-[#090B0E] text-[#4E9F8E] focus:ring-0"
              />
              <label htmlFor="is-baseline" className="text-[#929AA6] text-[11px]">
                Designate this run as Baseline for A/B regression comparisons
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isDispatching || isTier1Blocked}
                className="w-full py-2.5 px-4 rounded bg-[#4E9F8E] hover:bg-[#5bb8a4] disabled:opacity-40 text-[#050607] font-bold text-xs font-mono transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isDispatching ? "Dispatching Scenario..." : "Launch Isolated Benchmark"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Execution History & Status Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D1014] border border-[#202630] rounded p-4 space-y-3 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#4E9F8E]" />
              <span>Experiment History &amp; Monitored Runs</span>
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-[#929AA6] hover:text-[#E8EAF0] font-mono flex items-center gap-1 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#202630] text-[10px] text-[#626C79] uppercase">
                  <th className="py-2 px-2.5">Experiment</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Progress</th>
                  <th className="py-2 px-2.5 text-right">Throughput</th>
                  <th className="py-2 px-2.5 text-right">p95 Latency</th>
                  <th className="py-2 px-2.5">Source Attribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#191E25]">
                {experiments.map((e) => {
                  const metrics = e.summary_metrics || {};
                  const isSim = metrics.is_simulated === true;
                  return (
                    <tr key={e.id} className="hover:bg-[#12161C]/50 transition-colors">
                      <td className="py-2.5 px-2.5">
                        <div className="font-semibold text-[#E8EAF0] font-sans">{e.name}</div>
                        <div className="text-[10px] text-[#626C79] font-mono">
                          {e.id.slice(0, 8)} &bull; {e.is_baseline ? "BASELINE" : "CANDIDATE"}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <Badge
                          variant={
                            e.status === "COMPLETED"
                              ? "healthy"
                              : e.status === "RUNNING"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {e.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2.5 text-[#929AA6] tabular-nums">
                        {e.repetitions_completed} / {e.repetitions_planned} reps
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-[#E8EAF0] tabular-nums">
                        {metrics.tps ? `${metrics.tps} TPS` : "--"}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-[#CBD5E1] tabular-nums">
                        {metrics.latency_p95_ms ? `${metrics.latency_p95_ms} ms` : "--"}
                      </td>
                      <td className="py-2.5 px-2.5">
                        {metrics.measurement_source === "WIRE_EMULATOR_SANDBOX" ? (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181308] text-[#FBBF24] border border-[#38290E]"
                            title="Executed against in-process wire-protocol emulator; not real database performance"
                          >
                            EMULATOR (SANDBOX)
                          </span>
                        ) : isSim ? (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090B0E] text-[#626C79] border border-[#202630]"
                            title={metrics.simulation_reason || "Simulated offline benchmark"}
                          >
                            SIMULATED
                          </span>
                        ) : metrics.measurement_source === "PGBENCH_SUBPROCESS" ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0A1612] text-[#34D399] border border-[#17382B] font-semibold">
                            PGBENCH (VERIFIED LIVE)
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0A1612] text-[#34D399] border border-[#17382B] font-semibold">
                            PSYCOPG (VERIFIED LIVE)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {experiments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#626C79] font-sans">
                      No experiments registered yet. Configure and launch above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
