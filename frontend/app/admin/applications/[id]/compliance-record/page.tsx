'use client';

/**
 * POST /admin/applications/{id}/compliance-record   — compile a new record
 * GET  /admin/applications/{id}/compliance-records  — every record compiled
 * GET  /admin/compliance-records/{record_id}        — one record in full
 *
 * The snapshot is a free-form JSON blob spanning all four layers, so it is
 * rendered generically: nested objects expand, primitives render as rows. That
 * way the page cannot silently drop a section the backend later adds.
 */

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { DecisionReadinessPanel, PanelHeading } from '@/components/panels/ApplicationPanels';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  UnmountedRouterNotice,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { ComplianceRecordRead } from '@/lib/types/api';
import { FileCheck2 } from 'lucide-react';

/** Renders arbitrary snapshot JSON without assuming its shape. */
const SnapshotNode: React.FC<{ label: string; value: unknown; depth?: number }> = ({
  label,
  value,
  depth = 0,
}) => {
  if (value === null || value === undefined) {
    return <Leaf label={label} value="—" depth={depth} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <Leaf label={label} value="(empty)" depth={depth} />;
    return (
      <div style={{ marginLeft: depth * 12 }} className="py-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94]">
          {humanize(label)} ({value.length})
        </div>
        <div className="mt-1 space-y-0.5">
          {value.map((item, i) => (
            <SnapshotNode key={i} label={`#${i + 1}`} value={item} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div style={{ marginLeft: depth * 12 }} className="py-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94]">
          {humanize(label)}
        </div>
        <div
          className="mt-1 pl-3 space-y-0.5"
          style={{ borderLeft: '2px solid #EDE7DB' }}
        >
          {entries.map(([k, v]) => (
            <SnapshotNode key={k} label={k} value={v} depth={depth} />
          ))}
        </div>
      </div>
    );
  }

  return <Leaf label={label} value={String(value)} depth={depth} />;
};

const Leaf: React.FC<{ label: string; value: string; depth: number }> = ({
  label,
  value,
  depth,
}) => (
  <div
    className="flex gap-3 py-1 border-b border-[#F5F1E8] last:border-b-0"
    style={{ marginLeft: depth * 12 }}
  >
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A89F94] w-44 shrink-0 pt-0.5">
      {humanize(label)}
    </span>
    <span className="text-xs text-[#1A1A1A] font-medium flex-1 break-words">{value}</span>
  </div>
);

export default function ComplianceRecordPage() {
  const params = useParams<{ id: string }>();
  const appId = Number(params.id);

  const records = useQuery(() => api.getComplianceRecords(appId), [appId], {
    enabled: Number.isFinite(appId),
  });
  const generate = useMutation();
  const [expanded, setExpanded] = useState<number | null>(null);

  const list: ComplianceRecordRead[] = (records.data ?? [])
    .slice()
    .sort((a, b) => b.id - a.id);

  if (!Number.isFinite(appId)) {
    return (
      <AppLayout allow="admin">
        <EmptyState title="Invalid application id" hint={`"${params.id}" is not a number.`} />
      </AppLayout>
    );
  }

  return (
    <AppLayout allow="admin">
      <div className="space-y-6">
        <PageHeader
          title="Compliance Record"
          subtitle={`Audit-grade snapshot of everything on record for application #${appId}.`}
          phase="Compliance record"
          role="admin"
          breadcrumb={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Applications', href: '/admin/applications' },
            { label: `#${appId}` },
          ]}
        <DecisionReadinessPanel appId={appId} canViewCOI={true} />

        <DataCard>
          <PanelHeading
            title="Compile a new record"
            endpoint={`POST /admin/applications/${appId}/compliance-record`}
          />
          <p className="text-xs text-[#6B6560] mb-3">
            Compiling captures the state of this application right now — eligibility,
            checklist, scores, QCBS, risk, containment and the pilot trail. Existing
            records are never modified, so compiling again adds a new one.
          </p>

          {generate.error && (
            <AlertStrip type="error" title="Not compiled" message={generate.error.detail} />
          )}
          {generate.success && <AlertStrip type="success" message={generate.success} />}

          <DocButton
            size="sm"
            variant="primary"
            role="admin"
            loading={generate.pending}
            icon={<FileCheck2 className="w-3 h-3" />}
            onClick={() =>
              generate.run(() => api.generateComplianceRecord(appId), {
                successMessage: 'Compliance record compiled.',
                onSuccess: (rec) => {
                  setExpanded(rec.id);
                  records.refetch();
                },
              })
            }
          >
            Compile record
          </DocButton>
        </DataCard>

        {records.loading && <LoadingBlock label="Loading records…" />}
        {records.error && (
          <ApiErrorState error={records.error} onRetry={records.refetch} />
        )}

        {records.data && list.length === 0 && (
          <EmptyState
            title="No records compiled yet"
            hint="Compile one above to capture the current state of this application."
          />
        )}

        <div className="space-y-4">
          {list.map((record) => {
            const isOpen = expanded === record.id;
            return (
              <DataCard key={record.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">
                      Record #{record.id}
                    </div>
                    <div className="text-[11px] text-[#6B6560]">
                      Compiled {fmtDateTime(record.generated_at)} by user #{record.generated_by} ·
                      PS #{record.problem_statement_id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status="verified" label="Sealed" />
                    <DocButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(isOpen ? null : record.id)}
                    >
                      {isOpen ? 'Collapse' : 'Expand'}
                    </DocButton>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-[#EDE7DB]">
                    {Object.keys(record.snapshot ?? {}).length === 0 ? (
                      <p className="text-xs text-[#6B6560]">The snapshot is empty.</p>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(record.snapshot).map(([k, v]) => (
                          <SnapshotNode key={k} label={k} value={v} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </DataCard>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
