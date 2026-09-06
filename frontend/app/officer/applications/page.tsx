'use client';
import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { ArrowRight, FolderKanban } from 'lucide-react';

export default function OfficerApplicationsQueuePage() {
  return (
    <AppLayout defaultRole={UserRole.NODAL_OFFICER}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Applications Procedural Queue"
          subtitle="Phase 6 & 9 — Officer Application Reviews"
          role={UserRole.NODAL_OFFICER}
          stickyNote={
            <StickyNote color="yellow" title="Review Gate">
              Assess baseline hard-gates, review evaluator consensus scorecards, and make decision readiness calls.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Submitted Applications Docket"
          subtitle="Nodal Officer Review Register"
          refNumber="APP-QUE-2024"
          role={UserRole.NODAL_OFFICER}
          watermark="REVIEW"
        >
          <div className="pt-2">
            <DocRow hover={false} className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status="under_evaluation" label="Under Evaluation" />
                  <span className="font-mono text-[11px] text-[#A89F94]">PS #26136</span>
                </div>
                <div className="font-bold text-base text-[#1A1A1A]">
                  Application #1 — AeroTech Defense Labs
                </div>
                <div className="text-[11px] font-mono text-[#6B6560]">
                  Proposal: Autonomous Thermal Drone Navigation v4
                </div>
              </div>

              <DocLinkButton
                href="/officer/applications/1"
                variant="primary"
                role={UserRole.NODAL_OFFICER}
                size="md"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Review Casefile #1
              </DocLinkButton>
            </DocRow>
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
