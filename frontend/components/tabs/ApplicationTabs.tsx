'use client';
import React from 'react';
import {
  FlaskGauge, TwoFacedScale, OrigamiRocket, StampAnimation, WinkingEnvelope
} from '@/components/shared/Metaphors';
import {
  StartupProfileMergedRead, EligibilityCheckRead, EvaluationScoreRead,
  QCBSScoreRead, RiskProfileRead, ContainmentPlanRead, DecisionReadinessRead,
  KPIVerdictRead, PilotOutcomeRead, AuditLogRead, UserRole
} from '@/lib/types/api';

export const StartupProfileTab: React.FC<{ profile: StartupProfileMergedRead; role: UserRole }> = ({ profile, role }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border">
      <div>
        <h3 className="text-lg font-black uppercase text-black">{profile.level1.company_name}</h3>
        <p className="text-xs text-gray-500 font-bold uppercase">DPIIT: {profile.level1.dpiit_number || 'N/A'}</p>
      </div>
      <StampAnimation label={profile.compliance_status} />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div className="p-4 bg-white rounded-xl border space-y-2">
        <span className="font-black uppercase text-gray-500 block">Primary Contact</span>
        <div className="font-bold">{profile.level1.primary_contact_name}</div>
        <div>{profile.level1.primary_contact_email}</div>
        <div>{profile.level1.primary_contact_phone}</div>
      </div>
      <div className="p-4 bg-white rounded-xl border space-y-2">
        <span className="font-black uppercase text-gray-500 block">Technical Capabilities</span>
        <div className="font-bold">{profile.level2?.technical_capabilities || 'Under review'}</div>
      </div>
    </div>

    {role !== 'evaluator' ? (
      <div className="p-4 bg-[#8FA888]/10 rounded-xl border border-[#8FA888] text-xs">
        <span className="font-black uppercase text-black block mb-1">Financial Risk Input (Funding Band)</span>
        <div className="font-bold text-gray-800">{profile.level2?.funding_band || 'Series A ($2.5M)'}</div>
        <p className="text-[10px] text-gray-500 mt-1">Used exclusively for risk profile assessment. Hidden from Evaluator score sheet.</p>
      </div>
    ) : (
      <div className="p-3 bg-gray-100 rounded-xl border border-gray-200 text-[11px] text-gray-500 italic">
        🔒 Financial funding band hidden during rubric evaluation per bias-prevention compliance rule.
      </div>
    )}
  </div>
);

