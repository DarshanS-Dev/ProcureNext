'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DataCard, StatusBadge, StickyNote, DocLinkButton,
  DocButton, AlertStrip, DocRow
} from '@/components/shared/DesignSystem';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';

const OPEN_PS = [
  {
    id: 1,
    psRef: 'PS #26136',
    title: 'Autonomous Thermal Surveillance Drones for Border Patrol',
    category: 'Defense & Aerospace Systems',
    budget: '$450,000',
    deadline: '2024-10-15',
    baseline: 'Current manual patrol range: 12 km / shift',
    match: '94%',
  },
];

const INVITES = [
  {
    id: 2,
    psRef: 'PS #26137',
    title: 'Border Perimeter AI Sensor Grid',
    category: 'Cybersecurity & Critical Infrastructure',
    budget: '$300,000',
    match: '96%',
    fromOfficer: 'Nodal Officer Vikram Malhotra',
    note: 'Directly invited based on DPIIT capability profile match.',
  },
];

export default function StartupDiscoverPage() {
  const [inviteSimulated, setInviteSimulated] = useState(false);

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
          {/* Open Discovery */}
          {OPEN_PS.map((ps) => (
            <DataCard key={ps.id} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <StatusBadge status="published" label="Open Discovery" />
                <span className="font-mono text-[11px] text-[#A89F94]">{ps.psRef}</span>
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] leading-snug">{ps.title}</h2>
                <p className="text-xs text-[#6B6560] mt-1">
                  {ps.category} · Budget: {ps.budget} · Deadline: {ps.deadline}
                </p>
              </div>

              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}>
                <div className="text-[10px] font-bold uppercase text-[#A89F94] mb-0.5">Baseline Measurement</div>
                <div className="text-[#6B6560]">{ps.baseline}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold" style={{ color: '#1E9E5A' }}>
                  {ps.match} capability match
                </div>
                <DocLinkButton
                  href={`/startup/applications/new?ps_id=${ps.id}`}
                  role="startup"
                  size="sm"
                  icon={<ArrowRight className="w-3 h-3" />}
                >
                  Apply (Phase 5.1)
                </DocLinkButton>
              </div>
            </DataCard>
          ))}

          {/* Targeted Invites */}
          {INVITES.map((inv) => (
            <DataCard key={inv.id} className="space-y-4" style={{ border: '1.5px solid #F7E1B5' }}>
              <div className="flex items-start justify-between gap-2">
                <StatusBadge status="pending" label="Direct Invite" />
                <span className="font-mono text-[11px] text-[#A89F94]">{inv.psRef}</span>
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] leading-snug">{inv.title}</h2>
                <p className="text-xs text-[#6B6560] mt-1">
                  {inv.category} · Budget: {inv.budget}
                </p>
              </div>

              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#FDF3DC', border: '1px solid #F7E1B5' }}>
                <span style={{ color: '#B8860B' }}>⚡ {inv.note}</span>
                <div className="mt-1 font-bold" style={{ color: '#B8860B' }}>From: {inv.fromOfficer}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold" style={{ color: '#B8860B' }}>
                  {inv.match} semantic match
                </div>
                <DocLinkButton
                  href={`/startup/applications/new?ps_id=${inv.id}`}
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
        </div>
      </div>
    </AppLayout>
  );
}
