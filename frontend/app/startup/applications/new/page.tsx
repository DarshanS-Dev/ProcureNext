'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { useRouter } from 'next/navigation';
import {
  PageHeader, DocumentForm, FormField, DocInput, DocTextarea, DocButton, StickyNote, AlertStrip
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { Send, CheckCircle2 } from 'lucide-react';

export default function NewApplicationSubmissionPage() {
  const router = useRouter();
  const [proposalTitle, setProposalTitle] = useState('Autonomous Thermal Drone Navigation Unit v4');
  const [techSummary, setTechSummary] = useState('Proprietary AI vision module operating on zero-bandwidth offline edge computing hardware.');
  const [commercialBid, setCommercialBid] = useState('380000');
  const [timelineWeeks, setTimelineWeeks] = useState('14');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/startup/applications/1');
  };

  return (
    <AppLayout defaultRole={UserRole.STARTUP}>
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Submit Application Proposal"
          subtitle="Phase 5 — Technical & Commercial Bid Submission (Status: Applied → Under Review)"
          role={UserRole.STARTUP}
          stickyNote={
            <StickyNote color="mint" title="Proposal Sheet">
              Official defense proposal filing document. All commercial bids are encrypted until commercial gate opening.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Formal Application Docket"
          subtitle="Procurement Proposal Filing Form"
          refNumber="SUB-2024-001"
          role={UserRole.STARTUP}
          watermark="PROPOSAL"
        >
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <FormField label="Proposal Title" required hint="Must match capability statement subject">
              <DocInput
                type="text"
                required
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
              />
            </FormField>

            <FormField label="Technical Proposal Summary" required hint="Brief breakdown of core IP and operational fit">
              <DocTextarea
                rows={3}
                required
                value={techSummary}
                onChange={(e) => setTechSummary(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Commercial Bid Amount ($ USD)" required classified hint="Encrypted until Phase 8 QCBS evaluation">
                <DocInput
                  type="number"
                  required
                  value={commercialBid}
                  onChange={(e) => setCommercialBid(e.target.value)}
                />
              </FormField>

              <FormField label="Implementation Timeline (Weeks)" required hint="Standard pilot execution duration">
                <DocInput
                  type="number"
                  required
                  value={timelineWeeks}
                  onChange={(e) => setTimelineWeeks(e.target.value)}
                />
              </FormField>
            </div>

            <AlertStrip
              type="info"
              title="Auto-Checklist Generation"
              message="Submitting this application triggers status: applied → automatically transitioning to under_review while building dynamic document checklist."
            />

            <DocButton
              type="submit"
              variant="primary"
              role={UserRole.STARTUP}
              size="lg"
              className="w-full"
              icon={<Send className="w-4 h-4" />}
            >
              Submit Application Proposal (Phase 5.2)
            </DocButton>
          </form>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
