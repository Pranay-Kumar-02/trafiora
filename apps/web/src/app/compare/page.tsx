"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  GitCompare,
  HardDrive,
  Info,
  Layers,
  Play,
  RotateCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";

interface ComparisonRow {
  metric: string;
  baseline: string;
  candidate: string;
  delta: string;
  isPositiveGood: boolean;
  significance: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    metric: "Latency (p95)",
    baseline: "10.05 ms",
    candidate: "7.20 ms",
    delta: "-28.4%",
    isPositiveGood: false,
    significance: "Significant (p < 0.001, Welch t-test)",
  },
  {
    metric: "Latency (p50 / Median)",
    baseline: "5.40 ms",
    candidate: "3.95 ms",
    delta: "-26.8%",
    isPositiveGood: false,
    significance: "Significant (p < 0.001)",
  },
  {
    metric: "Latency (p99 Tail)",
    baseline: "28.50 ms",
    candidate: "18.20 ms",
    delta: "-36.1%",
    isPositiveGood: false,
    significance: "Significant (Tail variance reduced)",
  },
  {
    metric: "Throughput (TPS)",
    baseline: "1,240 TPS",
    candidate: "1,620 TPS",
    delta: "+30.6%",
    isPositiveGood: true,
    significance: "Throughput Capacity Win",
  },
  {
    metric: "Buffer Cache Hit Ratio",
    baseline: "94.2%",
    candidate: "99.2%",
    delta: "+5.0%",
    isPositiveGood: true,
    significance: "Cache Thrashing Eliminated",
  },
  {
    metric: "Host CPU per 1k TPS",
    baseline: "14.2% CPU",
    candidate: "9.8% CPU",
    delta: "-31.0%",
    isPositiveGood: false,
    significance: "Efficiency Gain",
  },
];

