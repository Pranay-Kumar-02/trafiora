"use client";

import {
  AlertCircle,
  CheckCircle2,
  GitBranch,
  GitCommit,
  Terminal,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

const CI_RUNS = [
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
];

export default function CIPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Terminal className="w-6 h-6 text-indigo-400" />
          CI/CD Performance Regression Prevention Gates
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Automated database workload evaluation for GitHub Actions and GitLab CI, preventing slow queries before merge.
        </p>
      </div>

      {/* CLI Installation Box */}
      <div className="glass-panel p-5 rounded-2xl space-y-3">
        <h2 className="text-sm font-semibold text-white">CLI Installation & GitHub Actions Step</h2>
        <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 font-mono text-xs text-indigo-300">
          pip install trafiora-ci
        </div>
        <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 font-mono text-xs text-gray-300 overflow-x-auto">
          trafiora-ci eval --baseline baseline.json --candidate candidate.json --max-latency-pct 5.0
        </div>
      </div>

      {/* Recent CI Runs */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h2 className="text-base font-semibold text-white">Recent Pull Request Pipeline Evaluations</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Run & PR</th>
                <th className="py-2.5 px-3">Branch & Commit</th>
                <th className="py-2.5 px-3">Baseline p95</th>
                <th className="py-2.5 px-3">Candidate p95</th>
                <th className="py-2.5 px-3">Delta</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {CI_RUNS.map((run) => (
                <tr key={run.id} className="hover:bg-gray-900/40">
                  <td className="py-3 px-3">
                    <span className="font-bold text-white font-sans mr-2">{run.pr_number}</span>
                    <span className="text-gray-500 text-[11px]">{run.id}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-indigo-400 font-sans text-xs flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      <span>{run.branch}</span>
                    </div>
                    <div className="text-gray-500 text-[10px]">{run.commit_sha} &bull; {run.timestamp}</div>
                  </td>
                  <td className="py-3 px-3 text-gray-300">{run.baseline_p95} ms</td>
                  <td className="py-3 px-3 text-white font-bold">{run.candidate_p95} ms</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        run.diff_pct < 0
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-rose-950 text-rose-300 border border-rose-800"
                      }`}
                    >
                      {run.diff_pct > 0 ? `+${run.diff_pct}%` : `${run.diff_pct}%`}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans text-[11px] text-gray-300">{run.outcome}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        run.status === "PASSED"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {run.status}
                    </span>
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
