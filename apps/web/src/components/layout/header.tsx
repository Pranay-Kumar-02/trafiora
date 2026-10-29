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
        const healthRes = await apiClient.get<{ status: string; healthy?: boolean; ok?: boolean }>("/health");
        const isHealthy = healthRes?.status === "healthy" || healthRes?.status === "ok" || healthRes?.healthy === true;
        setApiOnline(isHealthy);
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
    <header className="h-11 sm:h-12 border-b border-[#202630] bg-[#090B0E] px-3.5 sm:px-4 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
      {/* Active Database Context & Operational Tier */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-mono overflow-x-auto py-0.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D1014] border border-[#202630] text-[#E8EAF0] shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <Database className="w-3.5 h-3.5 text-[#4E9F8E]" />
          {activeConn ? (
            <>
              <span className="font-semibold text-[#E8EAF0]">{activeConn.host}</span>
              <span className="text-[#626C79]">:{activeConn.port}/{activeConn.database_name}</span>
            </>
          ) : (
            <span className="text-[#626C79]">No Target DB Configured</span>
          )}
        </div>

        {/* Operational Safety Tier */}
        <div className="shrink-0">
          {activeConn ? (
            activeConn.operational_tier === "tier_1_read_only" ? (
              <Badge variant="tier1">Tier 1: Read-Only Observation</Badge>
            ) : activeConn.operational_tier === "tier_3_administrative_mutation" ? (
              <Badge variant="tier3">Tier 3: Disposable Sandbox</Badge>
            ) : (
              <Badge variant="tier2">Tier 2: Authorized Benchmark</Badge>
            )
          ) : (
            <Badge variant="neutral">Unconnected Target</Badge>
          )}
        </div>

        {/* Telemetry Freshness */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#626C79] shrink-0">
          <Clock className="w-3 h-3 text-[#626C79]" />
          <span>Refreshed: {freshness}</span>
        </div>
      </div>

      {/* Control Plane Status & Global Action */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* API Health */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              apiOnline === true
                ? "bg-[#34D399]"
                : apiOnline === false
                ? "bg-[#FB7185]"
                : "bg-[#626C79]"
            }`}
          />
          <span className="text-[#929AA6] hidden sm:inline text-[11px]">
            {apiOnline === true ? "Control Plane: Active" : "Control Plane: Offline"}
          </span>
        </div>

        {/* Precision Hardware Contextual Action */}
        <Link
          href="/experiments"
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#12161C] hover:bg-[#191E25] text-[#E8EAF0] border border-[#28323F] hover:border-[#364354] font-medium text-xs transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <Play className="w-3 h-3 text-[#4E9F8E] fill-[#4E9F8E]" />
          <span>Run Experiment</span>
        </Link>
      </div>
    </header>
  );
}
