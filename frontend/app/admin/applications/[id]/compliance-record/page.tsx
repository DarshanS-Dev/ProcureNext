'use client';

/**
 * POST /admin/applications/{id}/compliance-record   — compile a new record
 * GET  /admin/applications/{id}/compliance-records  — every record compiled
 *
 * Records are immutable snapshots, so they are drawn as dots on a timeline —
 * each dot is one `generated_at`. The selected snapshot renders generically
 * (nested objects expand, primitives render as rows) so a section the backend
 * later adds is never silently dropped.
 *
 * "Audit view" is a presentation mode of this same page for external audit
 * (CAG) review: write actions hide and the snapshot gets a carbon-copy
 * treatment. It is not a separate role — access still runs through Admin.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { DecisionReadinessPanel } from '@/components/panels/ApplicationPanels';
import {
  ApiErrorState,
  LoadingBlock,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { ComplianceRecordRead } from '@/lib/types/api';
import {
  Card,
  EmptyState,
  HeroCard,
  PageHeader,
  PillButton,
  ScopeNote,
  StatPill,
} from '@/components/shared/design-system';
import { Eye, FileCheck2, History, Stamp } from 'lucide-react';

/** Renders arbitrary snapshot JSON without assuming its shape. */
const SnapshotNode: React.FC<{ label: string; value: unknown; depth?: number }> = ({
  label,
  value,
  depth = 0,
}) => {
  if (value === null || value === undefined) return <Leaf label={label} value="—" />;

  if (Array.isArray(value)) {
    if (value.length === 0) return <Leaf label={label} value="(empty)" />;
    return (
      <div className="py-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {humanize(label)} ({value.length})
        </div>
        <div className="mt-1 pl-3 space-y-0.5 border-l-2 border-[#F0F0EA]">
          {value.map((item, i) => (
            <SnapshotNode key={i} label={`#${i + 1}`} value={item} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="py-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {humanize(label)}
        </div>
        <div className="mt-1 pl-3 space-y-0.5 border-l-2 border-[#F0F0EA]">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <SnapshotNode key={k} label={k} value={v} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return <Leaf label={label} value={String(value)} />;
};

const Leaf: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-3 py-1 border-b border-[#F4F4EF] last:border-b-0">
    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-44 shrink-0 pt-0.5">
      {humanize(label)}
    </span>
    <span className="text-xs text-[#18181B] font-medium flex-1 break-words">{value}</span>
  </div>
);

export default function ComplianceRecordPage() {
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);

  const records = useQuery(() => api.getComplianceRecords(appId), [appId], {
    enabled: Number.isFinite(appId),
  });
  const generate = useMutation();
  const [selected, setSelected] = useState<number | null>(null);
  const [auditView, setAuditView] = useState(false);

  // Oldest → newest along the timeline.
  const list: ComplianceRecordRead[] = (records.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime());

  useEffect(() => {
    if (selected === null && list.length > 0) setSelected(list[list.length - 1].id);
  }, [list, selected]);

  const current = list.find((r) => r.id === selected) ?? null;

  if (!Number.isFinite(appId)) {
    return (
      <AppLayout allow="admin">
        <EmptyState title="Invalid application id" hint={`"${params.id}" is not a number.`} />
      </AppLayout>
    );
  }

  return (
    <AppLayout allow="admin">
      <div className={`space-y-6 pb-12 ${auditView ? 'grayscale-[0.6]' : ''}`}>
        <PageHeader
          line1="Compliance"
          glyph={<Stamp className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Record"
          subtitle={`Audit-grade snapshots of everything on record for application #${appId}.`}
          action={
            <PillButton
              variant={auditView ? 'ink' : 'outline'}
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setAuditView((v) => !v)}
            >
              {auditView ? 'Exit audit view' : 'Audit view'}
            </PillButton>
          }
        />

        {auditView && (
          <HeroCard
            icon={<Eye className="w-4 h-4" />}
            label="External audit view"
            aside={<StatPill tone="white">Read only</StatPill>}
            title="Carbon copy — no actions available"
            body="This is how the record reads to an external auditor. Write actions are hidden; nothing here can be changed."
          />
        )}

        {!auditView && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DecisionReadinessPanel appId={appId} canViewCOI={true} />
            </div>
            <HeroCard
              icon={<FileCheck2 className="w-4 h-4" />}
              label="Compile"
              title="Capture the current state"
              body="Eligibility, checklist, scores, QCBS, risk, containment and the pilot trail. Records are never modified — compiling again adds a new dot to the timeline."
              action={
                <div className="space-y-2">
                  {generate.error && (
                    <p className="text-[11px] text-[#FCA5A5]">{generate.error.detail}</p>
                  )}
                  {generate.success && (
                    <p className="text-[11px] text-[#D7FD44]">{generate.success}</p>
                  )}
                  <button
                    disabled={generate.pending}
                    onClick={() =>
                      generate.run(() => api.generateComplianceRecord(appId), {
                        successMessage: 'Compliance record compiled.',
                        onSuccess: (rec) => {
                          setSelected(rec.id);
                          records.refetch();
                        },
                      })
                    }
                    className="w-full bg-white hover:bg-[#D7FD44] text-[#121212] font-bold text-xs py-2.5 px-4 rounded-full transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {generate.pending ? 'Compiling…' : 'Compile record'}
                  </button>
                </div>
              }
            />
          </div>
        )}

        {records.loading && <LoadingBlock label="Loading records…" />}
        {records.error && <ApiErrorState error={records.error} onRetry={records.refetch} />}

        {records.data && list.length === 0 && (
          <EmptyState
            icon={<History className="w-5 h-5" />}
            title="No records compiled yet"
            hint="Compile one to capture the current state of this application."
          />
        )}

        {/* Addition 1 — every immutable snapshot as a dot on a timeline. */}
        {list.length > 0 && (
          <Card
            icon={<History className="w-4 h-4" />}
            label="Snapshot Timeline"
            aside={<StatPill>{list.length} sealed</StatPill>}
          >
            <div className="overflow-x-auto pb-2">
              <div className="relative flex items-start gap-0 min-w-max pt-2">
                <div className="absolute left-3 right-3 top-[18px] h-0.5 bg-[#E5E5E0]" />
                {list.map((rec) => {
                  const isSel = rec.id === selected;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelected(rec.id)}
                      className="relative flex flex-col items-center gap-2 px-5 cursor-pointer group"
                    >
                      <span
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          isSel
                            ? 'bg-[#D7FD44] border-[#18181B] scale-125'
                            : 'bg-white border-[#18181B] group-hover:bg-[#F3F3EE]'
                        }`}
                      />
                      <span className={`text-[10px] font-bold ${isSel ? 'text-[#18181B]' : 'text-gray-400'}`}>
                        #{rec.id}
                      </span>
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">
                        {fmtDateTime(rec.generated_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Addition 2 — the selected snapshot, one card per top-level section. */}
        {current && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black text-[#18181B] tracking-tight">
                Record #{current.id}
              </h2>
              <div className="flex items-center gap-2">
                <StatPill tone="ghost">PS #{current.problem_statement_id}</StatPill>
                <StatPill tone="ghost">by user #{current.generated_by}</StatPill>
                <StatPill tone={auditView ? 'ink' : 'accent'}>Sealed</StatPill>
              </div>
            </div>

            {Object.keys(current.snapshot ?? {}).length === 0 ? (
              <ScopeNote>The snapshot is empty.</ScopeNote>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(current.snapshot).map(([section, value]) => (
                  <div
                    key={section}
                    className={`bg-white rounded-3xl border shadow-sm p-5 ${
                      auditView ? 'border-dashed border-[#9CA3AF]' : 'border-[#E5E5E0]'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-[#18181B] mb-2">
                      {humanize(section)}
                    </div>
                    <SnapshotNode label="" value={value} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <ScopeNote>
          Generated by Admin, viewed via the Admin console. External audit access uses
          this same page — there is no separate auditor login.
        </ScopeNote>
      </div>
    </AppLayout>
  );
}
