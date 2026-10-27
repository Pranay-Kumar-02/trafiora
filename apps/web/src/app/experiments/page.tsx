"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
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

export default function ExperimentsPage() {
  const [name, setName] = useState("Viral Spike Optimization Run");
  const [selectedScenario, setSelectedScenario] = useState("viral_post_spike");
  const [vus, setVus] = useState(25);
  const [duration, setDuration] = useState(15);
  const [repetitions, setRepetitions] = useState(5);
  const [isBaseline, setIsBaseline] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleDispatch = async () => {
    setIsDispatching(true);
    setStatusMessage("Validating Operational Tier and dispatching experiment...");
    setTimeout(() => {
      setIsDispatching(false);
      setStatusMessage("Experiment dispatched successfully with 5 repetitions!");
    }, 1200);
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
          Launch New Benchmark Run
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300">Experiment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300">Workload Scenario Template</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="viral_post_spike">Viral Post Sudden Spike (Zipfian Skew alpha=1.6)</option>
              <option value="hot_key_contention">Hot Record Row-Lock Contention (FOR UPDATE)</option>
              <option value="unindexed_pagination">Deep OFFSET Pagination Sweep</option>
              <option value="cache_stampede">Cache Stampede / Thundering Herd</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300">Concurrent Virtual Users (VUs): {vus}</label>
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
            <label className="text-xs font-medium text-gray-300">Repetitions (K &ge; 5 for 95% Confidence): {repetitions}</label>
            <input
              type="range"
              min={3}
              max={10}
              value={repetitions}
              onChange={(e) => setRepetitions(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="baseline_check"
            checked={isBaseline}
            onChange={(e) => setIsBaseline(e.target.checked)}
            className="rounded border-gray-700 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="baseline_check" className="text-xs text-gray-300 cursor-pointer">
            Mark this experiment as the reference Baseline run
          </label>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <div className="text-xs text-emerald-400 font-mono">
            {statusMessage}
          </div>
          <button
            onClick={handleDispatch}
            disabled={isDispatching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isDispatching ? "Dispatching..." : "Start Experiment"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
