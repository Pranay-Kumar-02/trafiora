"use client";

import { CheckCircle2, Cpu, HardDrive, Key, Lock, Server, Settings, Shield, Zap } from "lucide-react";
import { Badge } from "../../components/ui/Badge";

export default function SettingsPage() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-graphite-600 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-graphite-50 flex items-center gap-2 font-mono">
            <Settings className="w-5 h-5 text-brand-teal" />
            <span>SYSTEM SETTINGS &amp; PLATFORM CONFIGURATION</span>
          </h1>
          <p className="text-xs text-graphite-200 mt-0.5">
            Cryptographic credential vault parameters, monitoring CPU budget controls, and operational safety guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="healthy">AES-256-GCM Vault</Badge>
          <Badge variant="tier2">CPU Budget: &lt; 1%</Badge>
        </div>
      </div>

      <div className="space-y-4 text-xs font-mono">
        {/* Security & Envelope Vault */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h2 className="text-xs font-semibold text-graphite-50 uppercase flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-teal" />
              <span>Envelope Credential Vault Specification</span>
            </h2>
            <span className="text-[10px] text-graphite-300">Zero Plaintext Persistence</span>
          </div>

          <div className="p-3 rounded bg-graphite-950 border border-graphite-600 space-y-2">
            <div className="flex justify-between">
              <span className="text-graphite-300">Cipher Suite:</span>
              <span className="text-graphite-100 font-bold">AES-256-GCM (Authenticated Encryption with Associated Data)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Key Derivation Function:</span>
              <span className="text-graphite-100">PBKDF2-HMAC-SHA256 (100,000 rounds)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Client Masking Guarantee:</span>
              <span className="text-status-success font-semibold">Passwords redacted before API serialization</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Master Secret Source:</span>
              <span className="text-brand-teal">TRAFIORA_VAULT_KEY (Environment Variable)</span>
            </div>
          </div>
        </div>

        {/* Monitoring Budget Safeguards */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h2 className="text-xs font-semibold text-graphite-50 uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-teal" />
              <span>Monitoring Overhead Guardrails</span>
            </h2>
            <span className="text-[10px] text-graphite-300">Strict &lt; 1% Budget</span>
          </div>

          <div className="p-3 rounded bg-graphite-950 border border-graphite-600 space-y-2">
            <div className="flex justify-between">
              <span className="text-graphite-300">Maximum Allowed Host CPU Budget:</span>
              <span className="text-brand-teal font-bold tabular-nums">&lt; 1.0% Database Host CPU</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Current Measured Overhead:</span>
              <span className="text-graphite-100 font-bold tabular-nums">0.58% (Within Safe Boundary)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Host CPU Measurement Source:</span>
              <span className="text-graphite-200">System Telemetry Probe (Fallback: pg_stat_statements exec time ratio)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-graphite-300">Auto-Throttling Policy:</span>
              <span className="text-status-success font-semibold">Polling interval doubles if CPU exceeds 0.8%</span>
            </div>
          </div>
        </div>

        {/* Operational Security Tiers Policy */}
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h2 className="text-xs font-semibold text-graphite-50 uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-teal" />
              <span>Three-Tier Operational Security Model</span>
            </h2>
            <span className="text-[10px] text-graphite-300">Safety Boundaries</span>
          </div>

          <div className="space-y-2 font-sans text-xs">
            <div className="p-2.5 rounded bg-graphite-950 border border-graphite-600 space-y-1">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-status-success text-[11px]">Tier 1: Read-Only Observation</span>
                <span className="text-[10px] text-graphite-400">&bull; Production Monitoring</span>
              </div>
              <p className="text-graphite-300 text-[11px] leading-relaxed">
                Zero benchmark executions permitted. Queries run with <code className="text-brand-teal font-mono">default_transaction_read_only=on</code>. All DML/DDL and EXPLAIN ANALYZE statements are strictly blocked before execution.
              </p>
            </div>

            <div className="p-2.5 rounded bg-graphite-950 border border-graphite-600 space-y-1">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-status-warning text-[11px]">Tier 2: Workload Benchmark Target</span>
                <span className="text-[10px] text-graphite-400">&bull; Authorized Staging</span>
              </div>
              <p className="text-graphite-300 text-[11px] leading-relaxed">
                Explicitly authorized test database for running pgbench workloads, stress testing, and measuring latency distributions.
              </p>
            </div>

            <div className="p-2.5 rounded bg-graphite-950 border border-graphite-600 space-y-1">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-status-error text-[11px]">Tier 3: Disposable Sandbox</span>
                <span className="text-[10px] text-graphite-400">&bull; DDL Optimization Verification</span>
              </div>
              <p className="text-graphite-300 text-[11px] leading-relaxed">
                Isolated disposable sandbox permitted for index creation verification, DDL changes, and destructive overload simulations.
              </p>
            </div>
          </div>
        </div>

        {/* Engine Versions & Tech Stack */}
        <div className="panel p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
            <h2 className="text-xs font-semibold text-graphite-50 uppercase flex items-center gap-2 font-mono">
              <Server className="w-4 h-4 text-brand-teal" />
              <span>Technology Stack &amp; Engine Support</span>
            </h2>
            <span className="text-[10px] font-mono text-graphite-300">Verified Compatible</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-graphite-950 border border-graphite-700">
              <span className="text-graphite-400 block text-[10px]">DATABASE ENGINE</span>
              <span className="text-graphite-50 font-bold">PostgreSQL 18.6 / 16</span>
            </div>
            <div className="p-2 rounded bg-graphite-950 border border-graphite-700">
              <span className="text-graphite-400 block text-[10px]">AST NORMALIZER</span>
              <span className="text-graphite-50 font-bold">SQLGlot 26.x</span>
            </div>
            <div className="p-2 rounded bg-graphite-950 border border-graphite-700">
              <span className="text-graphite-400 block text-[10px]">API RUNTIME</span>
              <span className="text-graphite-50 font-bold">FastAPI / Python 3.12</span>
            </div>
            <div className="p-2 rounded bg-graphite-950 border border-graphite-700">
              <span className="text-graphite-400 block text-[10px]">WEB PLATFORM</span>
              <span className="text-graphite-50 font-bold">Next.js 16 / React 19</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
