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
      <div className="flex items-center justify-between text-xs text-[#929AA6]">
        <span className="font-medium text-[#E8EAF0] text-xs">{label}</span>
        {source && (
          <span
            className="text-[10px] font-mono text-[#626C79] hover:text-[#CBD5E1] flex items-center gap-1 cursor-help transition-colors"
            title={`Telemetry Source: ${source}`}
          >
            <Info className="w-3 h-3 text-[#626C79]" />
            <span className="truncate max-w-[120px]">{source}</span>
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl lg:text-2xl font-bold font-mono text-[#E8EAF0] tabular-nums tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-[#626C79] font-mono">
            {unit}
          </span>
        )}
      </div>

      {/* Delta & Subtext */}
      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#202630]/70">
        {delta ? (
          <div
            className={`flex items-center gap-1 font-mono font-medium ${
              delta.trend === "flat"
                ? "text-[#929AA6]"
                : (delta.trend === "up" && delta.isPositiveGood) ||
                  (delta.trend === "down" && !delta.isPositiveGood)
                ? "text-[#34D399]"
                : "text-[#FB7185]"
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
          <span className="text-[#626C79] font-mono">{subtext || "Stable"}</span>
        )}

        {isSimulated && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#090B0E] text-[#626C79] border border-[#202630]">
            SIMULATED
          </span>
        )}
      </div>
    </div>
  );
}
