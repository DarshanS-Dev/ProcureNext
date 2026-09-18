"use client";

import React, { useState } from "react";
import {
  ApplicationRead,
  EligibilityCheckRead,
  ChecklistItemRead,
  EvaluationScoreRead,
  QCBSScoreRead,
  RiskProfileRead,
  ContainmentPlanRead,
  DecisionReadinessRead,
  SandboxTrialRead,
  ContractRead,
  PilotMilestoneRead,
  KPIVerdictRead,
  PilotOutcomeRead,
} from "@/lib/api/types";
import { Role, ApplicationStatus } from "@/lib/api/enums";
import { StatusPill } from "@/components/shared/StatusPill";
import { DecisionReadinessChecklist } from "@/components/shared/DecisionReadinessChecklist";
import { useNotSelectedReason } from "@/lib/hooks/useNotSelectedReason";
import { AlertTriangle, CheckCircle, Shield, FileCheck, Layers, Award, Terminal, FileText, CheckSquare, Activity } from "lucide-react";

interface ApplicationShellProps {
  role: Role;
  application: ApplicationRead;
  eligibilityCheck?: EligibilityCheckRead | null;
  checklist?: ChecklistItemRead[];
  scores?: EvaluationScoreRead[];
  qcbsScore?: QCBSScoreRead | null;
  riskProfiles?: RiskProfileRead[];
  containmentPlan?: ContainmentPlanRead | null;
  decisionReadiness?: DecisionReadinessRead | null;
  sandboxTrial?: SandboxTrialRead | null;
  contract?: ContractRead | null;
  milestones?: PilotMilestoneRead[];
  kpiVerdicts?: KPIVerdictRead[];
  pilotOutcome?: PilotOutcomeRead | null;
  children?: React.ReactNode;
}

