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
    bg: "bg-[#0A1912]",
    text: "text-[#34D399]",
    border: "border-[#173B2B]",
    dot: "bg-[#34D399]",
  },
  warning: {
    bg: "bg-[#191408]",
    text: "text-[#FBBF24]",
    border: "border-[#38290E]",
    dot: "bg-[#FBBF24]",
  },
  critical: {
    bg: "bg-[#190B0E]",
    text: "text-[#FB7185]",
    border: "border-[#38141B]",
    dot: "bg-[#FB7185]",
  },
  tier1: {
    bg: "bg-[#0A1912]",
    text: "text-[#34D399]",
    border: "border-[#173B2B]",
    dot: "bg-[#34D399]",
  },
  tier2: {
    bg: "bg-[#12161C]",
    text: "text-[#E8EAF0]",
    border: "border-[#28323F]",
    dot: "bg-[#4E9F8E]",
  },
  tier3: {
    bg: "bg-[#191408]",
    text: "text-[#FBBF24]",
    border: "border-[#38290E]",
    dot: "bg-[#FBBF24]",
  },
  simulated: {
    bg: "bg-[#090B0E]",
    text: "text-[#929AA6]",
    border: "border-[#202630]",
    dot: "bg-[#626C79]",
  },
  neutral: {
    bg: "bg-[#0D1014]",
    text: "text-[#929AA6]",
    border: "border-[#202630]",
    dot: "bg-[#626C79]",
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