export const EligibilityTab: React.FC<{ eligibility: EligibilityCheckRead; onResubmit?: () => void }> = ({ eligibility, onResubmit }) => (
  <div className="space-y-6">
    <div className="p-5 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between">
      <div>
        <span className="text-xs font-black uppercase text-gray-500 block">Overall Eligibility Verification</span>
        <div className="text-2xl font-black text-black uppercase mt-1 flex items-center gap-2">
          STATUS: <span className={eligibility.overall_result === 'pass' ? 'text-emerald-600' : 'text-amber-600'}>
            {eligibility.overall_result}
          </span>
        </div>
      </div>
      <StampAnimation label={eligibility.overall_result} />
    </div>

    {eligibility.overall_result === 'needs_clarification' && (
      <div className="space-y-3">
        <OrigamiRocket />
        <button
          onClick={onResubmit}
          className="w-full bg-[#8FA888] text-white font-black text-xs uppercase px-4 py-3 rounded-lg border-2 border-black hover:bg-[#6B8265] shadow-md"
        >
          Resubmit Revised Verification Documents
        </button>
      </div>
    )}

    <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
      <span className="text-xs font-black uppercase text-black block">Verification Checks Snapshot</span>
      <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold">
        <div className="p-3 bg-white rounded-lg border">
          <div className="text-gray-500 text-[10px] uppercase">DPIIT Active</div>
          <div className={eligibility.dpiit_verified ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>
            {eligibility.dpiit_verified ? '✓ VERIFIED' : '✕ FAILED'}
          </div>
        </div>
        <div className="p-3 bg-white rounded-lg border">
          <div className="text-gray-500 text-[10px] uppercase">Entity Validity</div>
          <div className={eligibility.entity_valid ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>
            {eligibility.entity_valid ? '✓ VALID' : '✕ INVALID'}
          </div>
        </div>
        <div className="p-3 bg-white rounded-lg border">
          <div className="text-gray-500 text-[10px] uppercase">PAN / GST Record</div>
          <div className={eligibility.pan_gst_present ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>
            {eligibility.pan_gst_present ? '✓ PRESENT' : '✕ MISSING'}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const QCBSTab: React.FC<{ qcbs: QCBSScoreRead }> = ({ qcbs }) => (
  <div className="space-y-6">
    <TwoFacedScale techScore={qcbs.technical_score} commScore={qcbs.commercial_score} finalScore={qcbs.final_score} />
    
    <div className="bg-[#8FA888]/15 border border-[#8FA888] p-4 rounded-xl text-xs font-semibold text-black">
      <span className="font-black uppercase block mb-1">QCBS Ranking Verdict: Rank #{qcbs.rank || 1}</span>
      Quality-and-Cost-Based Selection (70:30 ratio) confirms application meets technical threshold and commercial viability.
    </div>
  </div>
);

export const DecisionReadinessTab: React.FC<{
  readiness: DecisionReadinessRead;
  onSelectStartup: () => void;
}> = ({ readiness, onSelectStartup }) => {
  const checks = [
    { label: 'Level 1/2 Eligibility Verified', pass: readiness.eligibility_passed },
    { label: 'Mandatory Compliance Checklist Complete', pass: readiness.checklist_complete },
    { label: 'COI Declarations Resolved & Cleared', pass: readiness.coi_resolved },
    { label: 'Dual Evaluator Rubric Scores Submitted', pass: readiness.scores_complete },
    { label: 'Financial & Feasibility Risk Profile Assessed', pass: readiness.risk_profile_assessed },
    { label: 'Milestone Containment Plan Attached', pass: readiness.containment_plan_attached },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border space-y-4">
        <h3 className="text-sm font-black uppercase text-black tracking-wider">
          6-Point Decision Readiness Checklist
        </h3>

        <div className="space-y-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border text-xs font-bold">
              <span>{c.label}</span>
              <span className={c.pass ? 'text-emerald-600 font-black' : 'text-red-500 font-black'}>
                {c.pass ? '✓ READY' : '✕ PENDING'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        disabled={!readiness.overall_ready}
        onClick={onSelectStartup}
        className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all border-2 ${
          readiness.overall_ready
            ? 'bg-[#8FA888] text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-[#6B8265]'
            : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
        }`}
      >
        {readiness.overall_ready ? 'SELECT STARTUP FOR PILOT CONTRACT' : 'DECISION READINESS BLOCKED'}
      </button>
    </div>
  );
};

export const KPIVerdictsTab: React.FC<{ verdicts: KPIVerdictRead[] }> = ({ verdicts }) => (
  <div className="space-y-6">
    <h3 className="text-sm font-black uppercase text-black tracking-wider">Independent KPI Verdict Gauges</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {verdicts.map((v) => (
        <FlaskGauge
          key={v.id}
          actual={v.submitted_value}
          target={v.target_value}
          metricName={v.metric_name}
          unit={v.unit}
        />
      ))}
    </div>
  </div>
);

export const OutcomeTab: React.FC<{ outcome: PilotOutcomeRead }> = ({ outcome }) => (
  <div className="space-y-6 bg-white p-6 rounded-2xl border-2 border-black shadow-md">
    <div className="flex justify-between items-center">
      <div>
        <span className="text-xs font-black uppercase text-gray-500">Pilot Evaluation Outcome</span>
        <h2 className="text-2xl font-black text-black uppercase mt-1">DECISION: {outcome.decision}</h2>
      </div>
      <StampAnimation label={`DECISION: ${outcome.decision}`} />
    </div>

    <div className="p-4 bg-[#8FA888]/15 rounded-xl border border-[#8FA888] space-y-2 text-xs">
      <span className="font-black uppercase text-black block">Recommendation Notes</span>
      <p className="text-gray-800 font-semibold">{outcome.recommendation_notes}</p>
    </div>

    <div className="p-4 bg-gray-50 rounded-xl border space-y-2 text-xs">
      <span className="font-black uppercase text-gray-700 block">KPI Verdict Summary</span>
      <p className="font-mono text-gray-900">{outcome.verdict_summary}</p>
    </div>
  </div>
);

export const AuditTrailPanel: React.FC<{ logs: AuditLogRead[] }> = ({ logs }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-black uppercase text-black">Immutable Compliance Audit Trail</h3>
      <span className="text-xs font-bold text-gray-500 uppercase">{logs.length} AUDITED EVENTS</span>
    </div>

    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="p-3 bg-gray-50 rounded-lg border flex flex-col md:flex-row justify-between items-start md:items-center text-xs gap-2">
          <div>
            <span className="font-black text-black uppercase">{log.action}</span>
            <span className="text-gray-500 text-[10px] ml-2">[{log.timestamp.substring(0, 10)}]</span>
            <div className="text-gray-700 font-medium">{log.details}</div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-black text-[#8FA888] font-bold px-2 py-0.5 rounded text-[10px] uppercase">
              {log.actor_role}: {log.actor_name}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);
