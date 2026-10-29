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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-[#090B0E] border-b border-[#202630] px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          {/* Brand Mark */}
          <div className="w-6 h-6 rounded bg-[#12161C] border border-[#28323F] flex items-center justify-center">
            <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-[#4E9F8E] transform rotate-45" />
          </div>
          <span className="font-mono font-bold text-sm text-[#E8EAF0] tracking-wider">TRAFIORA</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded text-[#929AA6] hover:text-[#E8EAF0] bg-[#12161C] border border-[#202630]"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-[#929AA6]" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Main Element */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 flex flex-col bg-[#090B0E] border-r border-[#202630] transition-all duration-200 select-none shadow-[4px_0_24px_rgba(0,0,0,0.6)] ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="h-14 px-3.5 border-b border-[#202630] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden"
            onClick={() => setMobileOpen(false)}
          >
            {/* Precision Infrastructure Brand Mark */}
            <div className="w-7 h-7 rounded bg-[#12161C] border border-[#28323F] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="#4E9F8E" />
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="#929AA6" strokeWidth="1.2" />
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="#929AA6" strokeWidth="1.2" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="#12161C" stroke="#4E9F8E" strokeWidth="1.2" />
                <line x1="7" y1="4.5" x2="9" y2="4.5" stroke="#4E9F8E" strokeWidth="1" />
                <line x1="4.5" y1="7" x2="4.5" y2="9" stroke="#4E9F8E" strokeWidth="1" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-mono font-bold text-sm text-[#E8EAF0] tracking-wider">
                  TRAFIORA
                </span>
                <span className="text-[9px] text-[#626C79] font-mono tracking-widest uppercase">
                  Diagnose &bull; Prove &bull; Protect
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1 rounded hover:bg-[#12161C] text-[#626C79] hover:text-[#E8EAF0] transition-colors"
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
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#626C79] font-semibold">
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
                          ? "bg-[#12161C] text-[#E8EAF0] border-l-2 border-[#4E9F8E] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          : "text-[#929AA6] hover:text-[#E8EAF0] hover:bg-[#12161C]/50"
                      }`}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#4E9F8E]" : "text-[#626C79]"}`} />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.name}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="text-[10px] font-mono px-1 rounded bg-[#12161C] text-[#626C79] border border-[#202630]">
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
          <div className="p-3 border-t border-[#202630] bg-[#050607]/80 text-[11px] font-mono text-[#626C79] space-y-1">
            <div className="flex items-center justify-between">
              <span>Target Engine</span>
              <span className="text-[#CBD5E1]">PostgreSQL 18.6</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span>Trafiora Core</span>
              <span className="text-[#4E9F8E]">v2.2.0-stable</span>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-[#202630] flex justify-center text-[10px] font-mono text-[#626C79]">
            <span>v2.2</span>
          </div>
        )}
      </aside>
    </>
  );
}
