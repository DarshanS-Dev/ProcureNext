'use client';

/**
 * GET /startup/problem-statements — every published PS, each carrying a
 * `recommended` flag set by the semantic matcher against this startup's Level 2
 * description. Recommended matches are shown first.
 */

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  DataCard,
  DocLinkButton,
  DocSelect,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDate, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { CATEGORY_VALUES, CategoryEnum } from '@/lib/types/api';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function StartupDiscoverPage() {
  const psQuery = useQuery(() => api.getMatchedProblemStatements(), []);
  const [category, setCategory] = useState<CategoryEnum | ''>('');
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  const visible = useMemo(() => {
    const rows = psQuery.data ?? [];
    return rows
      .filter((ps) => (category ? ps.category === category : true))
      .filter((ps) => (onlyRecommended ? ps.recommended : true))
      .slice()
      // Recommended first, then newest.
      .sort((a, b) => {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
        return b.id - a.id;
      });
  }, [psQuery.data, category, onlyRecommended]);

  const recommendedCount = (psQuery.data ?? []).filter((ps) => ps.recommended).length;

  return (
    <AppLayout allow="startup">
      <div className="space-y-6">
        <PageHeader
          title="Discover Problem Statements"
          subtitle="Every published problem statement. Ones matching your Level 2 capability description are flagged as recommended."
          phase="Semantic matching"
          role="startup"
          breadcrumb={[{ label: 'Startup', href: '/startup/dashboard' }, { label: 'Discover' }]}
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="text-[11px] font-bold text-[#6B6560] uppercase tracking-wider">
              Category
            </label>
            <DocSelect
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryEnum | '')}
            >
              <option value="">All categories</option>
              {CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </DocSelect>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-[#6B6560] cursor-pointer pb-2.5">
            <input
              type="checkbox"
              checked={onlyRecommended}
              onChange={(e) => setOnlyRecommended(e.target.checked)}
              className="w-4 h-4 accent-[#1E9E5A] cursor-pointer"
            />
            Recommended only ({recommendedCount})
          </label>
        </div>

        {psQuery.loading && <LoadingBlock label="Loading problem statements…" />}
        {psQuery.error && <ApiErrorState error={psQuery.error} onRetry={psQuery.refetch} />}

        {psQuery.data && visible.length === 0 && (
          <EmptyState
            title="No problem statements match"
            hint={
              psQuery.data.length === 0
                ? 'Nothing has been published yet. Officers publish problem statements from their own workspace.'
                : 'Try clearing the category filter or the recommended-only toggle.'
            }
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visible.map((ps) => (
            <DataCard key={ps.id} className="space-y-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                {ps.recommended ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: '#EAF7ED', color: '#1E9E5A', border: '1px solid #B8E6C4' }}
                  >
                    <Sparkles className="w-3 h-3" /> Recommended
                  </span>
                ) : (
                  <StatusBadge status="published" label="Open" />
                )}
                <span className="font-mono text-[11px] text-[#A89F94] shrink-0">PS #{ps.id}</span>
              </div>

              <div className="flex-1 space-y-1.5">
                <h2 className="text-sm font-bold text-[#1A1A1A] leading-snug">{ps.title}</h2>
                <p className="text-xs text-[#6B6560]">
                  {humanize(ps.category)}
                  {ps.budget_range ? ` · Budget ${humanize(ps.budget_range)}` : ''}
                  {ps.published_at ? ` · Published ${fmtDate(ps.published_at)}` : ''}
                </p>
                {ps.description && (
                  <p className="text-xs text-[#6B6560] leading-relaxed line-clamp-3">
                    {ps.description}
                  </p>
                )}
              </div>

              <div
                className="p-3 rounded-lg text-xs space-y-1"
                style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}
              >
                <Field label="Baseline" value={ps.baseline} />
                <Field label="Target" value={ps.target} />
                <Field label="Measurement" value={ps.measurement_method} />
              </div>

              <div className="flex items-center justify-end">
                <DocLinkButton
                  href={`/startup/applications/new?ps_id=${ps.id}`}
                  role="startup"
                  size="sm"
                  icon={<ArrowRight className="w-3 h-3" />}
                >
                  Apply
                </DocLinkButton>
              </div>
            </DataCard>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-[10px] font-bold uppercase text-[#A89F94] w-24 shrink-0 pt-0.5">
      {label}
    </span>
    <span className="text-[#6B6560] flex-1">{value || '—'}</span>
  </div>
);
