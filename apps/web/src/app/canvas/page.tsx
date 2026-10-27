"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Database,
  Disc,
  Eye,
  EyeOff,
  Flame,
  HardDrive,
  Info,
  Layers,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";

interface CanvasNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: "healthy" | "warning" | "saturated";
  telemetry: {
    primaryMetric: string;
    value: string;
    secondaryMetric?: string;
    secondaryValue?: string;
  };
  details: {
    description: string;
    queueDepth: number;
    capacityLimit: string;
    bottleneckRisk: string;
    recommendation: string;
  };
}

const CANVAS_NODES: CanvasNode[] = [
  {
    id: "clients",
    name: "Application Clients (VUs)",
    role: "Concurrent Virtual Users",
    x: 40,
    y: 120,
    width: 170,
    height: 90,
    status: "healthy",
    telemetry: {
      primaryMetric: "Arrival Rate",
      value: "1,480 QPS",
      secondaryMetric: "Distribution",
      secondaryValue: "Poisson",
    },
    details: {
      description: "Generates simulated realistic application traffic with Zipfian skew toward popular records.",
      queueDepth: 0,
      capacityLimit: "2,500 VUs",
      bottleneckRisk: "Sudden traffic spikes can saturate downstream connection pool if unthrottled.",
      recommendation: "Ensure edge token bucket rate limiting is active before traffic bursts.",
    },
  },
  {
    id: "ingress",
    name: "Ingress & Circuit Breaker",
    role: "Edge Rate Limiter",
    x: 260,
    y: 120,
    width: 170,
    height: 90,
    status: "healthy",
    telemetry: {
      primaryMetric: "Ingress Rate",
      value: "1,480 QPS",
      secondaryMetric: "Shedding",
      secondaryValue: "0%",
    },
    details: {
      description: "Acts as protective gateway; sheds excess client requests if database queue wait exceeds 5.0s.",
      queueDepth: 0,
      capacityLimit: "2,200 QPS Ceiling",
      bottleneckRisk: "Aggressive shedding can return HTTP 429s to legitimate end users.",
      recommendation: "Tune shedding threshold dynamically with Little's Law feedback.",
    },
  },
  {
    id: "pooler",
    name: "PgBouncer Connection Pooler",
    role: "Transaction Mode Pool",
    x: 480,
    y: 120,
    width: 170,
    height: 90,
    status: "healthy",
    telemetry: {
      primaryMetric: "Active Backends",
      value: "28 / 35 conn",
      secondaryMetric: "Client Wait",
      secondaryValue: "0.12 ms",
    },
    details: {
      description: "Multiplexes thousands of client TCP connections onto an optimal pool of 35 database worker processes.",
      queueDepth: 0,
      capacityLimit: "35 max_connections",
      bottleneckRisk: "Connection starvation if pool is sized larger than available CPU cores.",
      recommendation: "Sized via Little's Law: 2 * 8 cores + disk = 20-35 backends.",
    },
  },
  {
    id: "engine",
    name: "PostgreSQL 18.6 Engine",
    role: "Executor & Buffer Pool",
    x: 700,
    y: 80,
    width: 180,
    height: 100,
    status: "warning",
    telemetry: {
      primaryMetric: "Buffer Hit Ratio",
      value: "99.2%",
      secondaryMetric: "Host CPU",
      secondaryValue: "18.4%",
    },
    details: {
      description: "Executes parsed queries, maintains shared buffer cache, transaction MVCC visibility, and locks.",
      queueDepth: 2,
      capacityLimit: "8 vCPU Cores",
      bottleneckRisk: "Unindexed sequential scan on 'events' consumes 41.2% total engine execution time.",
      recommendation: "Apply verified composite index idx_events_user_created to drop CPU latency.",
    },
  },
  {
    id: "storage",
    name: "NVMe Storage Subsystem",
    role: "Tablespaces & WAL Sync",
    x: 700,
    y: 220,
    width: 180,
    height: 90,
    status: "healthy",
    telemetry: {
      primaryMetric: "WAL Write Rate",
      value: "4.2 MB/s",
      secondaryMetric: "Fsync Latency",
      secondaryValue: "0.38 ms",
    },
    details: {
      description: "Flushes dirty buffer pages to persistent NVMe disk and ensures synchronous write-ahead log commits.",
      queueDepth: 0,
      capacityLimit: "5,000 IOPS",
      bottleneckRisk: "WAL write bursts during bulk transactions can spike fsync wait latency.",
      recommendation: "Keep max_wal_size tuned to avoid frequent premature checkpoints.",
    },
  },
];

