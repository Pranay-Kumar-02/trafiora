"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Shield, Zap } from "lucide-react";

export function Header() {
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [tier, setTier] = useState<string>("tier_2_workload_benchmark");

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Current Connection & Tier Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-sm">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-gray-200">PostgreSQL Target</span>
          <span className="text-gray-500">|</span>
          <span className="font-mono text-xs text-gray-400">pg-test.internal:5432/app_db</span>
        </div>

        {/* Operational Tier Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-950/40 text-amber-300 border-amber-800/50">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Tier 2: Authorized Test Target</span>
        </div>
      </div>

      {/* Status & Quick Actions */}
      <div className="flex items-center gap-4">
        {/* API Health indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-gray-400">Control Plane: Online</span>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all">
          <Zap className="w-3.5 h-3.5" />
          <span>New Experiment</span>
        </button>
      </div>
    </header>
  );
}
