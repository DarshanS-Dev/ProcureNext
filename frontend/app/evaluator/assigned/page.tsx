'use client';
import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { ShieldAlert, ArrowRight, FileText } from 'lucide-react';

export default function EvaluatorAssignedPage() {
  return (
    <AppLayout defaultRole={UserRole.EVALUATOR}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Assigned Applications for Technical Scoring"
          subtitle="Phase 7.1 — Evaluator Scoring Queue"
          role={UserRole.EVALUATOR}
          stickyNote={
            <StickyNote color="blue" title="COI Mandatory">
              Conflict of Interest declaration is legally required before reviewing full startup IP payload.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Evaluation Assignment Register"
          subtitle="Technical Evaluation Committee Dashboard"
          refNumber="EVL-2024-001"
          role={UserRole.EVALUATOR}
          watermark="QUEUE"
        >
          <div className="pt-2">
            <DocRow hover={false} className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status="pending" label="Assigned Panel Member" />
                  <span className="font-mono text-[11px] text-[#A89F94]">PS #26136</span>
                </div>
                <div className="font-bold text-base text-[#1A1A1A]">
                  Application #1 — AeroTech Thermal Navigation
                </div>
                <div className="text-[11px] font-mono text-[#6B6560]">
                  COI Status: <span className="font-bold text-[#C81E4A] uppercase">Pending Declaration</span>
                </div>
              </div>

              <DocLinkButton
                href="/evaluator/applications/1/score"
                variant="primary"
                role={UserRole.EVALUATOR}
                size="md"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Declare COI & Score
              </DocLinkButton>
            </DocRow>
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
