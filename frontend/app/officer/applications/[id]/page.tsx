'use client';
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { PipelineStepper } from '@/components/shared/PipelineStepper';
import { TwoFacedScale } from '@/components/shared/Metaphors';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocButton, AlertStrip, SectionDivider, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole, EvaluationScoreRead, ScoreCompletenessRead, QCBSScoreRead } from '@/lib/types/api';
import { api } from '@/lib/api/client';
import { CheckCircle2, ShieldAlert, Sparkles, ArrowRight, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

type TabId = 'eligibility' | 'scores' | 'qcbs' | 'decision-readiness';

export default function OfficerApplicationReviewPage() {
  const [activeTab, setActiveTab] = useState<TabId>('eligibility');
  const [appStatus, setAppStatus] = useState<'under_review' | 'under_evaluation' | 'selected'>('under_review');
  const [eligibilityPassed, setEligibilityPassed] = useState(false);
  const [containmentAttached, setContainmentAttached] = useState(false);

  // Scores tab data
  const [scores, setScores] = useState<EvaluationScoreRead[]>([]);
  const [completeness, setCompleteness] = useState<ScoreCompletenessRead | null>(null);
  const [qcbs, setQcbs] = useState<QCBSScoreRead | null>(null);
  const [loadingScores, setLoadingScores] = useState(false);

  useEffect(() => {
    if (activeTab === 'scores' || activeTab === 'qcbs') {
      setLoadingScores(true);
      Promise.all([
        api.getScores(1),
        api.getScoreCompleteness(1),
        api.getQCBSScore(1),
      ]).then(([s, c, q]) => {
        setScores(s);
        setCompleteness(c);
        setQcbs(q);
        setLoadingScores(false);
      });
    }
  }, [activeTab]);

  const handleResolveEligibility = () => {
    setEligibilityPassed(true);
    setAppStatus('under_evaluation');
  };

  const handleAttachContainment = () => {
    setContainmentAttached(true);
  };

  const handleSelectStartup = () => {
    setAppStatus('selected');
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'eligibility', label: 'Phase 6: Eligibility' },
    { id: 'scores', label: 'Phase 7: Evaluator Scores' },
    { id: 'qcbs', label: 'Phase 8: QCBS Gate' },
    { id: 'decision-readiness', label: 'Phase 9: Decision Readiness' },
  ];

  return (
    <AppLayout defaultRole={UserRole.NODAL_OFFICER}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Officer Application Casefile #1"
          subtitle="Phase 6–9 — Eligibility, Scores, QCBS & Decision Readiness Gate"
          role={UserRole.NODAL_OFFICER}
          stickyNote={
            <StickyNote color="yellow" title="Officer Oversight">
              Enforces technical hard-gates and financial 70:30 QCBS scoring ratio before final selection.
            </StickyNote>
          }
          action={
            <StatusBadge
              status={appStatus === 'selected' ? 'verified' : appStatus === 'under_evaluation' ? 'under_evaluation' : 'pending'}
              label={`STATUS: ${appStatus.toUpperCase()}`}
            />
          }
        />

        {/* Pipeline Stepper */}
        <PipelineStepper currentStatus={appStatus} />

        {/* Tab navigation */}
        <div className="flex gap-1.5 border-b border-[#E8E2D5] pb-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-[#B8860B] border border-b-white border-[#E8E2D5] -mb-px'
                  : 'bg-[#F8F6F1] text-[#6B6560] hover:bg-[#FDF3DC] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Eligibility ─────────────────────────── */}
        {activeTab === 'eligibility' && (
          <DocumentForm
            title="Officer Sector & Certification Eligibility Check"
            subtitle="Hard-gate Verification Sheet"
            refNumber="ELG-CHK-01"
            role={UserRole.NODAL_OFFICER}
            watermark="ELIGIBILITY"
          >
            <div className="space-y-6 pt-2">
              <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] space-y-2">
                <div className="text-[10px] font-bold text-[#6B6560] uppercase tracking-wider">Auto-Verified System Snapshots (Phase 6.1):</div>
                <div className="grid grid-cols-3 gap-2 text-center text-[#1E9E5A] font-bold text-xs">
                  <div className="p-2.5 bg-white rounded border border-[#E8E2D5]">✓ DPIIT Active</div>
                  <div className="p-2.5 bg-white rounded border border-[#E8E2D5]">✓ Entity Valid</div>
                  <div className="p-2.5 bg-white rounded border border-[#E8E2D5]">✓ PAN & GST Present</div>
                </div>
              </div>

              <div className="p-4 bg-[#FDF3DC] rounded-lg border border-[#F7E1B5] space-y-3">
                <div className="text-xs font-bold text-[#B8860B] uppercase tracking-wider">Manual Sector & Certification Check (Phase 6.2):</div>
                <div className="flex gap-6 text-xs text-[#1A1A1A] font-medium">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#B8860B] rounded cursor-pointer" />
                    <span>Sector Eligible (Defense & Aerospace)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#B8860B] rounded cursor-pointer" />
                    <span>ISO / Military Specs Certification Present</span>
                  </label>
                </div>
              </div>

              <DocButton
                variant="primary"
                role={UserRole.NODAL_OFFICER}
                size="lg"
                className="w-full"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleResolveEligibility}
              >
                Resolve Eligibility Gate → Trigger Phase 6.3 Transition
              </DocButton>

              {eligibilityPassed && (
                <AlertStrip
                  type="success"
                  title="Phase 6.3 Rule Passed!"
                  message="Eligibility criteria met. Application.status automatically flipped to under_evaluation."
                />
              )}
            </div>
          </DocumentForm>
        )}

        {/* ── Tab: Scores ─────────────────────────────── */}
        {activeTab === 'scores' && (
          <DocumentForm
            title="Phase 7 Evaluator Scores — Score Completeness View"
            subtitle="GET /applications/{id}/scores + /scores/completeness"
            refNumber="SCR-701"
            role={UserRole.NODAL_OFFICER}
            watermark="SCORES"
          >
            <div className="space-y-5 pt-2">
              {/* Completeness Banner */}
              {completeness && (
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-xs font-bold ${
                    completeness.complete
                      ? 'bg-[#EAF7ED] border-[#B8E6C4] text-[#1E9E5A]'
                      : 'bg-[#FDF3DC] border-[#F7E1B5] text-[#B8860B]'
                  }`}
                >
                  {completeness.complete
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <div className="flex-1">
                    <span className="uppercase tracking-wide">
                      {completeness.complete ? 'All Scores Submitted' : 'Pending Evaluator Submissions'}
                    </span>
                    <span className="ml-3 font-normal opacity-80">
                      {completeness.total_submitted} / {completeness.total_assigned} evaluators submitted
                    </span>
                  </div>
                  {!completeness.complete && completeness.pending_evaluator_names?.length && (
                    <span className="text-[10px] font-normal">
                      Pending: {completeness.pending_evaluator_names.join(', ')}
                    </span>
                  )}
                </div>
              )}

              {loadingScores ? (
                <div className="py-8 text-center text-sm text-[#A89F94]">Loading scores…</div>
              ) : scores.length === 0 ? (
                <div className="py-8 text-center">
                  <BarChart3 className="w-8 h-8 text-[#C4B9AE] mx-auto mb-2" />
                  <p className="text-sm text-[#A89F94] font-medium">No scores submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scores.map((s, i) => {
                    const pct = Math.round((s.total_score / 100) * 100);
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="p-4 rounded-lg border border-[#E8E2D5] bg-[#F8F6F1] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-[#A89F94]" />
                            <span className="text-xs font-bold text-[#1A1A1A]">{s.evaluator_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#A89F94] font-mono">{new Date(s.submitted_at).toLocaleDateString()}</span>
                            <span className="text-sm font-black text-[#2563EB]">{s.total_score} <span className="text-[#A89F94] font-normal text-xs">/ 100</span></span>
                          </div>
                        </div>
                        {/* Score breakdown mini-bar */}
                        <div className="space-y-1.5">
                          {s.scores.slice(0, 4).map((entry, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <span className="text-[10px] text-[#A89F94] w-5 shrink-0 font-mono">C{entry.criterion_id}</span>
                              <div className="flex-1 h-1.5 bg-[#E8E2D5] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(entry.score / 20) * 100}%`, backgroundColor: '#2563EB' }}
                                />
                              </div>
                              <span className="text-[10px] text-[#6B6560] font-mono w-6 text-right">{entry.score}</span>
                            </div>
                          ))}
                          {s.scores.length > 4 && (
                            <p className="text-[10px] text-[#A89F94]">+ {s.scores.length - 4} more criteria</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </DocumentForm>
        )}

        {/* ── Tab: QCBS ────────────────────────────────── */}
        {activeTab === 'qcbs' && (
          <DocumentForm
            title="Phase 8 Commercial Gate & 70:30 QCBS Computation"
            subtitle="Automated Scorecard Calculation"
            refNumber="QCBS-801"
            role={UserRole.NODAL_OFFICER}
            watermark="QCBS"
          >
            <div className="space-y-6 pt-2">
              {loadingScores ? (
                <div className="py-8 text-center text-sm text-[#A89F94]">Computing QCBS…</div>
              ) : qcbs ? (
                <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5]">
                  <TwoFacedScale techScore={qcbs.technical_score} commScore={qcbs.commercial_score} finalScore={qcbs.final_score} />
                </div>
              ) : (
                <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5]">
                  <TwoFacedScale techScore={88} commScore={92} finalScore={89.2} />
                </div>
              )}

              <SectionDivider label="Containment Note Requirement" />

              <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] space-y-3">
                <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">L1 High-Risk Commercial Gate Notice</div>
                <p className="text-xs text-[#6B6560] leading-relaxed">
                  Notice: Proposal #1 bid is 28% below median cost benchmark. Mandatory L1 Risk Containment Note required prior to decision readiness sign-off.
                </p>
                <DocButton
                  variant="secondary"
                  role={UserRole.NODAL_OFFICER}
                  size="sm"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleAttachContainment}
                >
                  {containmentAttached ? '✓ Containment Note Attached' : 'Attach L1 Risk Containment Note'}
                </DocButton>
              </div>
            </div>
          </DocumentForm>
        )}

        {/* ── Tab: Decision Readiness ────────────────── */}
        {activeTab === 'decision-readiness' && (
          <DocumentForm
            title="Phase 9: 6-Point Decision Readiness Gate"
            subtitle="Final Panel Selection Audit"
            refNumber="DRG-901"
            role={UserRole.NODAL_OFFICER}
            watermark="DECISION"
          >
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#EAF7ED] text-[#1E9E5A] rounded-lg border border-[#1E9E5A] font-bold">1. Technical Consensus Score ≥ 70%</div>
                <div className="p-3 bg-[#EAF7ED] text-[#1E9E5A] rounded-lg border border-[#1E9E5A] font-bold">2. Compliance Single-Pass Clear</div>
                <div className="p-3 bg-[#EAF7ED] text-[#1E9E5A] rounded-lg border border-[#1E9E5A] font-bold">3. No Unresolved COI</div>
                <div className="p-3 bg-[#EAF7ED] text-[#1E9E5A] rounded-lg border border-[#1E9E5A] font-bold">4. Baseline Hard-Gate Cleared</div>
                <div className="p-3 bg-[#EAF7ED] text-[#1E9E5A] rounded-lg border border-[#1E9E5A] font-bold">5. QCBS Computed (70:30)</div>
                <div className={containmentAttached ? "p-3 bg-[#EAF7ED] text-[#1E9E5A] rounded-lg border border-[#1E9E5A] font-bold" : "p-3 bg-[#FDF3DC] text-[#B8860B] rounded-lg border border-[#B8860B] font-bold"}>
                  6. L1 Risk Containment Attached: {containmentAttached ? 'YES' : 'PENDING'}
                </div>
              </div>

              <DocButton
                variant="primary"
                role={UserRole.NODAL_OFFICER}
                size="lg"
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={handleSelectStartup}
              >
                Select Startup for Contract Award (Phase 9.6)
              </DocButton>

              {appStatus === 'selected' && (
                <AlertStrip
                  type="success"
                  title="Startup Selected!"
                  message="Application.status → selected. Contract generation unblocked."
                />
              )}
            </div>
          </DocumentForm>
        )}
      </div>
    </AppLayout>
  );
}
