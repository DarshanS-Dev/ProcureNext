'use client';
import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow
} from '@/components/shared/DesignSystem';
import { FileText } from 'lucide-react';

const PS_LIST = [
  {
    id: 26136,
    title: 'Autonomous Thermal Surveillance Drones',
    category: 'Defense & Aerospace Systems',
    budget: '$450,000',
    deadline: '2024-10-15',
    status: 'published' as const,
    apps: 12,
  },
  {
    id: 26137,
    title: 'Border Perimeter AI Sensor Grid',
    category: 'Cybersecurity & Critical Infrastructure',
    budget: '$300,000',
    deadline: '2024-10-22',
    status: 'published' as const,
    apps: 8,
  },
];

export default function OfficerProblemStatementsPage() {
  return (
    <AppLayout defaultRole="officer">
      <div className="space-y-6">
        <PageHeader
          title="Problem Statements Registry"
          subtitle="Published procurement challenges for Cycle 2024 Q3."
          phase="Phase 3 · Officer"
          role="officer"
          breadcrumb={[{ label: 'Officer', href: '/officer/dashboard' }, { label: 'Problem Statements' }]}
          actions={
            <DocLinkButton href="/officer/problem-statements/new" role="officer" icon={<FileText className="w-3.5 h-3.5" />}>
              + New Problem Statement
            </DocLinkButton>
          }
          stickyNote={
            <StickyNote color="yellow" rotate={-1} title="Publishing Rule">
              Only outcome-based, baseline-gated PS can be published.
            </StickyNote>
          }
        />

        <DataCard noPad>
          <div className="px-5 py-4 border-b border-[#EDE7DB] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1A1A1A]">Published Registry</h2>
            <span className="text-[11px] text-[#A89F94] font-mono">{PS_LIST.length} entries</span>
          </div>

          {PS_LIST.map((ps) => (
            <DocRow
              key={ps.id}
              refNum={`PS #${ps.id}`}
              title={ps.title}
              subtitle={`${ps.category} · Budget Pool: ${ps.budget} · Deadline: ${ps.deadline}`}
              badge={
                <>
                  <StatusBadge status={ps.status} />
                  <span className="text-[11px] text-[#A89F94]">{ps.apps} applications</span>
                </>
              }
              actions={
                <DocLinkButton
                  href={`/officer/applications/1`}
                  variant="secondary"
                  role="officer"
                  size="sm"
                >
                  View Queue →
                </DocLinkButton>
              }
            />
          ))}
        </DataCard>
      </div>
    </AppLayout>
  );
}
