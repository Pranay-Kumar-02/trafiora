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
            ? "bg-[#191408] border-[#38290E] text-[#FBBF24]"
            : "bg-[#0D1014] border-[#202630] text-[#E8EAF0] shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {depth > 0 && <CornerDownRight className="w-3.5 h-3.5 text-[#626C79] shrink-0 mt-0.5" />}
        
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isWarning ? "text-[#FBBF24]" : "text-[#E8EAF0]"}`}>
              {node.nodeType}
            </span>
            {node.relationName && (
              <span className="text-[#929AA6]">on <strong className="text-[#CBD5E1] font-semibold">{node.relationName}</strong></span>
            )}
            {node.indexName && (
              <span className="text-[#626C79]">using <em className="text-[#4E9F8E] not-italic">{node.indexName}</em></span>
            )}
            {isWarning && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#FBBF24] px-1.5 py-0.2 rounded bg-[#38290E]/50 border border-[#38290E]">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>Full Table Scan</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#626C79]">
            <span>Cost: <strong className="text-[#CBD5E1] tabular-nums font-mono">{node.totalCost.toFixed(1)}</strong></span>
            <span>Est Rows: <strong className="text-[#CBD5E1] tabular-nums font-mono">{node.planRows}</strong></span>
            {node.actualRows !== undefined && (
              <span>Actual Rows: <strong className="text-[#CBD5E1] tabular-nums font-mono">{node.actualRows}</strong></span>
            )}
          </div>

          {node.filter && (
            <div className="text-[10px] text-[#626C79] font-mono">
              Filter: <code className="text-[#929AA6] bg-[#050607] px-1 py-0.5 rounded border border-[#202630]">{node.filter}</code>
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
      <div className="flex items-center justify-between border-b border-[#202630] pb-2">
        <h4 className="text-xs font-semibold text-[#E8EAF0] flex items-center gap-1.5 font-mono">
          <span>PostgreSQL EXPLAIN Execution Tree</span>
        </h4>
        <span className="text-[10px] font-mono text-[#626C79]">Static AST / Cost Tree Analysis</span>
      </div>

      <div className="space-y-1 overflow-x-auto py-1">
        <RenderNode node={plan} />
      </div>
    </div>
  );
}
