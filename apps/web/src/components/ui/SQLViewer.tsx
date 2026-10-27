"use client";

import React, { useState } from "react";
import { Copy, Check, WrapText } from "lucide-react";

interface SQLViewerProps {
  sql: string;
  dialect?: string;
  isRedacted?: boolean;
  className?: string;
}

export function SQLViewer({
  sql,
  dialect = "postgres",
  isRedacted = true,
  className = "",
}: SQLViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple token highlighter for common SQL syntax
  const highlightSQL = (query: string) => {
    const keywords = [
      "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER",
      "ON", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET", "AND", "OR",
      "IN", "NOT", "AS", "INSERT", "UPDATE", "DELETE", "SET", "VALUES", "WITH",
      "EXPLAIN", "ANALYZE", "COUNT", "SUM", "AVG", "MIN", "MAX"
    ];

    const tokens = query.split(/(\s+|[(),;])/);
    return tokens.map((token, i) => {
      const upper = token.toUpperCase();
      if (keywords.includes(upper)) {
        return <span key={i} className="text-brand-teal font-semibold">{token}</span>;
      }
      if (/^\$\d+$/.test(token) || /^\?$/.test(token)) {
        return <span key={i} className="text-status-warning font-mono bg-status-warningSurface px-0.5 rounded">{token}</span>;
      }
      if (/^'[^']*'$/.test(token)) {
        return <span key={i} className="text-[#FCD34D]">{token}</span>;
      }
      if (/^\d+(\.\d+)?$/.test(token)) {
        return <span key={i} className="text-[#F472B6]">{token}</span>;
      }
      if (/^--.*$/.test(token)) {
        return <span key={i} className="text-graphite-300 italic">{token}</span>;
      }
      return <span key={i} className="text-graphite-50">{token}</span>;
    });
  };

  return (
    <div className={`panel overflow-hidden border border-graphite-600 ${className}`}>
      {/* Viewer Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-graphite-850 border-b border-graphite-600 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-graphite-200 uppercase font-semibold text-[10px]">{dialect}</span>
          {isRedacted && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-status-warningSurface text-status-warning border border-status-warningBorder">
              Literals Masked ($N)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrap(!wrap)}
            className={`p-1 rounded text-graphite-300 hover:text-graphite-100 transition-colors ${wrap ? "bg-graphite-700 text-graphite-100" : ""}`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-graphite-750 hover:bg-graphite-700 text-graphite-200 hover:text-white transition-colors text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* SQL Body */}
      <pre
        className={`p-3 text-xs font-mono bg-graphite-950 overflow-x-auto leading-relaxed select-text ${
          wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
        }`}
      >
        <code>{highlightSQL(sql)}</code>
      </pre>
    </div>
  );
}
