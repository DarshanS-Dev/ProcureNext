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
  StatusBadge,
} from '@/components/shared/DesignSystem';
import {
  Card,
  DonutRing,
  DotTrack,
  HeroCard,
  PageHeader as Header,
  PillLink,
  ScopeNote,
  StatPill,
  Stepper,
} from '@/components/shared/design-system';
import { ApplicationStatusDonut } from '@/components/shared/domain/Insights';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDateTime, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { ApplicationRead, ApplicationStatusEnum, ProblemStatementRead } from '@/lib/types/api';
import { ArrowRight, BarChart3, PieChart, Stamp } from 'lucide-react';

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
        <Header
          line1="Applications"
          glyph={<Stamp className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Register"
          subtitle="Every application on the platform, and the audit-grade record you can compile for each."
        />

        {data.data && data.data.rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card icon={<PieChart className="w-4 h-4" />} label="Platform Pipeline" aside={<StatPill>{visible.length} shown</StatPill>}>
              <ApplicationStatusDonut apps={visible.map((r) => r.app)} />
            </Card>
            <Card className="lg:col-span-2" icon={<BarChart3 className="w-4 h-4" />} label="Volume by Problem Statement">
              <div className="space-y-2.5">
                {data.data.problemStatements
                  .map((ps) => ({ ps, n: data.data!.rows.filter((r) => r.ps.id === ps.id).length }))
                  .filter((x) => x.n > 0)
                  .sort((a, b) => b.n - a.n)
                  .slice(0, 8)
                  .map(({ ps, n }, _i, all) => {
                    const max = Math.max(1, ...all.map((c) => c.n));
                    const on = psFilter === String(ps.id);
                    return (
                      <button
                        key={ps.id}
                        onClick={() => setPsFilter(on ? '' : String(ps.id))}
                        className="w-full flex items-center gap-3 text-left group cursor-pointer"
                      >
                        <span className="text-[11px] font-bold text-[#18181B] w-40 truncate">{ps.title}</span>
                        <span className="flex-1 h-5 rounded-full bg-[#F3F3EE] overflow-hidden">
                          <span
                            className={`block h-full rounded-full ${on ? 'bg-[#D7FD44]' : 'bg-[#18181B]'}`}
                            style={{ width: `${(n / max) * 100}%` }}
                          />
                        </span>
                        <StatPill tone="ghost">{n}</StatPill>
                      </button>
                    );
                  })}
                <p className="text-[10px] text-gray-400 pt-1">Click a bar to filter the register below.</p>
              </div>
            </Card>
          </div>
        )}

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
