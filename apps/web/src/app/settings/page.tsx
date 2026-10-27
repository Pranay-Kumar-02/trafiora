"use client";

import { CheckCircle2, Cpu, Key, Lock, Server, Settings, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          System Settings & Platform Configuration
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Cryptographic vault parameters, monitoring CPU budgets, and platform telemetry controls.
        </p>
      </div>

      <div className="space-y-5">
        {/* Security & Vault */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Envelope Credential Vault
          </h2>
          <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Cipher Suite:</span>
              <span className="font-mono text-white">AES-256-GCM (Authenticated Encryption)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Key Derivation:</span>
              <span className="font-mono text-white">PBKDF2-HMAC-SHA256 (100,000 iterations)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Credential Storage:</span>
              <span className="text-emerald-400 font-semibold">Zero plaintext passwords logged or persisted</span>
            </div>
          </div>
        </div>

        {/* Monitoring Budget Safeguards */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Monitoring Overhead Guardrails
          </h2>
          <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Max Host CPU Monitoring Budget:</span>
              <span className="font-mono text-emerald-400 font-bold">&lt; 1.0% Host CPU</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Degradation Fallback Metric:</span>
              <span className="font-mono text-gray-300">STATEMENT_EXEC_TIME_RATIO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Auto-Throttling:</span>
              <span className="text-emerald-400 font-semibold">Backs off polling interval if budget exceeded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
