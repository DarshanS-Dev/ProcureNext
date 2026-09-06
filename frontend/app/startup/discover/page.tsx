'use client';
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { api } from '@/lib/api/client';
import {
  PageHeader, DataCard, StatusBadge, StickyNote, DocLinkButton,
  DocButton, AlertStrip, DocRow
} from '@/components/shared/DesignSystem';
import { ArrowRight, CheckCircle2, Send, FileX2 } from 'lucide-react';

export default function StartupDiscoverPage() {
  const [openPs, setOpenPs] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    api.getMatchedProblemStatements().then((res) => {
      if (Array.isArray(res)) setOpenPs(res);
    }).catch(() => {});

    api.getStartupInvites().then((res) => {
      if (Array.isArray(res)) setInvites(res);
    }).catch(() => {});
  }, []);

  return (
    <AppLayout defaultRole="startup">
      <div className="space-y-6">
        <PageHeader
          title="Open Discovery & Invites Feed"
          subtitle="Browse published Problem Statements and respond to targeted invitations."
          phase="Phase 4 · Startup"
          role="startup"
          breadcrumb={[{ label: 'Startup', href: '/startup/dashboard' }, { label: 'Discover PS' }]}
          actions={
            <DocButton
              variant="secondary"
              role="startup"
              onClick={() => setInviteSimulated(!inviteSimulated)}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              {inviteSimulated ? '✓ Invite Received' : 'Simulate Officer Invite (Phase 4.2)'}
            </DocButton>
          }
          stickyNote={
            <StickyNote color="blue" rotate={1} title="Matching Tip">
              Complete Level 2 profile for better semantic match scoring.
            </StickyNote>
          }
        />

        {inviteSimulated && (
          <AlertStrip type="success">
            Event logged: <strong>startup_invited</strong> — Nodal Officer Vikram Malhotra sent a direct invite for PS #26137!
          </AlertStrip>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {openPs.length === 0 && invites.length === 0 ? (
            <div className="col-span-2 p-12 bg-white border border-[#EDE7DB] rounded-2xl text-center space-y-2">
              <FileX2 className="w-8 h-8 text-[#A89F94] mx-auto" />
              <div className="font-bold text-sm text-[#1A1A1A]">No published problem statements yet</div>
              <div className="text-xs text-[#6B6560]">Procurement officers publish challenges here. Complete your Level 2 profile to receive recommendations and direct invites.</div>
            </div>
          ) : (
            <>
              {/* Open Discovery */}
              {openPs.map((ps) => (
                <DataCard key={ps.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge status="published" label={ps.recommended ? "Recommended Match" : "Open Discovery"} />
                    <span className="font-mono text-[11px] text-[#A89F94]">PS #{ps.id}</span>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#1A1A1A] leading-snug">{ps.title}</h2>
                    <p className="text-xs text-[#6B6560] mt-1">
                      {ps.category || 'Defense & Technical Ops'} · Target: {ps.target_value || 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}>
                    <div className="text-[10px] font-bold uppercase text-[#A89F94] mb-0.5">Baseline Measurement</div>
                    <div className="text-[#6B6560]">{ps.baseline_value || 'Initial baseline check required'}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold" style={{ color: '#1E9E5A' }}>
                      {ps.recommended ? 'High Semantic Match' : 'Open Challenge'}
                    </div>
                    <DocLinkButton
                      href={`/startup/applications/new?ps_id=${ps.id}`}
                      role="startup"
                      size="sm"
                      icon={<ArrowRight className="w-3 h-3" />}
                    >
                      Apply Now
                    </DocLinkButton>
                  </div>
                </DataCard>
              ))}

              {/* Targeted Invites */}
              {invites.map((inv) => (
                <DataCard key={inv.id} className="space-y-4" style={{ border: '1.5px solid #F7E1B5' }}>
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge status="pending" label="Direct Invite" />
                    <span className="font-mono text-[11px] text-[#A89F94]">PS #{inv.problem_statement_id}</span>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#1A1A1A] leading-snug">{inv.problem_statement_title || `Problem Statement #${inv.problem_statement_id}`}</h2>
                  </div>

                  <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#FDF3DC', border: '1px solid #F7E1B5' }}>
                    <span style={{ color: '#B8860B' }}>⚡ Directly invited based on DPIIT capability profile match.</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold" style={{ color: '#B8860B' }}>
                      Targeted Invite
                    </div>
                    <DocLinkButton
                      href={`/startup/applications/new?ps_id=${inv.problem_statement_id}`}
                      variant="secondary"
                      role="officer"
                      size="sm"
                      icon={<ArrowRight className="w-3 h-3" />}
                    >
                      Accept & Submit
                    </DocLinkButton>
                  </div>
                </DataCard>
              ))}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
