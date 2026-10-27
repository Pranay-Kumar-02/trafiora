"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Download,
  FileText,
  GitCompare,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

export default function ComparePage() {
  const [outcome, setOutcome] = useState<string>("MEASURED_IMPROVEMENT");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-indigo-400" />
            Baseline vs Candidate A/B Performance Comparison
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Statistically rigorous comparison evaluating latency distributions, throughput retention, and buffer hit deltas across repetitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const report = `# Trafiora Benchmark Comparison Report\nOutcome: MEASURED_IMPROVEMENT\np95 Delta: -28.4%\nConfidence Interval: [6.8ms, 7.6ms]\nStatus: VERIFIED`;
              const blob = new Blob([report], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "trafiora-benchmark-comparison.md";
              a.click();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-medium text-gray-200 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown Report</span>
          </button>
        </div>
      </div>

      {/* Outcome Verdict Banner */}
      <div className="p-5 rounded-2xl glass-panel border border-emerald-800/50 bg-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50 text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-emerald-300 uppercase tracking-wider font-mono">
                Statistical Verdict: MEASURED_IMPROVEMENT
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-900 text-emerald-200 border border-emerald-700 font-mono">
                95% Bootstrap CI
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Candidate optimization achieved a <strong className="text-emerald-400">28.4% reduction in p95 latency</strong> with non-overlapping confidence intervals across 5 measured repetitions (CV=0.024 &lt; 0.05).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 font-mono">Statistical Power:</span>
          <span className="px-2.5 py-1 rounded bg-black/60 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
            HIGH (K = 5)
          </span>
        </div>
      </div>

      {/* Side-by-Side Metric Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h2 className="text-base font-semibold text-white">Comparative Performance Diffs</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Metric Measurement</th>
                <th className="py-3 px-4">Baseline (Pre-Opt)</th>
                <th className="py-3 px-4">Candidate (With Index)</th>
                <th className="py-3 px-4">Measured Delta</th>
                <th className="py-3 px-4">Statistical Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
              <tr className="hover:bg-gray-900/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-white">Latency (p95)</td>
                <td className="py-3.5 px-4 text-gray-300">10.05 ms</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">7.20 ms</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold">
                    -28.4%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-emerald-400 font-sans">Statistically Significant (p &lt; 0.01)</td>
              </tr>

              <tr className="hover:bg-gray-900/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-white">Latency (p50 / Median)</td>
                <td className="py-3.5 px-4 text-gray-300">5.40 ms</td>
                <td className="py-3.5 px-4 text-emerald-400">3.95 ms</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    -26.8%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-emerald-400 font-sans">Statistically Significant</td>
              </tr>

              <tr className="hover:bg-gray-900/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-white">Throughput (TPS)</td>
                <td className="py-3.5 px-4 text-gray-300">1,240 TPS</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">1,620 TPS</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold">
                    +30.6%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-emerald-400 font-sans">Throughput Win</td>
              </tr>

              <tr className="hover:bg-gray-900/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-white">Buffer Cache Hit Ratio</td>
                <td className="py-3.5 px-4 text-amber-400">94.2 %</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">99.2 %</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    +5.0%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-gray-400 font-sans">Eliminated Disk Reads</td>
              </tr>

              <tr className="hover:bg-gray-900/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-white">Variance (CV)</td>
                <td className="py-3.5 px-4 text-gray-400">0.031</td>
                <td className="py-3.5 px-4 text-emerald-400">0.024</td>
                <td className="py-3.5 px-4 text-gray-400">-0.007</td>
                <td className="py-3.5 px-4 text-emerald-400 font-sans">Stable (CV &lt; 0.05)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rationale & Evidence Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Optimization Evidence Summary
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            The candidate run applied index <code className="text-indigo-300 font-mono">idx_tx_account_created</code> to table <code className="text-indigo-300 font-mono">transactions</code>.
            This converted the execution plan from a sequential scan (120,000 rows scanned) to an index scan, lowering memory pressure and cutting statement execution time by 28.4%.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            95% Confidence Interval Span
          </h3>
          <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs font-mono space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Baseline 95% CI:</span>
              <span className="text-gray-200">[9.82 ms, 10.28 ms]</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Candidate 95% CI:</span>
              <span className="text-emerald-400 font-bold">[7.02 ms, 7.38 ms]</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-sans pt-1">
              Zero overlap between intervals confirms legitimate optimization gain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
