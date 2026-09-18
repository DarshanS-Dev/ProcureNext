"use client";

import React, { useState } from "react";
import { ProblemStatementRead, KPIRead, ApplicationRead, InviteWithConversionRead, QCBSRankingRead } from "@/lib/api/types";
import { Role } from "@/lib/api/enums";
import { PSStatusPill } from "@/components/shared/StatusPill";
import { api } from "@/lib/api/client";
import { Layers, FileText, Users, Award, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

interface ProblemStatementShellProps {
  role: Role;
  problemStatement: ProblemStatementRead;
  kpis: KPIRead[];
  applications?: ApplicationRead[];
  invites?: InviteWithConversionRead[];
  qcbsRanking?: QCBSRankingRead | null;
  onRefresh?: () => void;
}

export function ProblemStatementShell({
  role,
  problemStatement,
  kpis,
  applications = [],
  invites = [],
  qcbsRanking = null,
  onRefresh,
}: ProblemStatementShellProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded">
                {problemStatement.category}
              </span>
              <PSStatusPill status={problemStatement.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-2">
              {problemStatement.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Created on {new Date(problemStatement.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {role === "startup" && problemStatement.status === "published" && (
              <a
                href={`/startup/applications/new?problem_statement_id=${problemStatement.id}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
              >
                Submit Application
              </a>
            )}
            {role === "admin" && (
              <a
                href={`/admin/problem-statements/${problemStatement.id}/evaluators`}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition"
              >
                Manage Evaluators
              </a>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center space-x-1 border-b border-slate-800 mt-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === "overview"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("kpis")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === "kpis"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            KPIs ({kpis.length})
          </button>

          {role === "officer" && (
            <>
              <button
                onClick={() => setActiveTab("applications")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === "applications"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Applications ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab("invites")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === "invites"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Invites & Tracking ({invites.length})
              </button>
              <button
                onClick={() => setActiveTab("qcbs")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === "qcbs"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                QCBS Ranking
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[300px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                {problemStatement.description || "No description provided."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget Range</h4>
                <p className="text-sm font-semibold text-slate-200 mt-1">
                  {problemStatement.budget_range || "Not specified"}
                </p>
                {problemStatement.budget_description && (
                  <p className="text-xs text-slate-400 mt-1">{problemStatement.budget_description}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Beneficiaries</h4>
                <p className="text-sm font-semibold text-slate-200 mt-1">
                  {problemStatement.target_beneficiaries || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "kpis" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Key Performance Indicators</h3>
            {kpis.length === 0 ? (
              <p className="text-xs text-slate-500">No KPIs created for this Problem Statement yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {kpis.map((kpi) => (
                  <div key={kpi.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <h4 className="text-sm font-bold text-indigo-300">{kpi.name}</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 pt-1">
                      <div>Baseline: <span className="text-slate-200">{kpi.baseline || "N/A"}</span></div>
                      <div>Target: <span className="text-slate-200">{kpi.target || "N/A"}</span></div>
                      <div>Method: <span className="text-slate-200">{kpi.measurement_method || "N/A"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "applications" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Submitted Applications</h3>
            {applications.length === 0 ? (
              <p className="text-xs text-slate-500">No applications received yet.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {applications.map((app) => (
                  <div key={app.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200">Application #{app.id}</span>
                      <p className="text-xs text-slate-400">Startup ID: {app.startup_id}</p>
                    </div>
                    <a
                      href={`/officer/applications/${app.id}`}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded"
                    >
                      View Pipeline
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "invites" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Startup Invites & Conversion</h3>
            {invites.length === 0 ? (
              <p className="text-xs text-slate-500">No invites sent yet.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {invites.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200">Startup ID #{inv.startup_id}</span>
                      <p className="text-xs text-slate-500">
                        Invited at: {new Date(inv.invited_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                        inv.converted
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {inv.converted ? "Applied" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "qcbs" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">QCBS Score Ranking</h3>
            {!qcbsRanking || qcbsRanking.rankings.length === 0 ? (
              <p className="text-xs text-slate-500">QCBS ranking not yet calculated or commercial proposals locked.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Application ID</th>
                      <th className="p-3">Technical Score</th>
                      <th className="p-3">Commercial Score</th>
                      <th className="p-3">Final Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {qcbsRanking.rankings.map((rk) => (
                      <tr key={rk.application_id}>
                        <td className="p-3 font-bold text-indigo-400">#{rk.rank}</td>
                        <td className="p-3">App #{rk.application_id}</td>
                        <td className="p-3">{rk.technical_score.toFixed(2)}</td>
                        <td className="p-3">{rk.commercial_score.toFixed(2)}</td>
                        <td className="p-3 font-semibold text-emerald-400">{rk.final_score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
