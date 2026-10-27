"""Trafiora CI CLI entrypoint."""
import argparse
import json
import os
import sys
from .evaluator import RegressionBudget, RegressionEvaluator


def cli_main():
    parser = argparse.ArgumentParser(
        prog="trafiora-ci",
        description="Trafiora Database Workload Regression Prevention Gate",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # eval subcommand
    eval_parser = subparsers.add_parser("eval", help="Evaluate baseline vs candidate metrics")
    eval_parser.add_argument("--baseline", required=True, help="Path to baseline metrics JSON file")
    eval_parser.add_argument("--candidate", required=True, help="Path to candidate metrics JSON file")
    eval_parser.add_argument("--max-latency-pct", type=float, default=5.0, help="Max p95 latency increase percentage")
    eval_parser.add_argument("--output-report", help="Optional path to write markdown report to")

    args = parser.parse_args()

    if args.command == "eval":
        if not os.path.exists(args.baseline):
            sys.stderr.write(f"Error: Baseline file '{args.baseline}' not found\n")
            sys.exit(2)
        if not os.path.exists(args.candidate):
            sys.stderr.write(f"Error: Candidate file '{args.candidate}' not found\n")
            sys.exit(2)

        with open(args.baseline, "r") as f:
            base_metrics = json.load(f)
        with open(args.candidate, "r") as f:
            cand_metrics = json.load(f)

        budget = RegressionBudget(max_p95_latency_increase_pct=args.max_latency_pct)
        result = RegressionEvaluator.evaluate(base_metrics, cand_metrics, budget)

        print(result.markdown_report)

        if args.output_report:
            with open(args.output_report, "w") as f:
                f.write(result.markdown_report)

        if not result.passed:
            sys.stderr.write(f"\n[CI REGRESSION GATE FAILED] Outcome: {result.outcome}\n")
            sys.exit(1)
        else:
            print(f"\n[CI REGRESSION GATE PASSED] Outcome: {result.outcome}")
            sys.exit(0)


if __name__ == "__main__":
    cli_main()