export default function CanvasPage() {
  const [selectedNode, setSelectedNode] = useState<CanvasNode>(CANVAS_NODES[2]); // PgBouncer default
  const [scenario, setScenario] = useState<string>("normal");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(150, Math.max(70, prev + delta)));
  };

  const handleResetView = () => {
    setZoomLevel(100);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-50 flex items-center gap-2 font-mono">
            <Layers className="w-5 h-5 text-brand-teal" />
            <span>INTERACTIVE WORKLOAD ARCHITECTURE &amp; FLOW CANVAS</span>
          </h1>
          <p className="text-xs text-graphite-200 mt-0.5">
            Visualizes client request flow, PgBouncer pool multiplexing, query execution backpressure, and storage bottlenecks.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* Simulation Mode Badge */}
          <Badge variant="simulated">
            ARCHITECTURAL MODEL — SIMULATED / OFFLINE
          </Badge>

          {/* Scenario Selector */}
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="bg-graphite-850 border border-graphite-600 rounded px-2.5 py-1 text-xs text-graphite-100 focus:outline-none focus:border-brand-teal"
          >
            <option value="normal">Normal Workload Flow (1,480 QPS)</option>
            <option value="viral_spike">Traffic Spike (Zipfian Skew)</option>
            <option value="cache_stampede">Cache Stampede Storm</option>
            <option value="lock_contention">Row Lock Contention</option>
          </select>

          {/* Animation Controls */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded bg-graphite-850 hover:bg-graphite-750 border border-graphite-600 text-graphite-200"
            title={isPlaying ? "Pause Flow" : "Resume Flow"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-status-warning" /> : <Play className="w-3.5 h-3.5 text-brand-teal" />}
          </button>

          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 transition-colors ${
              reducedMotion
                ? "bg-status-warningSurface text-status-warning border-status-warningBorder"
                : "bg-graphite-850 text-graphite-300 border-graphite-600 hover:text-graphite-100"
            }`}
            title="Toggle reduced motion for accessibility"
          >
            {reducedMotion ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="hidden md:inline">{reducedMotion ? "Motion Off" : "Motion On"}</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport & Node Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Flow Canvas (8 cols) */}
        <div className="lg:col-span-8 panel p-4 space-y-2 relative overflow-hidden bg-graphite-950 flex flex-col justify-between min-h-[460px]">
          {/* Zoom & Pan Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-graphite-900/90 p-1 rounded border border-graphite-600 z-10 text-xs font-mono">
            <button
              onClick={() => handleZoom(-10)}
              className="p-1 rounded hover:bg-graphite-800 text-graphite-300 hover:text-white"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-graphite-200 text-[11px]">{zoomLevel}%</span>
            <button
              onClick={() => handleZoom(10)}
              className="p-1 rounded hover:bg-graphite-800 text-graphite-300 hover:text-white"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 rounded hover:bg-graphite-800 text-graphite-300 hover:text-white"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG Diagram */}
          <div className="flex-1 w-full h-full flex items-center justify-center overflow-auto py-2">
            <svg
              viewBox="0 0 940 360"
              className="w-full h-auto max-w-full select-none"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
            >
              {/* Defs for Flow Marker & Gradients */}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#66D9C0" />
                </marker>
              </defs>

              {/* Connecting Data Flow Lines */}
              {/* Clients -> Ingress */}
              <line
                x1="210"
                y1="165"
                x2="260"
                y2="165"
                stroke="#66D9C0"
                strokeWidth="2"
                strokeDasharray={isPlaying && !reducedMotion ? "4 3" : undefined}
                className={isPlaying && !reducedMotion ? "animate-pulse" : ""}
                markerEnd="url(#arrow)"
              />

              {/* Ingress -> Pooler */}
              <line
                x1="430"
                y1="165"
                x2="480"
                y2="165"
                stroke="#66D9C0"
                strokeWidth="2"
                strokeDasharray={isPlaying && !reducedMotion ? "4 3" : undefined}
                className={isPlaying && !reducedMotion ? "animate-pulse" : ""}
                markerEnd="url(#arrow)"
              />

              {/* Pooler -> Engine */}
              <path
                d="M 650 165 C 675 165, 675 130, 700 130"
                fill="none"
                stroke="#66D9C0"
                strokeWidth="2"
                strokeDasharray={isPlaying && !reducedMotion ? "4 3" : undefined}
                className={isPlaying && !reducedMotion ? "animate-pulse" : ""}
                markerEnd="url(#arrow)"
              />

              {/* Engine -> Storage (WAL Flush) */}
              <path
                d="M 790 180 L 790 220"
                fill="none"
                stroke="#9AA5B1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                markerEnd="url(#arrow)"
              />

              {/* Render Architectural Nodes */}
              {CANVAS_NODES.map((node) => {
                const isSelected = selectedNode.id === node.id;
                const isWarning = node.status === "warning";
                const isSaturated = node.status === "saturated";

                const strokeColor = isSelected
                  ? "#66D9C0"
                  : isSaturated
                  ? "#EF4444"
                  : isWarning
                  ? "#F59E0B"
                  : "#222A35";

                const fillColor = isSelected
                  ? "#181D25"
                  : "#12161C";

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer transition-all"
                  >
                    {/* Node Container Box */}
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx="8"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "2" : "1.2"}
                    />

                    {/* Node Header Label */}
                    <text
                      x={node.x + 12}
                      y={node.y + 22}
                      className="text-[11px] font-mono font-bold fill-[#E8EDF3]"
                    >
                      {node.name.length > 20 ? node.name.slice(0, 19) + "..." : node.name}
                    </text>

                    {/* Role Subtitle */}
                    <text
                      x={node.x + 12}
                      y={node.y + 36}
                      className="text-[9px] font-mono fill-[#9AA5B1]"
                    >
                      {node.role}
                    </text>

                    {/* Divider */}
                    <line
                      x1={node.x}
                      y1={node.y + 45}
                      x2={node.x + node.width}
                      y2={node.y + 45}
                      stroke="#222A35"
                      strokeWidth="0.8"
                    />

                    {/* Primary Metric */}
                    <text
                      x={node.x + 12}
                      y={node.y + 62}
                      className="text-[9px] font-mono fill-[#596573]"
                    >
                      {node.telemetry.primaryMetric}:
                    </text>
                    <text
                      x={node.x + node.width - 12}
                      y={node.y + 62}
                      textAnchor="end"
                      className="text-[10px] font-mono font-bold fill-[#66D9C0]"
                    >
                      {node.telemetry.value}
                    </text>

                    {/* Secondary Metric */}
                    {node.telemetry.secondaryMetric && (
                      <>
                        <text
                          x={node.x + 12}
                          y={node.y + 78}
                          className="text-[9px] font-mono fill-[#596573]"
                        >
                          {node.telemetry.secondaryMetric}:
                        </text>
                        <text
                          x={node.x + node.width - 12}
                          y={node.y + 78}
                          textAnchor="end"
                          className="text-[10px] font-mono font-bold fill-[#E8EDF3]"
                        >
                          {node.telemetry.secondaryValue}
                        </text>
                      </>
                    )}

                    {/* Warning / Saturated Icon Badge */}
                    {isWarning && (
                      <circle cx={node.x + node.width - 10} cy={node.y + 12} r="4" fill="#F59E0B" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Canvas Footer Legend */}
          <div className="flex items-center justify-between text-[11px] font-mono text-graphite-300 border-t border-graphite-600/80 pt-2 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-teal" />
                <span>Healthy Component</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-warning" />
                <span>Bottleneck Warning</span>
              </span>
            </div>
            <span>Click any node to inspect queue depth &amp; capacity</span>
          </div>
        </div>

        {/* Right Column: Node Inspector Drawer (4 cols) */}
        <div className="lg:col-span-4 panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-3">
            <div>
              <span className="text-[10px] font-mono text-graphite-300 uppercase block">
                Component Telemetry Inspector
              </span>
              <h2 className="text-sm font-bold text-graphite-50 font-mono">{selectedNode.name}</h2>
            </div>
            <Badge
              variant={
                selectedNode.status === "healthy"
                  ? "healthy"
                  : selectedNode.status === "warning"
                  ? "warning"
                  : "critical"
              }
            >
              {selectedNode.status.toUpperCase()}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-xs text-graphite-200 leading-relaxed">
            {selectedNode.details.description}
          </p>

          {/* Resource & Capacity Limits */}
          <div className="p-3 rounded bg-graphite-850 border border-graphite-600 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-graphite-300">Current Queue Depth:</span>
              <span className="text-graphite-50 font-bold tabular-nums">
                {selectedNode.details.queueDepth} requests
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Operational Ceiling:</span>
              <span className="text-graphite-100">{selectedNode.details.capacityLimit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Telemetry Driver:</span>
              <span className="text-brand-teal">Simulated Model</span>
            </div>
          </div>

          {/* Risk & Bottleneck Finding */}
          <div className="space-y-1.5 text-xs">
            <span className="font-semibold text-status-warning font-mono text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Observed Risk Factor:</span>
            </span>
            <p className="p-2.5 rounded bg-status-warningSurface border border-status-warningBorder text-graphite-100 text-[11px] leading-relaxed">
              {selectedNode.details.bottleneckRisk}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="p-3 rounded bg-graphite-950 border border-graphite-600 space-y-1.5 text-xs">
            <span className="font-semibold text-graphite-50 font-mono text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-brand-teal" />
              <span>Engine Recommendation:</span>
            </span>
            <p className="text-graphite-200 text-[11px] leading-relaxed">
              {selectedNode.details.recommendation}
            </p>
          </div>

          {/* Quick Action Link */}
          <div className="pt-2">
            <Link
              href="/protection"
              className="w-full py-1.5 px-3 rounded bg-graphite-800 hover:bg-graphite-750 border border-graphite-500 text-xs font-mono text-graphite-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Tune Protection Sizing &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
