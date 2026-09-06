'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { PipelineStepper } from '@/components/shared/PipelineStepper';
import { TwoFacedScale } from '@/components/shared/Metaphors';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocButton, AlertStrip, SectionDivider
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { CheckCircle2, ShieldAlert, Sparkles, Lock, ArrowRight } from 'lucide-react';

export default function OfficerApplicationReviewPage() {
  const [activeTab, setActiveTab] = useState<'eligibility' | 'qcbs' | 'decision-readiness'>('eligibility');
  const [appStatus, setAppStatus] = useState<'under_review' | 'under_evaluation' | 'selected'>('under_review');
  const [eligibilityPassed, setEligibilityPassed] = useState(false);
  const [containmentAttached, setContainmentAttached] = useState(false);

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

  return (
    <AppLayout defaultRole={UserRole.NODAL_OFFICER}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Officer Application Casefile #1"
          subtitle="Phase 6, 8 & 9 — Eligibility Resolution, QCBS & Decision Readiness Gate"
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
        <div className="flex gap-2 border-b border-[#E8E2D5] pb-2">
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
              activeTab === 'eligibility'
                ? 'bg-[#B8860B] text-white'
                : 'bg-[#F8F6F1] text-[#6B6560] hover:bg-[#FDF3DC]'
            }`}
          >
            Phase 6: Eligibility Resolution
          </button>
          <button
            onClick={() => setActiveTab('qcbs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
              activeTab === 'qcbs'
                ? 'bg-[#B8860B] text-white'
                : 'bg-[#F8F6F1] text-[#6B6560] hover:bg-[#FDF3DC]'
            }`}
          >
            Phase 8: Commercial Gate & QCBS
          </button>
          <button
            onClick={() => setActiveTab('decision-readiness')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
              activeTab === 'decision-readiness'
                ? 'bg-[#B8860B] text-white'
                : 'bg-[#F8F6F1] text-[#6B6560] hover:bg-[#FDF3DC]'
            }`}
          >
            Phase 9: 6-Point Decision Readiness
          </button>
        </div>

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

              <div className="p-4 bg-[#FDF3DC] rounded-lg border border-[#E8C468] space-y-3">
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

        {activeTab === 'qcbs' && (
          <DocumentForm
            title="Phase 8 Commercial Gate & 70:30 QCBS Computation"
            subtitle="Automated Scorecard Calculation"
            refNumber="QCBS-801"
            role={UserRole.NODAL_OFFICER}
            watermark="QCBS"
          >
            <div className="space-y-6 pt-2">
              <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5]">
                <TwoFacedScale techScore={88} commScore={92} finalScore={89.2} />
              </div>

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
