"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Play,
  RotateCw,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "../ui/Badge";

interface ActiveConn {
  id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  operational_tier: string;
}

export function Header() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [freshness, setFreshness] = useState<string>("just now");
  const [activeConn, setActiveConn] = useState<ActiveConn | null>(null);

  useEffect(() => {
    const checkState = async () => {
      try {
        await apiClient.get("/health");
        setApiOnline(true);
        const now = new Date();
        setFreshness(now.toLocaleTimeString());

        // Fetch active connection context
        const statusRes = await apiClient.get<{ connection: ActiveConn | null }>("/connections/active/status").catch(() => null);
        if (statusRes && statusRes.connection) {
          setActiveConn(statusRes.connection);
        } else {
          setActiveConn(null);
        }
      } catch {
        setApiOnline(false);
      }
    };

    checkState();
    const interval = setInterval(checkState, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 border-b border-graphite-600 bg-graphite-900 px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Active Database Context & Operational Tier */}
      <div className="flex items-center gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-graphite-800 border border-graphite-600 text-graphite-100">
          <Database className="w-3.5 h-3.5 text-brand-teal" />
          {activeConn ? (
            <>
              <span className="font-semibold text-graphite-50">{activeConn.host}</span>
              <span className="text-graphite-400">:{activeConn.port}/{activeConn.database_name}</span>
            </>
          ) : (
            <span className="text-graphite-300">No Target DB Configured</span>
          )}
        </div>

        {/* Operational Safety Tier */}
        {activeConn ? (
          activeConn.operational_tier === "tier_1_read_only" ? (
            <Badge variant="tier1">Tier 1: Read-Only Observation Only</Badge>
          ) : activeConn.operational_tier === "tier_3_administrative_mutation" ? (
            <Badge variant="tier3">Tier 3: Disposable Sandbox</Badge>
          ) : (
            <Badge variant="tier2">Tier 2: Authorized Benchmark Target</Badge>
          )
        ) : (
          <Badge variant="neutral">Unconnected Target</Badge>
        )}

        {/* Telemetry Freshness */}
        <div className="hidden md:flex items-center gap-1 text-[11px] text-graphite-300">
          <Clock className="w-3 h-3 text-graphite-400" />
          <span>Refreshed: {freshness}</span>
        </div>
      </div>


      {/* Control Plane Status & Global Action */}
      <div className="flex items-center gap-3">
        {/* API Health */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              apiOnline === true
                ? "bg-status-success animate-pulse"
                : apiOnline === false
                ? "bg-status-error"
                : "bg-graphite-400"
            }`}
          />
          <span className="text-graphite-200 hidden sm:inline text-[11px]">
            {apiOnline === true ? "Control Plane: Active" : "Control Plane: Offline"}
          </span>
        </div>

        {/* Contextual Action */}
        <Link
          href="/experiments"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-teal text-graphite-950 font-semibold text-xs hover:bg-brand-tealLight transition-colors shadow-subtle"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run Experiment</span>
        </Link>
      </div>
    </header>
  );
}
