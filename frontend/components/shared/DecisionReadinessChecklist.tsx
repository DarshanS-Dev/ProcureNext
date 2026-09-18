"use client";

import React from "react";
import { DecisionReadinessRead } from "@/lib/api/types";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";

export function DecisionReadinessChecklist({
  readiness,
}: {
  readiness: DecisionReadinessRead | null;
}) {
  if (!readiness) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400">
        Loading readiness checks...
      </div>
    );
  }

  const items = [
    { label: "Eligibility Gate Passed", passed: readiness.eligibility_passed },
    { label: "Stage 3 Scoring Complete", passed: readiness.stage3_scoring_complete },
    { label: "No Unresolved COI Declarations", passed: readiness.no_unresolved_coi },
    { label: "Commercial Proposals Unlocked", passed: readiness.commercial_unlocked },
    { label: "Final Risk Profile Computed", passed: readiness.final_risk_profile_exists },
    { label: "Containment Plan Approved", passed: readiness.containment_plan_exists },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          Decision Readiness Verification
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            readiness.overall_ready
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }`}
        >
          {readiness.overall_ready ? "READY FOR SELECTION" : "GATES PENDING"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center space-x-3 p-3 rounded-lg border ${
              item.passed
                ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                : "bg-slate-950/50 border-slate-800 text-slate-400"
            }`}
          >
            {item.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-xs font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
