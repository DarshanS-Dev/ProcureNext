import React from "react";
import { RiskLevel } from "@/lib/api/enums";

export function RiskBadge({ level }: { level?: RiskLevel | string }) {
  if (!level) return <span className="text-slate-500 text-xs">N/A</span>;

  const getColors = (l: string) => {
    switch (l) {
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getColors(
        level
      )}`}
    >
      {level.toUpperCase()}
    </span>
  );
}
