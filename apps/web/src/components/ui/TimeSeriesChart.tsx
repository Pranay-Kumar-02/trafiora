"use client";

import React, { useState } from "react";

export interface DataPoint {
  time: string;
  throughputQps: number;
  latencyP95Ms: number;
  latencyP50Ms?: number;
  latencyP99Ms?: number;
}

interface TimeSeriesChartProps {
  data: DataPoint[];
  title?: string;
  source?: string;
  isSimulated?: boolean;
  className?: string;
}

export function TimeSeriesChart({
  data,
  title = "Telemetry Time Series",
  source = "pg_stat_statements (10s intervals)",
  isSimulated = false,
  className = "",
}: TimeSeriesChartProps) {
  const [activeMetric, setActiveMetric] = useState<"both" | "percentiles" | "throughput">("both");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={`panel p-6 flex flex-col items-center justify-center text-center space-y-2 min-h-[260px] ${className}`}>
        <span className="text-xs font-mono text-graphite-300">NO TELEMETRY DATA AVAILABLE</span>
        <p className="text-xs text-graphite-200 max-w-sm">
          Connect an active database target in Connections or run a live experiment to stream time-series metrics.
        </p>
      </div>
    );
  }

  // Calculate scales
  const maxQps = Math.max(...data.map((d) => d.throughputQps), 100);
  const maxLatency = Math.max(...data.map((d) => d.latencyP99Ms ?? d.latencyP95Ms), 10);

  const chartHeight = 170;
  const chartWidth = 580;
  const paddingX = 48;
  const paddingY = 22;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const pointsCount = data.length;
  const stepX = innerWidth / (pointsCount - 1 || 1);

  // Path generators
  const qpsPath = data
    .map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingY + innerHeight - (d.throughputQps / maxQps) * innerHeight;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const latencyP95Path = data
    .map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingY + innerHeight - (d.latencyP95Ms / maxLatency) * innerHeight;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const latencyP50Path = data
    .map((d, i) => {
      const p50 = d.latencyP50Ms ?? d.latencyP95Ms * 0.4;
      const x = paddingX + i * stepX;
      const y = paddingY + innerHeight - (p50 / maxLatency) * innerHeight;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const latencyP99Path = data
    .map((d, i) => {
      const p99 = d.latencyP99Ms ?? d.latencyP95Ms * 1.5;
      const x = paddingX + i * stepX;
      const y = paddingY + innerHeight - (p99 / maxLatency) * innerHeight;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];
  const hasPercentiles = data.some((d) => d.latencyP50Ms != null || d.latencyP99Ms != null);

  return (
    <div className={`panel p-4 space-y-3 ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202630] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#E8EAF0] font-mono tracking-tight">{title}</h3>
            {isSimulated && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#12161C] text-[#929AA6] border border-[#202630]">
                DEMO PROFILE
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#626C79] font-mono">Source: {source}</span>
        </div>

        {/* Legend / Filter buttons */}
        <div className="flex items-center gap-1.5 bg-[#090B0E] p-1 rounded border border-[#202630] text-xs font-mono">
          <button
            onClick={() => setActiveMetric("both")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              activeMetric === "both"
                ? "bg-[#12161C] text-[#E8EAF0] border border-[#28323F]"
                : "text-[#626C79] hover:text-[#929AA6]"
            }`}
          >
            Dual View (QPS + p95)
          </button>
          {hasPercentiles && (
            <button
              onClick={() => setActiveMetric("percentiles")}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
                activeMetric === "percentiles"
                  ? "bg-[#12161C] text-[#E8EAF0] border border-[#28323F]"
                  : "text-[#626C79] hover:text-[#929AA6]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185] inline-block" />
              p50 / p95 / p99 Latency
            </button>
          )}
          <button
            onClick={() => setActiveMetric("throughput")}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
              activeMetric === "throughput"
                ? "bg-[#12161C] text-[#4E9F8E] border border-[#28323F]"
                : "text-[#626C79] hover:text-[#929AA6]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4E9F8E] inline-block" />
            Throughput Only
          </button>
        </div>
      </div>

      {/* Hover Readout Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono px-3 py-1.5 bg-[#090B0E] rounded border border-[#202630] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] gap-2">
        <span className="text-[#626C79]">
          Time: <span className="text-[#E8EAF0] font-semibold">{activePoint.time}</span>
        </span>
        <div className="flex items-center gap-3.5 flex-wrap">
          {(activeMetric === "both" || activeMetric === "throughput") && (
            <span className="text-[#4E9F8E] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4E9F8E]" />
              QPS: <strong className="text-[#E8EAF0] tabular-nums font-bold">{activePoint.throughputQps.toFixed(1)}</strong>
            </span>
          )}
          {(activeMetric === "percentiles" || activeMetric === "both") && activePoint.latencyP50Ms != null && (
            <span className="text-[#38BDF8] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              p50: <strong className="text-[#E8EAF0] tabular-nums font-bold">{activePoint.latencyP50Ms.toFixed(2)} ms</strong>
            </span>
          )}
          {(activeMetric === "both" || activeMetric === "percentiles") && (
            <span className="text-[#CBD5E1] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
              p95: <strong className="text-[#E8EAF0] tabular-nums font-bold">{activePoint.latencyP95Ms.toFixed(2)} ms</strong>
            </span>
          )}
          {activeMetric === "percentiles" && activePoint.latencyP99Ms != null && (
            <span className="text-[#FB7185] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FB7185]" />
              p99: <strong className="text-[#E8EAF0] tabular-nums font-bold">{activePoint.latencyP99Ms.toFixed(2)} ms</strong>
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Viewport */}
      <div className="relative w-full overflow-hidden bg-[#050607] rounded border border-[#202630]/60 p-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + innerHeight * (1 - ratio);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#161B22"
                  strokeDasharray="2 3"
                  strokeWidth="0.8"
                />
                {/* Left Axis: QPS */}
                {(activeMetric === "both" || activeMetric === "throughput") && (
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] fill-[#626C79] font-mono"
                  >
                    {Math.round(ratio * maxQps)}
                  </text>
                )}
                {/* Right Axis: Latency ms */}
                {(activeMetric === "both" || activeMetric === "percentiles") && (
                  <text
                    x={chartWidth - paddingX + 6}
                    y={y + 3}
                    textAnchor="start"
                    className="text-[9px] fill-[#626C79] font-mono"
                  >
                    {(ratio * maxLatency).toFixed(0)}m
                  </text>
                )}
              </g>
            );
          })}

          {/* Metric Curves */}
          {/* 1. Throughput curve */}
          {(activeMetric === "both" || activeMetric === "throughput") && (
            <path
              d={qpsPath}
              fill="none"
              stroke="#4E9F8E"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 2. p50 Latency (only in percentiles view) */}
          {activeMetric === "percentiles" && (
            <path
              d={latencyP50Path}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 3. p95 Latency */}
          {(activeMetric === "both" || activeMetric === "percentiles") && (
            <path
              d={latencyP95Path}
              fill="none"
              stroke="#E8EAF0"
              strokeWidth="1.8"
              strokeDasharray={activeMetric === "both" ? "4 2" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 4. p99 Latency (only in percentiles view) */}
          {activeMetric === "percentiles" && (
            <path
              d={latencyP99Path}
              fill="none"
              stroke="#FB7185"
              strokeWidth="1.6"
              strokeDasharray="2 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Hover Columns */}
          {data.map((_, i) => {
            const x = paddingX + i * stepX;
            return (
              <rect
                key={i}
                x={x - stepX / 2}
                y={paddingY}
                width={stepX}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}

          {/* Hover Indicator Line */}
          {hoverIndex !== null && (
            <line
              x1={paddingX + hoverIndex * stepX}
              y1={paddingY}
              x2={paddingX + hoverIndex * stepX}
              y2={paddingY + innerHeight}
              stroke="#929AA6"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>

      {/* Footer Legend & Time Axis Labels */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-[#626C79] gap-1 px-2">
        <div className="flex items-center gap-3">
          {(activeMetric === "both" || activeMetric === "throughput") && (
            <span className="flex items-center gap-1 text-[#4E9F8E]">
              <span className="w-2.5 h-0.5 bg-[#4E9F8E] inline-block" /> Throughput (QPS)
            </span>
          )}
          {activeMetric === "percentiles" && (
            <span className="flex items-center gap-1 text-[#38BDF8]">
              <span className="w-2.5 h-0.5 bg-[#38BDF8] inline-block border-b border-dotted" /> p50 (ms)
            </span>
          )}
          {(activeMetric === "both" || activeMetric === "percentiles") && (
            <span className="flex items-center gap-1 text-[#CBD5E1]">
              <span className="w-2.5 h-0.5 bg-[#CBD5E1] inline-block" /> p95 (ms)
            </span>
          )}
          {activeMetric === "percentiles" && (
            <span className="flex items-center gap-1 text-[#FB7185]">
              <span className="w-2.5 h-0.5 bg-[#FB7185] inline-block" /> p99 (ms)
            </span>
          )}
        </div>
        <div className="flex justify-between gap-6 text-[#626C79]">
          <span>{data[0]?.time}</span>
          <span>{data[Math.floor(data.length / 2)]?.time}</span>
          <span>{data[data.length - 1]?.time}</span>
        </div>
      </div>
    </div>
  );
}
