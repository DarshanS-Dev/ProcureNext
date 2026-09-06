'use client';
import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow, SectionDivider
} from '@/components/shared/DesignSystem';
import { Sparkles, Clock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const auditLogs = [
  { id: 1, action: 'COMPLIANCE_RECORD_GENERATED', timestamp: '2024-09-06 09:12:00', actor: 'admin', actorName: 'Platform Admin', details: 'Generated immutable compliance snapshot #CR-9081' },
  { id: 2, action: 'PILOT_OUTCOME_RECORDED',      timestamp: '2024-09-06 08:50:00', actor: 'officer', actorName: 'Vikram Malhotra', details: 'Decision: SCALE based on 100% KPI verdict pass' },
  { id: 3, action: 'KPI_VERDICTS_SUBMITTED',       timestamp: '2024-09-06 08:42:00', actor: 'independent-evaluator', actorName: 'K. Verma', details: 'Flight patrol range: 48km (Target: 30km)' },
  { id: 4, action: 'SANDBOX_VERDICT_PROMISING',    timestamp: '2024-09-06 08:15:00', actor: 'independent-evaluator', actorName: 'K. Verma', details: 'Passed 4/4 verification checks' },
  { id: 5, action: 'STARTUP_SELECTED_FOR_PILOT',   timestamp: '2024-09-06 07:30:00', actor: 'officer', actorName: 'Vikram Malhotra', details: 'Passed 6-point Decision Readiness gate' },
  { id: 6, action: 'RUBRIC_SCORE_RECORDED',        timestamp: '2024-09-06 07:10:00', actor: 'evaluator', actorName: 'Dr. Ananya Roy', details: 'Technical score: 84/100 after COI clearance' },
  { id: 7, action: 'STARTUP_COMPLIANCE_VERIFIED',  timestamp: '2024-09-06 06:45:00', actor: 'admin', actorName: 'Platform Admin', details: 'Single-pass verification completed for AeroTech Labs' },
  { id: 8, action: 'STARTUP_REGISTERED',           timestamp: '2024-09-06 06:30:00', actor: 'startup', actorName: 'Aarav Sharma', details: 'Self-registered startup account' },
];

const ACTOR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin:                  { bg: '#FBEAEC', text: '#C81E4A', border: '#F3BECA' },
  officer:                { bg: '#FDF3DC', text: '#B8860B', border: '#F7E1B5' },
  evaluator:              { bg: '#E9F1FB', text: '#2563EB', border: '#BFD7F8' },
  'independent-evaluator':{ bg: '#FBEFE6', text: '#D2691E', border: '#F0CDB5' },
  startup:                { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
};

export default function AdminAuditLogPage() {
  return (
    <AppLayout defaultRole="admin">
      <div className="space-y-6">
        <PageHeader
          title="Global Audit Log Trail"
          subtitle="Immutable chronological event stream for all platform state transitions."
          phase="Phase 14 · Governance"
          role="admin"
          breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Audit Log' }]}
          actions={
            <StatusBadge status="info" label="Append-Only Log" dot={false} />
          }
          stickyNote={
            <StickyNote color="pink" rotate={1} title="Immutable">
              Every event is cryptographically sealed. No edits or deletions permitted.
            </StickyNote>
          }
        />

        <DataCard noPad>
          <div className="px-5 py-4 border-b border-[#EDE7DB] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#A89F94]" />
            <h2 className="text-sm font-bold text-[#1A1A1A]">System State Transitions</h2>
            <span className="ml-auto text-[11px] text-[#A89F94] font-mono">{auditLogs.length} events</span>
          </div>

          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-9 top-0 bottom-0 w-px bg-[#EDE7DB]" />

            {auditLogs.map((log, i) => {
              const actorStyle = ACTOR_COLORS[log.actor] ?? ACTOR_COLORS.admin;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="flex gap-4 px-5 py-4 hover:bg-[#FDFBF7] transition-colors border-b border-[#EDE7DB] last:border-b-0"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: actorStyle.bg, border: `1.5px solid ${actorStyle.border}` }}>
                    <span className="text-sm">
                      {{ admin: '🔐', officer: '🏛️', evaluator: '⚖️', 'independent-evaluator': '🧪', startup: '🚀' }[log.actor] ?? '📋'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-mono text-[11px] font-bold text-[#1A1A1A]">{log.action}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: actorStyle.bg, color: actorStyle.text, border: `1px solid ${actorStyle.border}` }}
                      >
                        {log.actorName}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6560] leading-relaxed">{log.details}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-[#C4B9AE]" />
                      <span className="text-[10px] text-[#A89F94] font-mono">{log.timestamp}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </DataCard>
      </div>
    </AppLayout>
  );
}
