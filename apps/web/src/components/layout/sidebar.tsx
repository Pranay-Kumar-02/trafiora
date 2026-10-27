"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  GitCompare,
  Layers,
  Menu,
  Play,
  RotateCw,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Terminal,
  X,
  Zap,
} from "lucide-react";

interface NavGroup {
  label: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workload Intelligence",
    items: [
      { name: "Overview", href: "/", icon: Activity },
      { name: "Workload Queries", href: "/workload", icon: Database },
      { name: "Bottlenecks", href: "/diagnosis", icon: AlertTriangle },
      { name: "Architecture Canvas", href: "/canvas", icon: Layers },
    ],
  },
  {
    label: "Verification & A/B",
    items: [
      { name: "Experiments", href: "/experiments", icon: Play },
      { name: "A/B Comparison", href: "/compare", icon: GitCompare },
      { name: "CI Regressions", href: "/ci", icon: Terminal },
    ],
  },
  {
    label: "Infrastructure & Safety",
    items: [
      { name: "Overload Protection", href: "/protection", icon: ShieldAlert },
      { name: "Target Connections", href: "/connections", icon: RotateCw },
      { name: "System Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Drawer Trigger Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-graphite-900 border-b border-graphite-600 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          {/* Brand Mark */}
          <div className="w-6 h-6 rounded bg-graphite-800 border border-brand-tealMuted flex items-center justify-center">
            <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-brand-teal transform rotate-45" />
          </div>
          <span className="font-mono font-bold text-sm text-graphite-50 tracking-wider">TRAFIORA</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded text-graphite-200 hover:text-white bg-graphite-800 border border-graphite-600"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Main Element */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 flex flex-col bg-graphite-900 border-r border-graphite-600 transition-all duration-200 select-none ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="h-14 px-3.5 border-b border-graphite-600 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden"
            onClick={() => setMobileOpen(false)}
          >
            {/* Precision Infrastructure Brand Mark */}
            <div className="w-7 h-7 rounded bg-graphite-800 border border-graphite-500 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="#66D9C0" />
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="#9AA5B1" strokeWidth="1.2" />
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="#9AA5B1" strokeWidth="1.2" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="#222A35" stroke="#66D9C0" strokeWidth="1.2" />
                <line x1="7" y1="4.5" x2="9" y2="4.5" stroke="#66D9C0" strokeWidth="1" />
                <line x1="4.5" y1="7" x2="4.5" y2="9" stroke="#66D9C0" strokeWidth="1" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-mono font-bold text-sm text-graphite-50 tracking-wider">
                  TRAFIORA
                </span>
                <span className="text-[9px] text-graphite-300 font-mono tracking-widest uppercase">
                  Diagnose &bull; Prove &bull; Protect
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1 rounded hover:bg-graphite-800 text-graphite-300 hover:text-graphite-100 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-graphite-300 font-semibold">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-graphite-800 text-brand-teal border-l-2 border-brand-teal font-semibold"
                          : "text-graphite-200 hover:text-graphite-50 hover:bg-graphite-850"
                      }`}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-teal" : "text-graphite-300"}`} />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.name}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="text-[10px] font-mono px-1 rounded bg-graphite-750 text-graphite-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Hardware & Engine Info */}
        {!collapsed ? (
          <div className="p-3 border-t border-graphite-600 bg-graphite-950/60 text-[11px] font-mono text-graphite-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>Target Engine</span>
              <span className="text-graphite-100">PostgreSQL 18.6</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span>Trafiora Core</span>
              <span className="text-brand-teal">v2.2.0-stable</span>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-graphite-600 flex justify-center text-[10px] font-mono text-graphite-300">
            <span>v2.2</span>
          </div>
        )}
      </aside>
    </>
  );
}
