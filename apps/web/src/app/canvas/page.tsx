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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono">
            <Layers className="w-5 h-5 text-[#4E9F8E]" />
            <span>INTERACTIVE WORKLOAD ARCHITECTURE &amp; FLOW CANVAS</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5">
            Visualizes client request flow, PgBouncer pool multiplexing, query execution backpressure, and storage bottlenecks.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          {/* Simulation Mode Badge */}
          <Badge variant="simulated">
            ARCHITECTURAL MODEL &bull; SIMULATION (OFFLINE)
          </Badge>

          {/* Scenario Selector */}
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="bg-[#090B0E] border border-[#202630] rounded px-2.5 py-1 text-xs text-[#E8EAF0] focus:outline-none focus:border-[#364354] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
          >
            <option value="normal">Normal Workload Flow (1,480 QPS)</option>
            <option value="viral_spike">Traffic Spike (Zipfian Skew)</option>
            <option value="cache_stampede">Cache Stampede Storm</option>
            <option value="lock_contention">Row Lock Contention</option>
          </select>

          {/* Animation Controls */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-[#0D1014] hover:bg-[#12161C] border border-[#202630] text-[#CBD5E1] transition-colors"
            title={isPlaying ? "Pause Flow" : "Resume Flow"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#FBBF24]" /> : <Play className="w-3.5 h-3.5 text-[#4E9F8E]" />}
          </button>

          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 transition-colors ${
              reducedMotion
                ? "bg-[#191408] text-[#FBBF24] border-[#38290E]"
                : "bg-[#0D1014] text-[#626C79] border-[#202630] hover:text-[#CBD5E1]"
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
        <div className="lg:col-span-8 panel p-4 space-y-2 relative overflow-hidden bg-[#050607] flex flex-col justify-between min-h-[460px] border border-[#202630]">
          {/* Zoom & Pan Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#090B0E]/90 p-1 rounded border border-[#202630] z-10 text-xs font-mono shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
            <button
              onClick={() => handleZoom(-10)}
              className="p-1 rounded hover:bg-[#12161C] text-[#626C79] hover:text-[#E8EAF0] transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[#CBD5E1] text-[11px]">{zoomLevel}%</span>
            <button
              onClick={() => handleZoom(10)}
              className="p-1 rounded hover:bg-[#12161C] text-[#626C79] hover:text-[#E8EAF0] transition-colors"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 rounded hover:bg-[#12161C] text-[#626C79] hover:text-[#E8EAF0] transition-colors"
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
              {/* Defs for Flow Marker, Spatial Grid & Depth Shadows */}
              <defs>
                {/* Subtle low-contrast spatial grid */}
                <pattern
                  id="spatialGrid"
                  width="30"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 30 0 L 0 0 0 30"
                    fill="none"
                    stroke="#11151B"
                    strokeWidth="0.6"
                  />
                  <circle cx="30" cy="30" r="0.75" fill="#1A212B" />
                </pattern>

                {/* Restrained arrow marker */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#4E9F8E" />
                </marker>

                {/* Deep obsidian depth shadow for selected node */}
                <filter id="nodeShadow" x="-15%" y="-15%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.85" />
                </filter>
              </defs>

              {/* Spatial Grid Background */}
              <rect width="940" height="360" fill="url(#spatialGrid)" />

              {/* Physical Connection Paths */}
              {/* Clients -> Ingress Path */}
              <path
                id="path-clients-ingress"
                d="M 210 165 L 260 165"
                fill="none"
                stroke="#28323F"
                strokeWidth="1.8"
                markerEnd="url(#arrow)"
              />

              {/* Ingress -> Pooler Path */}
              <path
                id="path-ingress-pooler"
                d="M 430 165 L 480 165"
                fill="none"
                stroke="#28323F"
                strokeWidth="1.8"
                markerEnd="url(#arrow)"
              />

              {/* Pooler -> Engine Path */}
              <path
                id="path-pooler-engine"
                d="M 650 165 C 675 165, 675 130, 700 130"
                fill="none"
                stroke="#28323F"
                strokeWidth="1.8"
                markerEnd="url(#arrow)"
              />

              {/* Engine -> Storage (WAL Flush) Path */}
              <path
                id="path-engine-storage"
                d="M 790 180 L 790 220"
                fill="none"
                stroke="#202630"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                markerEnd="url(#arrow)"
              />

              {/* Controlled request flow particles along connections (when active and motion allowed) */}
              {isPlaying && !reducedMotion && (
                <>
                  <circle r="2.5" fill="#4E9F8E">
                    <animateMotion
                      dur="1.8s"
                      repeatCount="indefinite"
                      path="M 210 165 L 260 165"
                    />
                  </circle>
                  <circle r="2.5" fill="#4E9F8E">
                    <animateMotion
                      dur="1.8s"
                      repeatCount="indefinite"
                      path="M 430 165 L 480 165"
                    />
                  </circle>
                  <circle r="2.5" fill="#CBD5E1">
                    <animateMotion
                      dur="2.2s"
                      repeatCount="indefinite"
                      path="M 650 165 C 675 165, 675 130, 700 130"
                    />
                  </circle>
                  <circle r="1.8" fill="#626C79">
                    <animateMotion
                      dur="3.0s"
                      repeatCount="indefinite"
                      path="M 790 180 L 790 220"
                    />
                  </circle>
                </>
              )}

              {/* Render Architectural Nodes */}
              {CANVAS_NODES.map((node) => {
                const isSelected = selectedNode.id === node.id;
                const isWarning = node.status === "warning";
                const isSaturated = node.status === "saturated";

                const strokeColor = isSelected
                  ? "#4E9F8E"
                  : isSaturated
                  ? "#FB7185"
                  : isWarning
                  ? "#FBBF24"
                  : "#202630";

                const fillColor = isSelected
                  ? "#12161C"
                  : "#0D1014";

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer transition-all"
                    filter={isSelected ? "url(#nodeShadow)" : undefined}
                  >
                    {/* Node Container Box */}
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx="6"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "1.5" : "1"}
                    />

                    {/* Node Header Label */}
                    <text
                      x={node.x + 12}
                      y={node.y + 22}
                      className="text-[11px] font-mono font-bold fill-[#E8EAF0]"
                    >
                      {node.name.length > 20 ? node.name.slice(0, 19) + "..." : node.name}
                    </text>

                    {/* Role Subtitle */}
                    <text
                      x={node.x + 12}
                      y={node.y + 36}
                      className="text-[9px] font-mono fill-[#929AA6]"
                    >
                      {node.role}
                    </text>

                    {/* Divider */}
                    <line
                      x1={node.x}
                      y1={node.y + 45}
                      x2={node.x + node.width}
                      y2={node.y + 45}
                      stroke="#202630"
                      strokeWidth="0.8"
                    />

                    {/* Primary Metric */}
                    <text
                      x={node.x + 12}
                      y={node.y + 62}
                      className="text-[9px] font-mono fill-[#626C79]"
                    >
                      {node.telemetry.primaryMetric}:
                    </text>
                    <text
                      x={node.x + node.width - 12}
                      y={node.y + 62}
                      textAnchor="end"
                      className="text-[10px] font-mono font-bold fill-[#E8EAF0] tabular-nums"
                    >
                      {node.telemetry.value}
                    </text>

                    {/* Secondary Metric */}
                    {node.telemetry.secondaryMetric && (
                      <>
                        <text
                          x={node.x + 12}
                          y={node.y + 78}
                          className="text-[9px] font-mono fill-[#626C79]"
                        >
                          {node.telemetry.secondaryMetric}:
                        </text>
                        <text
                          x={node.x + node.width - 12}
                          y={node.y + 78}
                          textAnchor="end"
                          className="text-[10px] font-mono font-bold fill-[#CBD5E1] tabular-nums"
                        >
                          {node.telemetry.secondaryValue}
                        </text>
                      </>
                    )}

                    {/* Warning / Saturated Icon Badge */}
                    {isWarning && (
                      <circle cx={node.x + node.width - 10} cy={node.y + 12} r="3" fill="#FBBF24" />
                    )}
                    {isSaturated && (
                      <circle cx={node.x + node.width - 10} cy={node.y + 12} r="3" fill="#FB7185" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Canvas Footer Legend */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#626C79] border-t border-[#202630] pt-2 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4E9F8E]" />
                <span className="text-[#929AA6]">Healthy Component</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
                <span className="text-[#929AA6]">Bottleneck Warning</span>
              </span>
            </div>
            <span>Click any node to inspect queue depth &amp; capacity limits</span>
          </div>
        </div>

        {/* Right Column: Node Inspector Drawer (4 cols) */}
        <div className="lg:col-span-4 panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#202630] pb-3">
            <div>
              <span className="text-[10px] font-mono text-[#626C79] uppercase block tracking-wider">
                Component Telemetry Inspector
              </span>
              <h2 className="text-sm font-bold text-[#E8EAF0] font-mono">{selectedNode.name}</h2>
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
          <p className="text-xs text-[#929AA6] leading-relaxed">
            {selectedNode.details.description}
          </p>

          {/* Resource & Capacity Limits */}
          <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-2 text-xs font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div className="flex justify-between">
              <span className="text-[#626C79]">Current Queue Depth:</span>
              <span className="text-[#E8EAF0] font-bold tabular-nums">
                {selectedNode.details.queueDepth} requests
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626C79]">Operational Ceiling:</span>
              <span className="text-[#CBD5E1]">{selectedNode.details.capacityLimit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#626C79]">Telemetry Driver:</span>
              <span className="text-[#4E9F8E]">Simulated Model</span>
            </div>
          </div>

          {/* Risk & Bottleneck Finding */}
          <div className="space-y-1.5 text-xs">
            <span className="font-semibold text-[#FBBF24] font-mono text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Observed Risk Factor:</span>
            </span>
            <p className="p-2.5 rounded bg-[#191408] border border-[#38290E] text-[#E8EAF0] text-[11px] leading-relaxed">
              {selectedNode.details.bottleneckRisk}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="p-3 rounded bg-[#050607] border border-[#202630] space-y-1.5 text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <span className="font-semibold text-[#E8EAF0] font-mono text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#4E9F8E]" />
              <span>Engine Recommendation:</span>
            </span>
            <p className="text-[#929AA6] text-[11px] leading-relaxed">
              {selectedNode.details.recommendation}
            </p>
          </div>

          {/* Quick Action Link */}
          <div className="pt-2">
            <Link
              href="/protection"
              className="w-full py-1.5 px-3 rounded bg-[#12161C] hover:bg-[#191E25] border border-[#28323F] hover:border-[#364354] text-xs font-mono text-[#E8EAF0] flex items-center justify-center gap-1.5 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <span>Tune Protection Sizing &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
