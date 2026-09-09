'use client';

/**
 * Admin's way into any application, and from there its compliance record.
 *
 * Admins may use either branch of GET /applications, so this fans out over
 * every problem statement rather than only one officer's.
 */

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  DocLinkButton,
  DocSelect,
  DocumentForm,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDateTime, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { ApplicationRead, ApplicationStatusEnum, ProblemStatementRead } from '@/lib/types/api';
import { ArrowRight } from 'lucide-react';

const STATUSES: ApplicationStatusEnum[] = [
  'applied',
  'under_review',
  'under_evaluation',
  'selected',
  'not_selected',
  'contracted',
  'completed',
];

interface Row {
  app: ApplicationRead;
  ps: ProblemStatementRead;
}

export default function AdminApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatusEnum | ''>('');
  const [psFilter, setPsFilter] = useState('');

  const data = useQuery<{ rows: Row[]; problemStatements: ProblemStatementRead[] }>(async () => {
    const problemStatements = await api.getProblemStatements();
    const lists = await Promise.all(
      problemStatements.map(async (ps) => {
        try {
          const apps = await api.getApplicationsForPS(ps.id);
          return apps.map((app) => ({ app, ps }));
        } catch {
          return [] as Row[];
        }
      }),
    );
    return {
      problemStatements,
      rows: lists.flat().sort((a, b) => b.app.id - a.app.id),
    };
  }, []);

  const visible = useMemo(() => {
    const rows = data.data?.rows ?? [];
    return rows
      .filter((r) => (status ? r.app.status === status : true))
      .filter((r) => (psFilter ? String(r.ps.id) === psFilter : true));
  }, [data.data, status, psFilter]);

  return (
    <AppLayout allow="admin">
      <div className="space-y-6">
        <PageHeader
          title="Applications & Compliance Records"
          subtitle="Every application on the platform, and the audit-grade record you can compile for each."
          phase="Compliance record"
          role="admin"
          breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Applications' }]}
        />

        <div className="flex flex-wrap gap-3">
          <div className="w-64">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Problem statement
            </label>
            <DocSelect value={psFilter} onChange={(e) => setPsFilter(e.target.value)}>
              <option value="">All problem statements</option>
              {(data.data?.problemStatements ?? []).map((ps) => (
                <option key={ps.id} value={ps.id}>
                  PS #{ps.id} — {ps.title}
                </option>
              ))}
            </DocSelect>
          </div>
          <div className="w-48">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Status
            </label>
            <DocSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatusEnum | '')}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </DocSelect>
          </div>
        </div>

        {data.loading && <LoadingBlock label="Loading applications…" />}
        {data.error && <ApiErrorState error={data.error} onRetry={data.refetch} />}

        {data.data && visible.length === 0 && (
          <EmptyState
            title="No applications match"
            hint={
              data.data.rows.length === 0
                ? 'Nothing has been submitted on the platform yet.'
                : 'Try clearing the filters.'
            }
          />
        )}

        {visible.length > 0 && (
          <DocumentForm
            title="Application Register"
            subtitle={`${visible.length} of ${data.data?.rows.length ?? 0}`}
            refNumber="ADM-APP"
            role="admin"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {visible.map(({ app, ps }) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={app.status} />
                      <span className="font-mono text-[11px] text-[#9CA3AF]">
                        APP #{app.id} · PS #{ps.id}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#18181B] truncate">
                      {(app.technical_proposal?.title as string | undefined) ??
                        `Application #${app.id}`}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {ps.title} · startup #{app.startup_id} · {fmtDateTime(app.created_at)}
                    </div>
                  </div>

                  <DocLinkButton
                    href={`/admin/applications/${app.id}/compliance-record`}
                    role="admin"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Compliance record
                  </DocLinkButton>
                </div>
              ))}
            </div>
          </DocumentForm>
        )}
      </div>
    </AppLayout>
  );
}