export default function ComparePage() {
  const [outcome, setOutcome] = useState<string>("MEASURED_IMPROVEMENT");

  const handleExportMarkdown = () => {
    const report = `# Trafiora Benchmark Comparison Report
Generated: ${new Date().toISOString()}
Target: Tier 2 Authorized Benchmark Target (PostgreSQL 18.6)
Scenario: Hot-Record Read Spikes (Zipfian Skew, K=5 repetitions)

## Statistical Verdict: MEASURED_IMPROVEMENT
- Latency (p95): 10.05 ms -> 7.20 ms (-28.4%)
- Throughput: 1,240 TPS -> 1,620 TPS (+30.6%)
- Buffer Cache Hit Ratio: 94.2% -> 99.2% (+5.0%)
- 95% Confidence Interval: [6.85ms, 7.55ms]
- Coefficient of Variation (CV): 0.024 (< 0.05 threshold)

## Statistical Assessment
Candidate composite index on (user_id, created_at DESC) successfully reduced sequential block reads, resulting in a statistically significant improvement across all monitored percentiles.
`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trafiora-comparison-report.md`;
    a.click();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-50 flex items-center gap-2 font-mono">
            <GitCompare className="w-5 h-5 text-brand-teal" />
            <span>BASELINE VS CANDIDATE A/B PERFORMANCE COMPARISON</span>
          </h1>
          <p className="text-xs text-graphite-200 mt-0.5">
            Statistical regression evaluation comparing latency percentiles, throughput retention, and buffer efficiency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="tier2">Tier 2 Authorized</Badge>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-graphite-800 hover:bg-graphite-750 border border-graphite-500 text-xs font-mono text-graphite-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-teal" />
            <span>Export Report (.md)</span>
          </button>
        </div>
      </div>

      {/* Outcome Verdict Banner */}
      <div className="panel p-4 border-status-successBorder bg-status-successSurface/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-status-successSurface border border-status-successBorder text-status-success shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-status-success font-mono uppercase text-xs">
                Statistical Outcome: MEASURED_IMPROVEMENT
              </span>
              <span className="px-1.5 py-0.2 rounded bg-graphite-800 text-graphite-200 border border-graphite-600 font-mono text-[10px]">
                K = 5 Repetitions &bull; CV = 0.024
              </span>
            </div>
            <p className="text-graphite-200 leading-relaxed text-[11px]">
              Candidate optimization achieved a <strong className="text-status-success font-semibold">28.4% reduction in p95 latency</strong> with non-overlapping 95% bootstrap confidence intervals [6.85ms, 7.55ms] across 5 isolated repetitions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          <span className="text-graphite-300 text-[11px]">Power Assessment:</span>
          <span className="px-2 py-0.5 rounded bg-graphite-900 border border-status-successBorder text-status-success font-bold text-[11px]">
            HIGH CONFIDENCE (p &lt; 0.001)
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Metric Table */}
      <div className="panel p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
          <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
            Comparative Performance Metrics Matrix
          </h3>
          <span className="text-[10px] font-mono text-graphite-300">
            Baseline (Pre-Opt) vs Candidate (With Index)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-graphite-600 text-[10px] text-graphite-300 uppercase">
                <th className="py-2.5 px-3">Performance Dimension</th>
                <th className="py-2.5 px-3 text-right">Baseline (Pre-Opt)</th>
                <th className="py-2.5 px-3 text-right">Candidate (Optimized)</th>
                <th className="py-2.5 px-3 text-right">Relative Delta</th>
                <th className="py-2.5 px-3">Statistical Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-600/60">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-graphite-850/60 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-graphite-100 font-sans">
                    {row.metric}
                  </td>
                  <td className="py-2.5 px-3 text-right text-graphite-300 tabular-nums">
                    {row.baseline}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-brand-teal tabular-nums">
                    {row.candidate}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums border ${
                        (!row.isPositiveGood && row.delta.startsWith("-")) ||
                        (row.isPositiveGood && row.delta.startsWith("+"))
                          ? "bg-status-successSurface text-status-success border-status-successBorder"
                          : "bg-status-errorSurface text-status-error border-status-errorBorder"
                      }`}
                    >
                      {row.delta}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-graphite-200 text-[11px] font-sans">
                    {row.significance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Latency Distribution CDF Curve & Repetition Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency CDF Curve Visualization */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
              Cumulative Distribution Function (Latency CDF)
            </h3>
            <span className="text-[10px] font-mono text-graphite-300">N = 2,500 samples</span>
          </div>

          <div className="space-y-2">
            {/* SVG CDF Chart */}
            <div className="w-full h-44 bg-graphite-950 rounded border border-graphite-600 p-2 flex items-center justify-center">
              <svg viewBox="0 0 360 140" className="w-full h-full select-none">
                {/* Axes */}
                <line x1="30" y1="120" x2="340" y2="120" stroke="#222A35" strokeWidth="1" />
                <line x1="30" y1="10" x2="30" y2="120" stroke="#222A35" strokeWidth="1" />

                {/* Y-axis ticks (CDF 0 to 1.0) */}
                <text x="24" y="123" textAnchor="end" className="text-[8px] fill-[#596573] font-mono">0.0</text>
                <text x="24" y="68" textAnchor="end" className="text-[8px] fill-[#596573] font-mono">0.5</text>
                <text x="24" y="15" textAnchor="end" className="text-[8px] fill-[#596573] font-mono">1.0</text>

                {/* Baseline CDF curve (grey dashed) */}
                <path
                  d="M 30 120 C 70 120, 100 80, 160 50 C 220 25, 280 15, 340 10"
                  fill="none"
                  stroke="#9AA5B1"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />

                {/* Candidate CDF curve (brand-teal solid, shifted left = lower latency) */}
                <path
                  d="M 30 120 C 60 120, 80 50, 120 25 C 180 12, 240 10, 340 10"
                  fill="none"
                  stroke="#66D9C0"
                  strokeWidth="2.5"
                />

                {/* Legend in chart */}
                <g transform="translate(180, 80)">
                  <line x1="0" y1="5" x2="15" y2="5" stroke="#9AA5B1" strokeWidth="2" strokeDasharray="3 3" />
                  <text x="20" y="8" className="text-[8px] fill-[#9AA5B1] font-mono">Baseline CDF</text>
                  <line x1="0" y1="18" x2="15" y2="18" stroke="#66D9C0" strokeWidth="2.5" />
                  <text x="20" y="21" className="text-[8px] fill-[#66D9C0] font-mono">Candidate CDF (Shift Left = Faster)</text>
                </g>
              </svg>
            </div>

            <div className="flex justify-between px-6 text-[10px] font-mono text-graphite-300">
              <span>0 ms</span>
              <span>10 ms</span>
              <span>20 ms</span>
              <span>30 ms</span>
            </div>
          </div>
        </div>

        {/* Repetition Variability & Confidence Evidence */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
              Repetition Variability &amp; Confidence Interval
            </h3>
            <span className="text-[10px] font-mono text-graphite-300">K = 5 Runs</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-graphite-850 border border-graphite-600 space-y-1">
              <span className="text-[10px] text-graphite-300 block uppercase">Candidate 95% Confidence Interval</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-teal tabular-nums">[6.85 ms, 7.55 ms]</span>
                <span className="text-[11px] text-status-success font-sans">Zero Overlap with Baseline [9.80ms, 10.30ms]</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-graphite-850 border border-graphite-600 space-y-1">
              <span className="text-[10px] text-graphite-300 block uppercase">Coefficient of Variation (CV)</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-graphite-50 tabular-nums">0.024 (2.4%)</span>
                <span className="text-[11px] text-status-success font-sans">Below 5% threshold (Test Valid)</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-graphite-950 border border-graphite-600 space-y-1 text-[11px]">
              <span className="font-semibold text-graphite-50 block font-mono">Automated CI Policy Rule:</span>
              <p className="text-graphite-200 font-sans leading-relaxed">
                If candidate p95 latency improves by &gt; 5% with p &lt; 0.05 and CV &lt; 0.05, PR status checks pass automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
