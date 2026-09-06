'use client';
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { api } from '@/lib/api/client';
import {
  PageHeader, DataCard, StatusBadge, StickyNote, DocLinkButton, DocRow, SectionDivider
} from '@/components/shared/DesignSystem';
import { ScrollText, Clock, Landmark, Scale, FlaskConical, Rocket, ShieldCheck as AdminIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const ACTOR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin:                  { bg: '#FBEAEC', text: '#C81E4A', border: '#F3BECA' },
  officer:                { bg: '#FDF3DC', text: '#B8860B', border: '#F7E1B5' },
  evaluator:              { bg: '#E9F1FB', text: '#2563EB', border: '#BFD7F8' },
  'independent-evaluator':{ bg: '#FBEFE6', text: '#D2691E', border: '#F0CDB5' },
  startup:                { bg: '#EAF7ED', text: '#1E9E5A', border: '#B8E6C4' },
};

export default function AdminAuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    api.getAuditLogs().then((res) => {
      if (Array.isArray(res)) {
        setAuditLogs(res.map(l => ({
          id: l.id,
          action: l.action,
          timestamp: l.timestamp ? new Date(l.timestamp).toISOString().replace('T', ' ').substring(0, 19) : '',
          actor: l.actor_role || 'admin',
          actorName: l.actor_name || `User #${l.actor_id}`,
          details: l.details || `Entity: ${l.entity_type} #${l.entity_id}`,
        })));
      }
    }).catch(() => {});
  }, []);
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
            <ScrollText className="w-4 h-4 text-[#A89F94]" />
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
                  <div className="relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: actorStyle.bg, border: `1.5px solid ${actorStyle.border}` }}>
                    {{
                      admin: <AdminIcon className="w-3.5 h-3.5" style={{ color: actorStyle.text }} />,
                      officer: <Landmark className="w-3.5 h-3.5" style={{ color: actorStyle.text }} />,
                      evaluator: <Scale className="w-3.5 h-3.5" style={{ color: actorStyle.text }} />,
                      'independent-evaluator': <FlaskConical className="w-3.5 h-3.5" style={{ color: actorStyle.text }} />,
                      startup: <Rocket className="w-3.5 h-3.5" style={{ color: actorStyle.text }} />,
                    }[log.actor] ?? <ScrollText className="w-3.5 h-3.5" style={{ color: actorStyle.text }} />}
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
