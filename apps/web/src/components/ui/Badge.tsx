import React from "react";

export type BadgeVariant =
  | "healthy"
  | "warning"
  | "critical"
  | "tier1"
  | "tier2"
  | "tier3"
  | "simulated"
  | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  healthy: {
    bg: "bg-status-successSurface",
    text: "text-status-success",
    border: "border-status-successBorder",
    dot: "bg-status-success",
  },
  warning: {
    bg: "bg-status-warningSurface",
    text: "text-status-warning",
    border: "border-status-warningBorder",
    dot: "bg-status-warning",
  },
  critical: {
    bg: "bg-status-errorSurface",
    text: "text-status-error",
    border: "border-status-errorBorder",
    dot: "bg-status-error",
  },
  tier1: {
    bg: "bg-[#0C2018]",
    text: "text-emerald-400",
    border: "border-emerald-800/60",
    dot: "bg-emerald-400",
  },
  tier2: {
    bg: "bg-[#22190B]",
    text: "text-amber-300",
    border: "border-amber-700/60",
    dot: "bg-amber-400",
  },
  tier3: {
    bg: "bg-[#241215]",
    text: "text-rose-300",
    border: "border-rose-800/60",
    dot: "bg-rose-400",
  },
  simulated: {
    bg: "bg-graphite-800",
    text: "text-graphite-200",
    border: "border-graphite-600",
    dot: "bg-graphite-400",
  },
  neutral: {
    bg: "bg-graphite-850",
    text: "text-graphite-200",
    border: "border-graphite-600",
    dot: "bg-graphite-300",
  },
};

export function Badge({ variant = "neutral", children, icon, className = "" }: BadgeProps) {
  const style = VARIANT_STYLES[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono tracking-tight border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      )}
      <span>{children}</span>
    </span>
  );
}
