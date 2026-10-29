"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  GitCommit,
  Shield,
  Terminal,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";

interface CIRun {
  id: string;
  pr_number: string;
  branch: string;
  commit_sha: string;
  baseline_p95: number;
  candidate_p95: number;
  diff_pct: number;
  status: "PASSED" | "FAILED" | "INCONCLUSIVE";
  outcome: string;
  timestamp: string;
}

const CI_RUNS: CIRun[] = [
  {
    id: "ci-run-842",
    pr_number: "#142",
    branch: "feat/optimize-inventory-update",
    commit_sha: "9e4f21a",
    baseline_p95: 14.2,
    candidate_p95: 10.1,
    diff_pct: -28.9,
    status: "PASSED",
    outcome: "MEASURED_IMPROVEMENT",
    timestamp: "12 mins ago",
  },
  {
    id: "ci-run-841",
    pr_number: "#139",
    branch: "feat/add-deep-offset-audit-query",
    commit_sha: "3c8d0b2",
    baseline_p95: 18.5,
    candidate_p95: 36.4,
    diff_pct: +96.7,
    status: "FAILED",
    outcome: "REGRESSION_DETECTED",
    timestamp: "2 hours ago",
  },
  {
    id: "ci-run-840",
    pr_number: "#138",
    branch: "refactor/user-profile-joins",
    commit_sha: "7a1b5c3",
    baseline_p95: 8.5,
    candidate_p95: 8.3,
    diff_pct: -2.3,
    status: "PASSED",
    outcome: "NO_MATERIAL_CHANGE",
    timestamp: "5 hours ago",
  },
  {
    id: "ci-run-839",
    pr_number: "#135",
    branch: "test/noisy-background-vacuum",
    commit_sha: "5f8a12e",
    baseline_p95: 12.0,
    candidate_p95: 12.8,
    diff_pct: +6.6,
    status: "INCONCLUSIVE",
    outcome: "HIGH_VARIANCE_INCONCLUSIVE",
    timestamp: "1 day ago",
  },
];

export default function CIPage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono uppercase">
            <Terminal className="w-4 h-4 text-[#4E9F8E]" />
            <span>CI/CD Performance Regression Audit Trail</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5 font-sans">
            Automated regression quality gate preventing pull requests with query performance regressions from reaching production.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="healthy">GitHub Actions Gate Active</Badge>
          <Badge variant="simulated">SIMULATED DEMO RUNS</Badge>
          <span className="text-[10px] font-mono text-[#626C79] bg-[#0D1014] px-2 py-0.5 rounded border border-[#202630]">
            CLI: trafiora eval-ci
          </span>
        </div>
      </div>

      {/* Quality Gate Threshold Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="bg-[#0D1014] border border-[#202630] rounded p-3.5 space-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1.5 text-[#34D399]">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-bold text-[11px] uppercase">Pass Criteria</span>
          </div>
          <p className="text-[#929AA6] text-[11px] font-sans leading-relaxed">
            Candidate p95 latency does not regress beyond <strong className="text-[#E8EAF0]">5.0% threshold</strong> and p-value &lt; 0.05.
          </p>
        </div>

        <div className="bg-[#0D1014] border border-[#202630] rounded p-3.5 space-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1.5 text-[#FB7185]">
            <XCircle className="w-4 h-4" />
            <span className="font-bold text-[11px] uppercase">Fail Criteria</span>
          </div>
          <p className="text-[#929AA6] text-[11px] font-sans leading-relaxed">
            Candidate p95 latency regresses by &gt; 5.0% with statistical confidence, blocking PR merge.
          </p>
        </div>

        <div className="bg-[#0D1014] border border-[#202630] rounded p-3.5 space-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1.5 text-[#FBBF24]">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold text-[11px] uppercase">Inconclusive Handling</span>
          </div>
          <p className="text-[#929AA6] text-[11px] font-sans leading-relaxed">
            Coefficient of variation &gt; 5% triggers inconclusive warning; tests must be re-run in isolated sandbox.
          </p>
        </div>
      </div>

      {/* CI Runs Table */}
      <div className="bg-[#0D1014] border border-[#202630] rounded p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-[#202630] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] font-mono uppercase">
              Pull Request Evaluation History
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090B0E] text-[#626C79] border border-[#202630]">
              SIMULATED REFERENCE DATASET
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#626C79]">
            Automated CLI Evaluation Logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#202630] text-[10px] text-[#626C79] uppercase">
                <th className="py-2.5 px-3">Pull Request &amp; Commit</th>
                <th className="py-2.5 px-3">Gate Status</th>
                <th className="py-2.5 px-3 text-right">Baseline p95</th>
                <th className="py-2.5 px-3 text-right">Candidate p95</th>
                <th className="py-2.5 px-3 text-right">Relative Delta</th>
                <th className="py-2.5 px-3">Verdict Classification</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#191E25]">
              {CI_RUNS.map((run) => (
                <tr key={run.id} className="hover:bg-[#12161C]/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#E8EAF0]">{run.pr_number}</span>
                      <span className="text-[#CBD5E1] font-sans">{run.branch}</span>
                    </div>
                    <div className="text-[10px] text-[#626C79] flex items-center gap-1 mt-0.5">
                      <GitCommit className="w-3 h-3" />
                      <span>{run.commit_sha}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        run.status === "PASSED"
                          ? "healthy"
                          : run.status === "FAILED"
                          ? "critical"
                          : "warning"
                      }
                    >
                      {run.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right text-[#929AA6] tabular-nums">
                    {run.baseline_p95.toFixed(1)} ms
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#CBD5E1] tabular-nums">
                    {run.candidate_p95.toFixed(1)} ms
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums border ${
                        run.diff_pct < 0
                          ? "bg-[#0A1612] text-[#34D399] border-[#17382B]"
                          : run.diff_pct > 5
                          ? "bg-[#180A0A] text-[#FB7185] border-[#441616]"
                          : "bg-[#090B0E] text-[#626C79] border-[#202630]"
                      }`}
                    >
                      {run.diff_pct > 0 ? `+${run.diff_pct}%` : `${run.diff_pct}%`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-[#929AA6]">
                    {run.outcome}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-[#626C79]">
                    {run.timestamp}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href="/compare"
                      className="text-[#4E9F8E] hover:text-[#5bb8a4] hover:underline text-[11px] flex items-center justify-end gap-1 font-mono transition-colors"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
