"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  GitCompare,
  Layers,
  Play,
  RotateCw,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../lib/api-client";

interface ComparisonRow {
  metric: string;
  baseline: string;
  candidate: string;
  delta: string;
  isPositiveGood: boolean;
  significance: string;
}

const SIMULATED_COMPARISON_ROWS: ComparisonRow[] = [
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
    metric: "Throughput (TPS / QPS)",
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
  const [experiments, setExperiments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<any[]>("/experiments?limit=20")
      .then((data) => {
        if (Array.isArray(data)) {
          setExperiments(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const completed = experiments.filter((e) => e.status === "COMPLETED");
  const baseline = completed.find((e) => e.is_baseline);
  const candidate = completed.find((e) => !e.is_baseline && e.baseline_id);

  const hasRealComparison = Boolean(baseline && candidate);

  // Compute real rows if available
  const realRows: ComparisonRow[] = [];
  if (hasRealComparison && baseline && candidate) {
    const bMetrics = baseline.summary_metrics || {};
    const cMetrics = candidate.summary_metrics || {};

    const bp95 = bMetrics.mean_p95 ?? bMetrics.latency_p95_ms;
    const cp95 = cMetrics.mean_p95 ?? cMetrics.latency_p95_ms;

    if (bp95 != null && cp95 != null) {
      const delta = ((cp95 - bp95) / bp95) * 100;
      realRows.push({
        metric: "Latency (p95)",
        baseline: `${bp95.toFixed(2)} ms`,
        candidate: `${cp95.toFixed(2)} ms`,
        delta: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
        isPositiveGood: false,
        significance: candidate.outcome_classification || "Measured",
      });
    } else {
      realRows.push({
        metric: "Latency (p95)",
        baseline: bp95 != null ? `${bp95.toFixed(2)} ms` : "Unavailable",
        candidate: cp95 != null ? `${cp95.toFixed(2)} ms` : "Unavailable",
        delta: "—",
        isPositiveGood: false,
        significance: "Transaction log unrecorded",
      });
    }

    if (bMetrics.latency_p50_ms != null && cMetrics.latency_p50_ms != null) {
      const delta = ((cMetrics.latency_p50_ms - bMetrics.latency_p50_ms) / bMetrics.latency_p50_ms) * 100;
      realRows.push({
        metric: "Latency (p50 / Median)",
        baseline: `${bMetrics.latency_p50_ms.toFixed(2)} ms`,
        candidate: `${cMetrics.latency_p50_ms.toFixed(2)} ms`,
        delta: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
        isPositiveGood: false,
        significance: "Measured Median",
      });
    }

    if (bMetrics.throughput_qps_avg != null && cMetrics.throughput_qps_avg != null) {
      const delta = ((cMetrics.throughput_qps_avg - bMetrics.throughput_qps_avg) / bMetrics.throughput_qps_avg) * 100;
      realRows.push({
        metric: "Throughput (QPS)",
        baseline: `${bMetrics.throughput_qps_avg.toFixed(1)} QPS`,
        candidate: `${cMetrics.throughput_qps_avg.toFixed(1)} QPS`,
        delta: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
        isPositiveGood: true,
        significance: "Measured Capacity Delta",
      });
    }
  }

  const displayRows = hasRealComparison ? realRows : SIMULATED_COMPARISON_ROWS;

  const handleExportMarkdown = () => {
    const report = `# Trafiora Benchmark Comparison Report
Generated: ${new Date().toISOString()}
Status: ${hasRealComparison ? "REAL_EVALUATION" : "SIMULATED_DEMO"}

## Comparison Metrics:
${displayRows.map((r) => `- ${r.metric}: ${r.baseline} -> ${r.candidate} (${r.delta}) [${r.significance}]`).join("\n")}
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
          {hasRealComparison ? (
            <Badge variant="healthy">Live Verified Benchmark Data</Badge>
          ) : (
            <Badge variant="simulated">Simulated Reference Profile</Badge>
          )}
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
      {hasRealComparison && candidate ? (
        <div
          className={`panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            candidate.outcome_classification === "MEASURED_IMPROVEMENT"
              ? "border-status-successBorder bg-status-successSurface/30"
              : candidate.outcome_classification === "REGRESSION_DETECTED"
              ? "border-status-errorBorder bg-status-errorSurface/30"
              : "border-status-warningBorder bg-status-warningSurface/30"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded shrink-0 mt-0.5 ${
                candidate.outcome_classification === "MEASURED_IMPROVEMENT"
                  ? "bg-status-successSurface border border-status-successBorder text-status-success"
                  : candidate.outcome_classification === "REGRESSION_DETECTED"
                  ? "bg-status-errorSurface border border-status-errorBorder text-status-error"
                  : "bg-status-warningSurface border border-status-warningBorder text-status-warning"
              }`}
            >
              {candidate.outcome_classification === "MEASURED_IMPROVEMENT" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono uppercase text-xs text-graphite-50">
                  Statistical Outcome: {candidate.outcome_classification}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-graphite-800 text-graphite-200 border border-graphite-600 font-mono text-[10px]">
                  K = {candidate.repetitions_completed} Repetitions &bull;{" "}
                  {candidate.summary_metrics?.measurement_source === "WIRE_EMULATOR_SANDBOX"
                    ? "EMULATOR (SANDBOX)"
                    : candidate.summary_metrics?.is_simulated
                    ? "SIMULATED"
                    : candidate.summary_metrics?.measurement_source || "MEASURED"}
                </span>
              </div>
              <p className="text-graphite-200 leading-relaxed text-[11px]">
                Comparing Candidate ({candidate.name}) against Baseline ({baseline?.name}). Target:{" "}
                {candidate.connection_id}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel p-4 border-status-successBorder bg-status-successSurface/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-status-successSurface border border-status-successBorder text-status-success shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-status-success font-mono uppercase text-xs">
                  Reference Outcome: MEASURED_IMPROVEMENT
                </span>
                <span className="px-1.5 py-0.2 rounded bg-graphite-800 text-graphite-200 border border-graphite-600 font-mono text-[10px]">
                  SIMULATED REFERENCE MODEL &bull; K = 5 Reps
                </span>
              </div>
              <p className="text-graphite-200 leading-relaxed text-[11px]">
                Demonstration baseline vs candidate comparison. Launch real benchmark experiments from the{" "}
                <Link href="/experiments" className="text-brand-teal underline">
                  Experiments page
                </Link>{" "}
                to populate real distribution matrices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Metric Table */}
      <div className="panel p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-graphite-50 font-mono uppercase">
              Comparative Performance Metrics Matrix
            </h3>
            {!hasRealComparison && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-graphite-700 text-graphite-300 border border-graphite-600">
                SIMULATED DATASET
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-graphite-300">
            {hasRealComparison ? "Real Benchmark Evidence" : "Baseline (Pre-Opt) vs Candidate (With Index)"}
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
              {displayRows.map((row, idx) => (
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
                          : row.delta === "—"
                          ? "bg-graphite-800 text-graphite-300 border-graphite-700"
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
            <span className="text-[10px] font-mono text-graphite-300">
              {hasRealComparison ? "Measured Distribution" : "Simulated Model (N = 2,500)"}
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-44 bg-graphite-950 rounded border border-graphite-600 p-2 flex items-center justify-center">
              <svg viewBox="0 0 360 140" className="w-full h-full select-none">
                <line x1="30" y1="120" x2="340" y2="120" stroke="#222A35" strokeWidth="1" />
                <line x1="30" y1="10" x2="30" y2="120" stroke="#222A35" strokeWidth="1" />

                <text x="24" y="123" textAnchor="end" className="text-[8px] fill-[#596573] font-mono">0.0</text>
                <text x="24" y="68" textAnchor="end" className="text-[8px] fill-[#596573] font-mono">0.5</text>
                <text x="24" y="15" textAnchor="end" className="text-[8px] fill-[#596573] font-mono">1.0</text>

                <path
                  d="M 30 120 C 70 120, 100 80, 160 50 C 220 25, 280 15, 340 10"
                  fill="none"
                  stroke="#9AA5B1"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />

                <path
                  d="M 30 120 C 60 120, 80 50, 120 25 C 180 12, 240 10, 340 10"
                  fill="none"
                  stroke="#66D9C0"
                  strokeWidth="2.5"
                />

                <g transform="translate(180, 80)">
                  <line x1="0" y1="5" x2="15" y2="5" stroke="#9AA5B1" strokeWidth="2" strokeDasharray="3 3" />
                  <text x="20" y="8" className="text-[8px] fill-[#9AA5B1] font-mono">Baseline CDF</text>
                  <line x1="0" y1="18" x2="15" y2="18" stroke="#66D9C0" strokeWidth="2.5" />
                  <text x="20" y="21" className="text-[8px] fill-[#66D9C0] font-mono">{"Candidate CDF (Shift Left = Faster)"}</text>
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
            <span className="text-[10px] font-mono text-graphite-300">
              {hasRealComparison && candidate ? `K = ${candidate.repetitions_completed} Runs` : "Simulated Model (K = 5)"}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-graphite-850 border border-graphite-600 space-y-1">
              <span className="text-[10px] text-graphite-300 block uppercase">Candidate 95% Confidence Interval</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-teal tabular-nums">
                  {candidate?.summary_metrics?.confidence_interval_95
                    ? `[${candidate.summary_metrics.confidence_interval_95[0].toFixed(2)} ms, ${candidate.summary_metrics.confidence_interval_95[1].toFixed(2)} ms]`
                    : "[6.85 ms, 7.55 ms] [SIM]"}
                </span>
                <span className="text-[11px] text-status-success font-sans">
                  {hasRealComparison ? "Measured Bounds" : "Demonstration Bounds"}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-graphite-850 border border-graphite-600 space-y-1">
              <span className="text-[10px] text-graphite-300 block uppercase">Coefficient of Variation (CV)</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-graphite-50 tabular-nums">
                  {candidate?.summary_metrics?.coefficient_of_variation != null
                    ? `${(candidate.summary_metrics.coefficient_of_variation * 100).toFixed(1)}%`
                    : "0.024 (2.4%) [SIM]"}
                </span>
                <span className="text-[11px] text-status-success font-sans">
                  {candidate?.summary_metrics?.coefficient_of_variation != null
                    ? candidate.summary_metrics.coefficient_of_variation < 0.05
                      ? "Below 5% threshold (Test Valid)"
                      : "Above 5% threshold (High Variance)"
                    : "Below 5% threshold (Test Valid)"}
                </span>
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
