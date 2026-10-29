"use client";

import { CheckCircle2, Cpu, HardDrive, Key, Lock, Server, Settings, Shield, Zap } from "lucide-react";
import { Badge } from "../../components/ui/Badge";

export default function SettingsPage() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202630] pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#E8EAF0] flex items-center gap-2 font-mono uppercase">
            <Settings className="w-4 h-4 text-[#4E9F8E]" />
            <span>System Settings &amp; Platform Configuration</span>
          </h1>
          <p className="text-xs text-[#929AA6] mt-0.5 font-sans">
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
        <div className="bg-[#0D1014] border border-[#202630] rounded p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] uppercase flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#4E9F8E]" />
              <span>Envelope Credential Vault Specification</span>
            </h2>
            <span className="text-[10px] text-[#626C79]">Zero Plaintext Persistence</span>
          </div>

          <div className="p-3.5 rounded bg-[#090B0E] border border-[#202630] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Cipher Suite:</span>
              <span className="text-[#E8EAF0] font-bold">AES-256-GCM (Authenticated Encryption)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Key Derivation Function:</span>
              <span className="text-[#CBD5E1]">PBKDF2-HMAC-SHA256 (100,000 rounds)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Client Masking Guarantee:</span>
              <span className="text-[#34D399] font-semibold">Passwords redacted before API serialization</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Master Secret Source:</span>
              <span className="text-[#CBD5E1] font-mono">TRAFIORA_VAULT_KEY (Environment Variable)</span>
            </div>
          </div>
        </div>

        {/* Monitoring Budget Safeguards */}
        <div className="bg-[#0D1014] border border-[#202630] rounded p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#4E9F8E]" />
              <span>Monitoring Overhead Guardrails</span>
            </h2>
            <span className="text-[10px] text-[#626C79]">Strict &lt; 1% Budget</span>
          </div>

          <div className="p-3.5 rounded bg-[#090B0E] border border-[#202630] space-y-2">
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Maximum Allowed Host CPU Budget:</span>
              <span className="text-[#CBD5E1] font-bold tabular-nums">&lt; 1.0% Database Host CPU</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Current Measured Overhead:</span>
              <span className="text-[#E8EAF0] font-bold tabular-nums">0.58% (Within Safe Boundary)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Host CPU Measurement Source:</span>
              <span className="text-[#CBD5E1]">System Telemetry Probe (Fallback: pg_stat_statements ratio)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929AA6]">Auto-Throttling Policy:</span>
              <span className="text-[#34D399] font-semibold">Polling interval doubles if CPU exceeds 0.8%</span>
            </div>
          </div>
        </div>

        {/* Operational Security Tiers Policy */}
        <div className="bg-[#0D1014] border border-[#202630] rounded p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#4E9F8E]" />
              <span>Three-Tier Operational Security Model</span>
            </h2>
            <span className="text-[10px] text-[#626C79]">Safety Boundaries</span>
          </div>

          <div className="space-y-2 font-sans text-xs">
            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-1">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-[#34D399] text-[11px]">Tier 1: Read-Only Observation</span>
                <span className="text-[10px] text-[#626C79]">&bull; Production Monitoring</span>
              </div>
              <p className="text-[#929AA6] text-[11px] leading-relaxed">
                Zero benchmark executions permitted. Queries run with <code className="text-[#CBD5E1] font-mono bg-[#050607] px-1 py-0.5 rounded border border-[#202630]">default_transaction_read_only=on</code>. All DML/DDL and EXPLAIN ANALYZE statements are strictly blocked before execution.
              </p>
            </div>

            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-1">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-[#FBBF24] text-[11px]">Tier 2: Workload Benchmark Target</span>
                <span className="text-[10px] text-[#626C79]">&bull; Authorized Staging</span>
              </div>
              <p className="text-[#929AA6] text-[11px] leading-relaxed">
                Explicitly authorized test database for running pgbench workloads, stress testing, and measuring latency distributions.
              </p>
            </div>

            <div className="p-3 rounded bg-[#090B0E] border border-[#202630] space-y-1">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-[#FB7185] text-[11px]">Tier 3: Disposable Sandbox</span>
                <span className="text-[10px] text-[#626C79]">&bull; DDL Optimization Verification</span>
              </div>
              <p className="text-[#929AA6] text-[11px] leading-relaxed">
                Isolated disposable sandbox permitted for index creation verification, DDL changes, and destructive overload simulations.
              </p>
            </div>
          </div>
        </div>

        {/* Engine Versions & Tech Stack */}
        <div className="bg-[#0D1014] border border-[#202630] rounded p-4 space-y-2 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-[#202630] pb-2">
            <h2 className="text-xs font-semibold text-[#E8EAF0] uppercase flex items-center gap-2 font-mono">
              <Server className="w-4 h-4 text-[#4E9F8E]" />
              <span>Technology Stack &amp; Engine Support</span>
            </h2>
            <span className="text-[10px] font-mono text-[#626C79]">Verified Compatible</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2.5 rounded bg-[#090B0E] border border-[#202630]">
              <span className="text-[#626C79] block text-[10px]">DATABASE ENGINE</span>
              <span className="text-[#E8EAF0] font-bold">PostgreSQL 18.6 / 16</span>
            </div>
            <div className="p-2.5 rounded bg-[#090B0E] border border-[#202630]">
              <span className="text-[#626C79] block text-[10px]">AST NORMALIZER</span>
              <span className="text-[#E8EAF0] font-bold">SQLGlot 26.x</span>
            </div>
            <div className="p-2.5 rounded bg-[#090B0E] border border-[#202630]">
              <span className="text-[#626C79] block text-[10px]">API RUNTIME</span>
              <span className="text-[#E8EAF0] font-bold">FastAPI / Python 3.12</span>
            </div>
            <div className="p-2.5 rounded bg-[#090B0E] border border-[#202630]">
              <span className="text-[#626C79] block text-[10px]">WEB PLATFORM</span>
              <span className="text-[#E8EAF0] font-bold">Next.js 16 / React 19</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
