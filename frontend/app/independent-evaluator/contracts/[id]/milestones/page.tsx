'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { CheckCircle2, ShieldCheck, FileCheck } from 'lucide-react';

export default function IndependentMilestonesPage() {
  const [milestones, setMilestones] = useState([
    { id: 1, title: 'M1: Hardware Bench Assembly & Telemetry Test', status: 'submitted', review: 'accepted', payment: 'released' },
    { id: 2, title: 'M2: Edge Vision AI Model Calibration', status: 'submitted', review: 'accepted', payment: 'released' },
    { id: 3, title: 'M3: Night Patrol Thermal Flight Trials', status: 'submitted', review: 'pending', payment: 'held' },
    { id: 4, title: 'M4: Integrated Security Protocol Signoff', status: 'pending', review: 'pending', payment: 'held' },
    { id: 5, title: 'M5: Final Pilot Outcome Audit & Handoff', status: 'pending', review: 'pending', payment: 'held' },
  ]);

  const handleAcceptMilestone = (id: number) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, review: 'accepted', payment: 'released' } : m));
  };

  return (
    <AppLayout defaultRole={UserRole.INDEPENDENT_EVALUATOR}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Contract Milestones Verification"
          subtitle="Phase 11 — Independent Evaluator Milestone Review (M1–M5)"
          role={UserRole.INDEPENDENT_EVALUATOR}
          stickyNote={
            <StickyNote color="pink" title="Audit Duty">
              Review submitted pilot milestone telemetry & field logs. Releasing payment triggers mandatory escrow settlement.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Contract #1 — 5 Mandatory Pilot Milestones"
          subtitle="Independent Evaluator Sign-off Register"
          refNumber="CNT-2024-001"
          role={UserRole.INDEPENDENT_EVALUATOR}
          watermark="VERIFIED"
        >
          <div className="space-y-3 pt-2">
            {milestones.map((m) => (
              <DocRow key={m.id} hover={false} className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#D2691E]" />
                    {m.title}
                  </div>
                  <div className="text-[11px] font-mono text-[#6B6560] flex items-center gap-3">
                    <span>Status: <strong className="text-[#1A1A1A] uppercase">{m.status}</strong></span>
                    <span>•</span>
                    <span>Escrow Payment: <strong className={m.payment === 'released' ? 'text-[#1E9E5A]' : 'text-[#D2691E]'}>{m.payment.toUpperCase()}</strong></span>
                  </div>
                </div>

                <div className="shrink-0">
                  {m.review === 'accepted' ? (
                    <StatusBadge status="verified" label="Accepted & Released" />
                  ) : (
                    <DocButton
                      variant="primary"
                      role={UserRole.INDEPENDENT_EVALUATOR}
                      size="sm"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => handleAcceptMilestone(m.id)}
                    >
                      Accept Evidence (Phase 11.4)
                    </DocButton>
                  )}
                </div>
              </DocRow>
            ))}
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
