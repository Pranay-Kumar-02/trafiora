"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  Database,
  GitCompare,
  Layers,
  Play,
  RotateCw,
  Settings,
  ShieldAlert,
  Terminal,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Overview", href: "/", icon: Activity },
  { name: "Workload Queries", href: "/workload", icon: Database },
  { name: "Architecture Canvas", href: "/canvas", icon: Layers },
  { name: "A/B Comparison", href: "/compare", icon: GitCompare },
  { name: "Experiments", href: "/experiments", icon: Play },
  { name: "Bottlenecks", href: "/diagnosis", icon: BarChart2 },
  { name: "Protection Policies", href: "/protection", icon: ShieldAlert },
  { name: "CI Regressions", href: "/ci", icon: Terminal },
  { name: "Connections", href: "/connections", icon: RotateCw },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-800 bg-gray-950/80 backdrop-blur-md flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent">
            TRAFIORA
          </span>
          <span className="block text-[10px] text-cyan-400 font-medium tracking-widest uppercase">
            Diagnose. Prove. Protect.
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-gray-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800/80 text-xs text-gray-500">
        <div className="flex items-center justify-between mb-1.5">
          <span>Engine Support</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 font-mono border border-emerald-800/50">
            PostgreSQL 18.6
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>Version</span>
          <span className="font-mono">v2.2.0</span>
        </div>
      </div>
    </aside>
  );
}
