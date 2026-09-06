'use client';
import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { ArrowRight, FolderKanban } from 'lucide-react';

export default function StartupApplicationsIndexPage() {
  return (
    <AppLayout defaultRole={UserRole.STARTUP}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="My Applications Directory"
          subtitle="Phase 5 — Track Application Status & Stage Milestones"
          role={UserRole.STARTUP}
          stickyNote={
            <StickyNote color="mint" title="Real-time Status">
              Track lifecycle updates from compliance verification through QCBS scoring and contract awards.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Submitted Proposals Docket"
          subtitle="Application History Register"
          refNumber="APP-DIR-2024"
          role={UserRole.STARTUP}
          watermark="DIRECTORY"
        >
          <div className="pt-2">
            <DocRow hover={false} className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status="under_review" label="Applied & Under Review" />
                  <span className="font-mono text-[11px] text-[#A89F94]">PS #26136</span>
                </div>
                <div className="font-bold text-base text-[#1A1A1A]">
                  Application #1 — Autonomous Thermal Drone Navigation
                </div>
                <div className="text-[11px] font-mono text-[#6B6560]">
                  Submitted on 2024-09-01
                </div>
              </div>

              <DocLinkButton
                href="/startup/applications/1"
                variant="primary"
                role={UserRole.STARTUP}
                size="md"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Open Casefile #1
              </DocLinkButton>
            </DocRow>
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
