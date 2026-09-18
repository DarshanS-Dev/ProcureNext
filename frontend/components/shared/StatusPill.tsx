import React from "react";
import { ApplicationStatus, PSStatus, ChecklistStatus, RiskLevel } from "@/lib/api/enums";

export function StatusPill({ status }: { status: ApplicationStatus | string }) {
  const getColors = (st: string) => {
    switch (st) {
      case "applied":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "under_review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "under_evaluation":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "selected":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "not_selected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "contracted":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "completed":
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getLabel = (st: string) => {
    return st.replace(/_/g, " ").toUpperCase();
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getColors(
        status
      )}`}
    >
      {getLabel(status)}
    </span>
  );
}

export function PSStatusPill({ status }: { status: PSStatus | string }) {
  const getColors = (st: string) => {
    switch (st) {
      case "draft":
        return "bg-slate-800 text-slate-400 border-slate-700";
      case "published":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "closed":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getColors(
        status
      )}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
