"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, CornerDownRight } from "lucide-react";

export interface PlanNode {
  nodeType: string;
  relationName?: string;
  indexName?: string;
  totalCost: number;
  planRows: number;
  actualRows?: number;
  actualLoops?: number;
  filter?: string;
  isSeqScan?: boolean;
  children?: PlanNode[];
}

interface QueryPlanViewerProps {
  plan: PlanNode;
  className?: string;
}

function RenderNode({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  const isWarning = node.isSeqScan || node.nodeType.toLowerCase().includes("seq scan");

  return (
    <div className="space-y-1">
      <div
        className={`flex items-start gap-2 p-2 rounded text-xs font-mono border ${
          isWarning
            ? "bg-status-warningSurface/60 border-status-warningBorder text-graphite-100"
            : "bg-graphite-850/80 border-graphite-600/70 text-graphite-200"
        }`}
        style={{ marginLeft: `${depth * 18}px` }}
      >
        {depth > 0 && <CornerDownRight className="w-3.5 h-3.5 text-graphite-300 shrink-0 mt-0.5" />}
        
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isWarning ? "text-status-warning" : "text-graphite-50"}`}>
              {node.nodeType}
            </span>
            {node.relationName && (
              <span className="text-graphite-100">on <strong className="text-brand-teal">{node.relationName}</strong></span>
            )}
            {node.indexName && (
              <span className="text-graphite-300">using <em className="text-status-info not-italic">{node.indexName}</em></span>
            )}
            {isWarning && (
              <span className="inline-flex items-center gap-1 text-[10px] text-status-warning px-1 rounded bg-status-warningBorder/40">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>Full Table Scan</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-graphite-300">
            <span>Cost: <strong className="text-graphite-100 tabular-nums">{node.totalCost.toFixed(1)}</strong></span>
            <span>Est Rows: <strong className="text-graphite-100 tabular-nums">{node.planRows}</strong></span>
            {node.actualRows !== undefined && (
              <span>Actual Rows: <strong className="text-graphite-100 tabular-nums">{node.actualRows}</strong></span>
            )}
          </div>

          {node.filter && (
            <div className="text-[10px] text-graphite-300 font-mono">
              Filter: <code className="text-graphite-200">{node.filter}</code>
            </div>
          )}
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child, i) => (
            <RenderNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function QueryPlanViewer({ plan, className = "" }: QueryPlanViewerProps) {
  return (
    <div className={`panel p-3.5 space-y-2 ${className}`}>
      <div className="flex items-center justify-between border-b border-graphite-600 pb-2">
        <h4 className="text-xs font-semibold text-graphite-50 flex items-center gap-1.5 font-mono">
          <span>PostgreSQL EXPLAIN Execution Tree</span>
        </h4>
        <span className="text-[10px] font-mono text-graphite-300">Static AST / Cost Tree Analysis</span>
      </div>

      <div className="space-y-1 overflow-x-auto py-1">
        <RenderNode node={plan} />
      </div>
    </div>
  );
}