export function ApplicationShell({
  role,
  application,
  eligibilityCheck,
  checklist = [],
  scores = [],
  qcbsScore,
  riskProfiles = [],
  containmentPlan,
  decisionReadiness,
  sandboxTrial,
  contract,
  milestones = [],
  kpiVerdicts = [],
  pilotOutcome,
  children,
}: ApplicationShellProps) {
  const [activeTab, setActiveTab] = useState<string>("eligibility");
  const { reason: notSelectedReason } = useNotSelectedReason(application.status === "not_selected" ? application.id : 0);

  const isSelectedOrLater = ["selected", "contracted", "completed"].includes(application.status);
  const isContractedOrLater = ["contracted", "completed"].includes(application.status);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">Application #{application.id}</span>
              <StatusPill status={application.status} />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1">
              Problem Statement #{application.problem_statement_id}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Startup ID: #{application.startup_id} | Applied: {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Not Selected Reason Alert */}
        {application.status === "not_selected" && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Application Not Selected:</span> {notSelectedReason}
            </div>
          </div>
        )}

        {/* Tab List */}
        <div className="flex items-center space-x-1 border-b border-slate-800 mt-6 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab("eligibility")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "eligibility" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Eligibility
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "checklist" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Checklist ({checklist.length})
          </button>
          <button
            onClick={() => setActiveTab("scores")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "scores" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Scores
          </button>
          {(role === "officer" || role === "admin") && (
            <button
              onClick={() => setActiveTab("qcbs")}
              className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
                activeTab === "qcbs" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              QCBS Score
            </button>
          )}
          <button
            onClick={() => setActiveTab("risk")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "risk" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Risk Profile
          </button>
          <button
            onClick={() => setActiveTab("containment")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "containment" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Containment Plan
          </button>
          {role === "officer" && (
            <button
              onClick={() => setActiveTab("readiness")}
              className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
                activeTab === "readiness" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Decision Readiness
            </button>
          )}
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "sandbox" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Sandbox Trial
          </button>
          <button
            onClick={() => setActiveTab("contract")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "contract" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Contract
          </button>
          <button
            onClick={() => setActiveTab("milestones")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "milestones" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Milestones
          </button>
          <button
            onClick={() => setActiveTab("verdicts")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "verdicts" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            KPI Verdicts
          </button>
          <button
            onClick={() => setActiveTab("outcome")}
            className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "outcome" ? "border-indigo-500 text-indigo-400 font-bold" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Pilot Outcome
          </button>
        </div>
      </div>

      {/* Main Tab Workspace */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {activeTab === "eligibility" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Eligibility Status</h3>
            {eligibilityCheck ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Overall Result</span>
                  <p className="text-sm font-bold text-indigo-400 mt-1">{eligibilityCheck.overall_result || "Pending"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">DPIIT Verified</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">{eligibilityCheck.dpiit_verified || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Entity Valid</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">{eligibilityCheck.entity_valid || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">PAN / GST</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">{eligibilityCheck.pan_gst_present || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Certification Check</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">{eligibilityCheck.certification_check || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Sector Eligible</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">{eligibilityCheck.sector_eligible || "N/A"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Eligibility check has not been initiated yet.</p>
            )}
          </div>
        )}

        {activeTab === "checklist" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Required Document Checklist</h3>
            {checklist.length === 0 ? (
              <p className="text-xs text-slate-400">No checklist items specified for this application.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {checklist.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{item.document_name}</p>
                      {item.file_reference && (
                        <span className="text-slate-400 font-mono">File: {item.file_reference}</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-800 text-slate-300">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "scores" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Rubric Evaluation Scores</h3>
            {scores.length === 0 ? (
              <p className="text-xs text-slate-400">No evaluation scores logged yet.</p>
            ) : (
              <div className="space-y-3">
                {scores.map((sc) => (
                  <div key={sc.id} className="p-3 bg-slate-950 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-indigo-300">Criterion ID #{sc.criterion_id}</span>
                      <span className="font-bold text-slate-200">{sc.score} / 100</span>
                    </div>
                    <p className="text-slate-400">{sc.justification}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "qcbs" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">QCBS Score Breakdown</h3>
            {qcbsScore ? (
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl">
                  <span className="text-slate-400">Technical Score</span>
                  <p className="text-lg font-bold text-indigo-400 mt-1">{qcbsScore.technical_score.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl">
                  <span className="text-slate-400">Commercial Score</span>
                  <p className="text-lg font-bold text-purple-400 mt-1">{qcbsScore.commercial_score.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/20">
                  <span className="text-slate-400">Combined Final Score</span>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{qcbsScore.final_score.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">QCBS score is not unlocked or available yet.</p>
            )}
          </div>
        )}

        {activeTab === "risk" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Risk Assessment Profiles</h3>
            {riskProfiles.length === 0 ? (
              <p className="text-xs text-slate-400">No risk profiles computed yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {riskProfiles.map((rp) => (
                  <div key={rp.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-indigo-400 uppercase">{rp.stage} Stage</span>
                      <span className="font-bold text-emerald-400">Overall: {rp.overall_risk}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>Technical: {rp.technical_risk}</div>
                      <div>Financial: {rp.financial_risk}</div>
                      <div>Implementation: {rp.implementation_risk}</div>
                      <div>Cybersecurity: {rp.cybersecurity_risk}</div>
                      <div>Data Risk: {rp.data_risk}</div>
                      <div>Scalability: {rp.scalability_risk}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "containment" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Risk Containment Plan</h3>
            {containmentPlan ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Max Scope</span>
                  <p className="text-slate-200 mt-1">{containmentPlan.max_scope || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Max Financial Exposure</span>
                  <p className="text-slate-200 mt-1">{containmentPlan.max_financial_exposure || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Fallback Process</span>
                  <p className="text-slate-200 mt-1">{containmentPlan.fallback_process || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <span className="text-slate-400">Data Terms</span>
                  <p className="text-slate-200 mt-1">{containmentPlan.data_terms || "N/A"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Containment plan has not been submitted yet.</p>
            )}
          </div>
        )}

        {activeTab === "readiness" && (
          <DecisionReadinessChecklist readiness={decisionReadiness || null} />
        )}

        {activeTab === "sandbox" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Sandbox Trial Results</h3>
            {!isSelectedOrLater ? (
              <p className="text-xs text-slate-400">Sandbox trial is enabled after application selection.</p>
            ) : sandboxTrial ? (
              <div className="p-4 bg-slate-950 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Verdict: {sandboxTrial.verdict || "Under Evaluation"}</span>
                  <span className="text-slate-400 font-mono">Mode: {sandboxTrial.verification_mode}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>Functional Check: {sandboxTrial.functional_check}</div>
                  <div>Directional KPI Check: {sandboxTrial.directional_kpi_check}</div>
                  <div>Operational Fit: {sandboxTrial.operational_fit_check}</div>
                  <div>No Red Flags: {sandboxTrial.no_red_flags_check}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Sandbox trial pending initiation by Independent Evaluator.</p>
            )}
          </div>
        )}

        {activeTab === "contract" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Pilot Contract</h3>
            {contract ? (
              <div className="p-4 bg-slate-950 rounded-xl text-xs space-y-2">
                <p className="font-bold text-indigo-300">Contract #{contract.id}</p>
                <p className="text-slate-400">Initiated at: {new Date(contract.created_at).toLocaleDateString()}</p>
                {contract.signed_at && <p className="text-emerald-400 font-semibold">Signed at: {new Date(contract.signed_at).toLocaleDateString()}</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Contract not yet created.</p>
            )}
          </div>
        )}

        {activeTab === "milestones" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Pilot Milestones ({milestones.length})</h3>
            {milestones.length === 0 ? (
              <p className="text-xs text-slate-400">No milestones loaded.</p>
            ) : (
              <div className="space-y-3">
                {milestones.map((ms) => (
                  <div key={ms.id} className="p-3 bg-slate-950 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-200">{ms.display_name || ms.milestone_type}</p>
                      <span className="text-slate-400">Target: {ms.target_value || "N/A"} {ms.target_unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {ms.status}
                      </span>
                      <p className="text-slate-400 text-[10px] mt-1">Payment: {ms.payment_status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "verdicts" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">KPI Verdicts</h3>
            {kpiVerdicts.length === 0 ? (
              <p className="text-xs text-slate-400">No KPI verdicts recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {kpiVerdicts.map((kv) => (
                  <div key={kv.id} className="p-3 bg-slate-950 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-200">KPI ID #{kv.kpi_id}</span>
                      <p className="text-slate-400">{kv.justification}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded font-bold text-xs ${kv.verdict === 'met' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {kv.verdict.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "outcome" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Final Pilot Outcome</h3>
            {pilotOutcome ? (
              <div className="p-4 bg-slate-950 rounded-xl space-y-2 text-xs">
                <span className="px-3 py-1 rounded-full font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {pilotOutcome.overall_result}
                </span>
                <p className="text-slate-300 mt-2">{pilotOutcome.rationale || "No rationale provided."}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Pilot outcome decision has not been logged yet.</p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
