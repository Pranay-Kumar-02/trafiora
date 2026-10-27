"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Database,
  Disc,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Pause,
  Play,
  Server,
  Shield,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";

interface NodeData {
  id: string;
  title: string;
  subtitle: string;
  category: "client" | "proxy" | "pooler" | "cache" | "database" | "storage";
  metrics: Record<string, string>;
  status: "healthy" | "warning" | "saturated";
  details: string;
}

const ARCHITECTURE_NODES: NodeData[] = [
  {
    id: "clients",
    title: "Application Clients (VUs)",
    subtitle: "50 Concurrent Virtual Users",
    category: "client",
    metrics: { "Arrival Rate": "1,480 QPS", "Process": "Poisson Arrival", "Skew": "Zipf alpha = 1.6" },
    status: "healthy",
    details: "Dispatches read-heavy queries with sudden traffic spikes focused on popular keys.",
  },
  {
    id: "ingress",
    title: "Edge Proxy & Rate Limiter",
    subtitle: "Envoy Circuit Breaker",
    category: "proxy",
    metrics: { "Ingress QPS": "1,480", "Rate Limit Ceiling": "2,250 QPS", "Shedded": "0 QPS" },
    status: "healthy",
    details: "Guards ingress against thundering herds and sheds excessive traffic when backpressure builds.",
  },
  {
    id: "pooler",
    title: "Connection Pooler (PgBouncer)",
    subtitle: "Transaction Pooling Mode",
    category: "pooler",
    metrics: { "Client Conns": "50", "Active Server Conns": "28 / 35", "Wait Queue": "0" },
    status: "healthy",
    details: "Multiplexes thousands of client connections onto a small, optimal set of database backends using Little's Law.",
  },
  {
    id: "cache",
    title: "Optional Cache Layer",
    subtitle: "Key-Value Read Cache",
    category: "cache",
    metrics: { "Cache Hit Ratio": "84.2%", "Stampede Protection": "Active", "TTL": "60s" },
    status: "warning",
    details: "Absorbs reads for hot content; thundering herd locks prevent stampedes on cache misses.",
  },
  {
    id: "database",
    title: "PostgreSQL 18.6 Engine",
    subtitle: "Executor & Buffer Pool",
    category: "database",
    metrics: { "Buffer Hit Ratio": "99.2%", "Host CPU": "18.4%", "Monitor Budget": "0.58% (< 1%)" },
    status: "healthy",
    details: "Executes queries, manages shared buffer cache, transaction locks, and MVCC visibility.",
  },
  {
    id: "storage",
    title: "Storage Engine & WAL",
    subtitle: "NVMe Tablespaces & WAL Sync",
    category: "storage",
    metrics: { "WAL Write Rate": "4.2 MB/s", "Fsync Latency": "0.38 ms", "IOPS": "1,240" },
    status: "healthy",
    details: "Persists transaction writes, write-ahead logs, and dirty buffer page flushes.",
  },
];

export default function ArchitectureCanvasPage() {
  const [selectedNode, setSelectedNode] = useState<NodeData>(ARCHITECTURE_NODES[2]);
  const [scenario, setScenario] = useState<string>("normal");
  const [trafficRate, setTrafficRate] = useState<number>(1480);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            Interactive Workload Architecture & Flow Canvas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Visualizes real-time request flow, queue backpressure, connection pool multiplexing, and database engine resources.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5 bg-gray-950/80 p-2 rounded-xl border border-gray-800">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs flex items-center gap-1.5"
            title={isPlaying ? "Pause Flow" : "Resume Flow"}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
          </button>

          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              reducedMotion
                ? "bg-amber-950/60 text-amber-300 border-amber-800"
                : "bg-gray-900 text-gray-400 hover:text-white border-gray-800"
            }`}
            title="Toggle animations for accessibility"
          >
            {reducedMotion ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{reducedMotion ? "Reduced Motion: ON" : "Motion: Active"}</span>
          </button>

          {/* Scenario Selector */}
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="normal">Normal Workload Flow</option>
            <option value="viral_spike">Viral Post Spike (Zipfian Skew)</option>
            <option value="cache_stampede">Cache Stampede / Miss Storm</option>
            <option value="lock_contention">Row Lock Contention</option>
          </select>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Diagram (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[520px]">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "radial-gradient(#4f46e5 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Canvas Topology Nodes */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
            {ARCHITECTURE_NODES.map((node, index) => {
              const isSelected = selectedNode.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/20"
                      : "bg-gray-950/70 border-gray-800/80 hover:border-gray-700 hover:bg-gray-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                      <span className="font-semibold text-xs text-white tracking-wide">{node.title}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                      {node.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 mb-3">{node.subtitle}</p>

                  {/* Flow Animation Bar */}
                  <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full ${
                        !reducedMotion && isPlaying ? "animate-pulse" : ""
                      }`}
                      style={{ width: "75%" }}
                    />
                  </div>

                  {/* Primary Metric Preview */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-500">{Object.keys(node.metrics)[0]}</span>
                    <span className="text-cyan-400 font-semibold">{Object.values(node.metrics)[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canvas Bottom Legend */}
          <div className="relative z-10 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Healthy Flow</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Contention Warning</span>
              </span>
            </div>
            <span className="text-[11px] text-gray-500">Click any component to inspect telemetry</span>
          </div>
        </div>

        {/* Right: Component Telemetry Drawer (1 Col) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Component Telemetry</div>
              <h2 className="text-base font-bold text-white mt-0.5">{selectedNode.title}</h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/50 uppercase">
              {selectedNode.status}
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            {selectedNode.details}
          </p>

          {/* Telemetry Metrics */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Diagnostic Readings</h3>
            {Object.entries(selectedNode.metrics).map(([key, val]) => (
              <div key={key} className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between font-mono text-xs">
                <span className="text-gray-400">{key}</span>
                <span className="text-white font-semibold">{val}</span>
              </div>
            ))}
          </div>

          {/* Safety & Isolation Policies */}
          <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2 text-xs">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide block">
              Circuit Breaker & Safeguards
            </span>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Target instance is protected with strict timeouts: statement_timeout (3000ms), max pool size (35 backends), and zero OS host cache flush executions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
