'use client';
import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { Mail, ArrowRight } from 'lucide-react';

export default function StartupInvitesPage() {
  return (
    <AppLayout defaultRole={UserRole.STARTUP}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Direct Problem Statement Invites Feed"
          subtitle="Phase 4.3 — Direct Invites from Procurement Officers"
          role={UserRole.STARTUP}
          stickyNote={
            <StickyNote color="mint" title="Direct Invites">
              Targeted invites issued by Nodal Officers based on high semantic match with your DPIIT capability profile.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Received Procurement Invites"
          subtitle="Targeted Opportunity Docket"
          refNumber="INV-DOK-2024"
          role={UserRole.STARTUP}
          watermark="INVITE"
        >
          <div className="pt-2">
            <DocRow hover={false} className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status="verified" label="96% Semantic Match" />
                  <span className="font-mono text-[11px] text-[#A89F94]">PS #INV-2024</span>
                </div>
                <div className="font-bold text-base text-[#1A1A1A]">
                  Border Perimeter AI Sensor Grid
                </div>
                <div className="text-[11px] font-mono text-[#6B6560]">
                  Invited by Nodal Officer Vikram Malhotra
                </div>
              </div>

              <DocLinkButton
                href="/startup/applications/new?ps_id=2"
                variant="primary"
                role={UserRole.STARTUP}
                size="md"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Submit Invited Proposal
              </DocLinkButton>
            </DocRow>
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
