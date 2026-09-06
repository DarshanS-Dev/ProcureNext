'use client';
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { api } from '@/lib/api/client';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { Mail, ArrowRight, FileX2 } from 'lucide-react';

export default function StartupInvitesPage() {
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    api.getStartupInvites().then((res) => {
      if (Array.isArray(res)) setInvites(res);
    }).catch(() => {});
  }, []);

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
            {invites.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FileX2 className="w-8 h-8 text-[#A89F94] mx-auto" />
                <div className="font-bold text-sm text-[#1A1A1A]">No direct invites received yet</div>
                <div className="text-xs text-[#6B6560]">Officers send direct invites based on semantic capability match. Complete your Level 2 profile to boost visibility.</div>
              </div>
            ) : (
              invites.map((inv) => (
                <DocRow key={inv.id} hover={false} className="flex justify-between items-center py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="verified" label="Targeted Invite" />
                      <span className="font-mono text-[11px] text-[#A89F94]">PS #{inv.problem_statement_id}</span>
                    </div>
                    <div className="font-bold text-base text-[#1A1A1A]">
                      {inv.problem_statement_title || `Problem Statement #${inv.problem_statement_id}`}
                    </div>
                    <div className="text-[11px] font-mono text-[#6B6560]">
                      Invited by Nodal Officer ID #{inv.invited_by || 'Officer'}
                    </div>
                  </div>

                  <DocLinkButton
                    href={`/startup/applications/new?ps_id=${inv.problem_statement_id}`}
                    variant="primary"
                    role={UserRole.STARTUP}
                    size="md"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Submit Invited Proposal
                  </DocLinkButton>
                </DocRow>
              ))
            )}
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
