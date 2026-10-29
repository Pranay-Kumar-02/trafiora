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
        return <span key={i} className="text-[#CBD5E1] font-semibold">{token}</span>;
      }
      if (/^\$\d+$/.test(token) || /^\?$/.test(token)) {
        return <span key={i} className="text-[#FBBF24] font-mono bg-[#191408] border border-[#38290E] px-0.5 rounded text-[11px]">{token}</span>;
      }
      if (/^'[^']*'$/.test(token)) {
        return <span key={i} className="text-[#E8EAF0]">{token}</span>;
      }
      if (/^\d+(\.\d+)?$/.test(token)) {
        return <span key={i} className="text-[#CBD5E1]">{token}</span>;
      }
      if (/^--.*$/.test(token)) {
        return <span key={i} className="text-[#626C79] italic">{token}</span>;
      }
      return <span key={i} className="text-[#929AA6]">{token}</span>;
    });
  };

  return (
    <div className={`panel overflow-hidden border border-[#202630] ${className}`}>
      {/* Viewer Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D1014] border-b border-[#202630] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#CBD5E1] uppercase font-semibold text-[10px]">{dialect}</span>
          {isRedacted && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#191408] text-[#FBBF24] border border-[#38290E]">
              Literals Masked ($N)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrap(!wrap)}
            className={`p-1 rounded text-[#626C79] hover:text-[#E8EAF0] transition-colors ${wrap ? "bg-[#191E25] text-[#E8EAF0]" : ""}`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#12161C] hover:bg-[#191E25] text-[#929AA6] hover:text-[#E8EAF0] border border-[#202630] transition-colors text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3 text-[#626C79]" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* SQL Body */}
      <pre
        className={`p-3 text-xs font-mono bg-[#050607] text-[#E8EAF0] overflow-x-auto leading-relaxed select-text shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] ${
          wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
        }`}
      >
        <code>{highlightSQL(sql)}</code>
      </pre>
    </div>
  );
}
