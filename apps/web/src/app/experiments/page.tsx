"use client";

import { useEffect, useState } from "react";
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

  const fetchData = async () => {
    try {
      // 1. Templates
      const tRes = await fetch("/api/v1/scenarios/templates");
      if (tRes.ok) setTemplates(await tRes.json());

      // 2. Connections
      const cRes = await fetch("/api/v1/connections");
      if (cRes.ok) {
        const conns: ConnectionOption[] = await cRes.json();
        setConnections(conns);
        if (conns.length > 0 && !selectedConnection) {
          // Default to first Tier 2 or 3 connection
          const candidate = conns.find((c) => c.operational_tier !== "tier_1_read_only") || conns[0];
          setSelectedConnection(candidate.id);
        }
      }

      // 3. Experiments
      const eRes = await fetch("/api/v1/experiments");
      if (eRes.ok) setExperiments(await eRes.json());
    } catch {
      // Demo fallback when API is starting
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async () => {
    setIsDispatching(true);
    setErrorMessage("");
    setStatusMessage("Creating scenario and dispatching benchmark experiment...");

    try {
      // 1. Create scenario first
      const scenRes = await fetch("/api/v1/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${name} Scenario`,
          scenario_type: selectedScenario,
          config: {
            vus: Number(vus),
            duration_seconds: Number(duration),
            warmup_seconds: 2,
            zipf_alpha: 1.5,
            read_write_ratio: 0.9,
            query_templates: ["SELECT * FROM posts WHERE id = $1;"],
          },
        }),
      });

      if (!scenRes.ok) {
        const err = await scenRes.json();
        throw new Error(err.detail || "Failed to create workload scenario");
      }
      const scenData = await scenRes.json();

      // 2. Dispatch experiment
      const connId = selectedConnection || (connections[0]?.id ?? "mock-conn-id");
      const expRes = await fetch("/api/v1/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          connection_id: connId,
          scenario_id: scenData.id,
          is_baseline: isBaseline,
          repetitions_planned: Number(repetitions),
        }),
      });

      if (!expRes.ok) {
        const err = await expRes.json();
        throw new Error(err.detail || "Experiment dispatch failed");
      }

      const createdExp = await expRes.json();
      setStatusMessage(`Experiment '${createdExp.name}' queued! Live execution started.`);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatusMessage("");
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Play className="w-6 h-6 text-indigo-400" />
          Isolated Benchmark Experiment Orchestrator
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure and execute safe, isolated database workload experiments with dedicated runner isolation and verified session cleanup.
        </p>
      </div>

      {/* Experiment Dispatch Form */}
      <div className="glass-panel p-6 rounded-2xl space-y-5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Launch Benchmark Run
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium">Experiment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium">Target Database Connection</label>
            <select
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.host} &bull; {c.operational_tier})
                </option>
              ))}
              {connections.length === 0 && (
                <option value="">Staging Perf Target (Default)</option>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium">Workload Scenario Template</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {templates.map((t) => (
                <option key={t.scenario_type} value={t.scenario_type}>
                  {t.name}
                </option>
              ))}
              {templates.length === 0 && (
                <>
                  <option value="viral_post_spike">Viral Post Sudden Spike (Zipfian Skew alpha=1.6)</option>
                  <option value="hot_key_contention">Hot Record Row-Lock Contention (FOR UPDATE)</option>
                  <option value="unindexed_pagination">Deep OFFSET Pagination Sweep</option>
                  <option value="cache_stampede">Cache Stampede / Thundering Herd</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium">Virtual Users (VUs): {vus}</label>
            <input
              type="range"
              min={1}
              max={100}
              value={vus}
              onChange={(e) => setVus(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium">Repetitions (K &ge; 5 for 95% Confidence): {repetitions}</label>
            <input
              type="range"
              min={3}
              max={10}
              value={repetitions}
              onChange={(e) => setRepetitions(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-1.5 flex items-center pt-5">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isBaseline}
                onChange={(e) => setIsBaseline(e.target.checked)}
                className="rounded border-gray-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Mark as Baseline Experiment</span>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleDispatch}
            disabled={isDispatching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isDispatching ? "Dispatching..." : "Launch Experiment"}</span>
          </button>
        </div>
      </div>

      {/* Experiments History Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Live Benchmark Experiment Runs</h2>
          <button onClick={fetchData} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Experiment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Progress</th>
                <th className="py-2.5 px-3">Throughput</th>
                <th className="py-2.5 px-3">Latency p95</th>
                <th className="py-2.5 px-3">Source & Mode</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
              {experiments.map((e) => {
                const metrics = e.summary_metrics || {};
                const isSim = metrics.is_simulated === true;
                return (
                  <tr key={e.id} className="hover:bg-gray-900/40">
                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-white">{e.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{e.id.slice(0, 8)}... &bull; {e.is_baseline ? "BASELINE" : "CANDIDATE"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                        e.status === "COMPLETED" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        e.status === "RUNNING" ? "bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse" :
                        "bg-gray-800 text-gray-300"
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-300">
                      {e.repetitions_completed} / {e.repetitions_planned} reps
                    </td>
                    <td className="py-3 px-3 text-white font-semibold">
                      {metrics.tps ? `${metrics.tps} TPS` : "--"}
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      {metrics.latency_p95_ms ? `${metrics.latency_p95_ms} ms` : "--"}
                    </td>
                    <td className="py-3 px-3">
                      {isSim ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 font-sans" title={metrics.simulation_reason}>
                          [SIMULATED - DB Offline]
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-sans">
                          {metrics.measurement_source || "LIVE"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans text-[11px] text-gray-300">
                      {e.outcome_classification}
                    </td>
                  </tr>
                );
              })}
              {experiments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500 font-sans">
                    No experiments launched yet. Use the form above to run your first benchmark.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
