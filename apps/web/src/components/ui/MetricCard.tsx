import React from "react";
import { TrendingDown, TrendingUp, Info } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: {
    value: string;
    isPositiveGood?: boolean;
    trend: "up" | "down" | "flat";
  };
  subtext?: string;
  source?: string;
  isSimulated?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  subtext,
  source,
  isSimulated = false,
  className = "",
}: MetricCardProps) {
  return (
    <div className={`panel p-3.5 space-y-2 panel-interactive ${className}`}>
      {/* Header & Source Attribution */}
      <div className="flex items-center justify-between text-xs text-graphite-200">
        <span className="font-medium text-graphite-100">{label}</span>
        {source && (
          <span
            className="text-[10px] font-mono text-graphite-300 hover:text-graphite-100 flex items-center gap-1 cursor-help"
            title={`Telemetry Source: ${source}`}
          >
            <Info className="w-3 h-3" />
            <span className="truncate max-w-[110px]">{source}</span>
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl lg:text-2xl font-bold font-mono text-graphite-50 tabular-nums tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-graphite-300 font-sans font-medium">
            {unit}
          </span>
        )}
      </div>

      {/* Delta & Subtext */}
      <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-graphite-600/50">
        {delta ? (
          <div
            className={`flex items-center gap-1 font-mono font-medium ${
              delta.trend === "flat"
                ? "text-graphite-200"
                : (delta.trend === "up" && delta.isPositiveGood) ||
                  (delta.trend === "down" && !delta.isPositiveGood)
                ? "text-status-success"
                : "text-status-error"
            }`}
          >
            {delta.trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : delta.trend === "down" ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>{delta.value}</span>
          </div>
        ) : (
          <span className="text-graphite-300">{subtext || "Stable"}</span>
        )}

        {isSimulated && (
          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-graphite-700 text-graphite-300 border border-graphite-600">
            SIMULATED
          </span>
        )}
      </div>
    </div>
  );
}
