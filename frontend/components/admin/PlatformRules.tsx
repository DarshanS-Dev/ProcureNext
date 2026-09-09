'use client';

/**
 * The rules that actually govern the platform, shown read-only.
 *
 * These are deliberately not editable. QCBS weighting is fixed at 70/30 for the
 * MVP (there is no QCBSWeightConfig table), the risk bands are constants in the
 * scoring service, and clause templates are a fixed Python dict in
 * `contract_service.py` with no write route. An editable dial here would promise
 * a capability the backend does not expose, so the dials read out and nothing
 * more.
 *
 * Rubric weights are the exception: those are real rows, so they are fetched.
 */

import React from 'react';
import { AlertTriangle, FileText, Scale, SlidersHorizontal } from 'lucide-react';
import { Card, IconBadge, ScopeNote, StatPill } from '@/components/shared/design-system';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { humanize } from '@/components/shared/States';

/** A dial readout: a value on an arc, with no handle, because it is not settable. */
const Readout: React.FC<{ label: string; value: string; fill: number; caption?: string }> = ({
  label,
  value,
  fill,
  caption,
}) => {
  const START = 135;
  const SWEEP = 270;
  const point = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return [50 + Math.cos(rad) * r, 50 + Math.sin(rad) * r] as const;
  };
  const [x1, y1] = point(START, 34);
  const [x2, y2] = point(START + SWEEP, 34);
  const end = START + SWEEP * Math.max(0, Math.min(1, fill));
  const [vx, vy] = point(end, 34);
  const large = end - START > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: 96, height: 96 }}>
        <svg viewBox="0 0 100 100" width={96} height={96}>
          <path
            d={`M ${x1} ${y1} A 34 34 0 1 1 ${x2} ${y2}`}
            fill="none"
            stroke="#F0F0EA"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {fill > 0 && (
            <path
              d={`M ${x1} ${y1} A 34 34 0 ${large} 1 ${vx} ${vy}`}
              fill="none"
              stroke="#18181B"
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-[#18181B] tabular-nums">{value}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-[#18181B] leading-tight">{label}</div>
        {caption && <div className="text-[9px] text-gray-400">{caption}</div>}
      </div>
    </div>
  );
};

export const PlatformRules: React.FC = () => {
  const criteria = useQuery(() => api.getRubricCriteria(), []);
  const rows = criteria.data ?? [];
  const totalWeight = rows.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card
        icon={<Scale className="w-4 h-4" />}
        label="Fixed platform rules"
        aside={<StatPill tone="ghost">Read-only</StatPill>}
      >
        <div className="grid grid-cols-3 gap-3 my-2">
          <Readout label="Quality" value="70%" fill={0.7} caption="QCBS split" />
          <Readout label="Cost" value="30%" fill={0.3} caption="QCBS split" />
          <Readout
            label="Rubric weight"
            value={rows.length ? String(totalWeight) : '—'}
            fill={rows.length ? 1 : 0}
            caption={`${rows.length} criteria`}
          />
        </div>

        <div className="rounded-2xl bg-[#F8F8F4] p-3 space-y-1.5 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Risk bands
          </div>
          {[
            ['Low', '≥ 70', '#1E9E5A'],
            ['Medium', '40 – 69', '#F59E0B'],
            ['High', '< 40', '#C81E4A'],
          ].map(([band, range, color]) => (
            <div key={band} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2 font-semibold text-[#18181B]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {band}
              </span>
              <span className="font-mono text-gray-500">{range}</span>
            </div>
          ))}
        </div>

        <ScopeNote className="mt-3">
          Fixed for the MVP. There is no configuration endpoint for the QCBS split or the
          risk bands, so this console shows them rather than pretending to set them.
        </ScopeNote>
      </Card>

      <Card
        icon={<SlidersHorizontal className="w-4 h-4" />}
        label="Rubric weights"
        aside={
          <StatPill tone={rows.length ? 'ink' : 'ghost'}>
            {rows.length ? `${rows.length} criteria` : 'none seeded'}
          </StatPill>
        }
      >
        {criteria.loading && <div className="h-24 rounded-2xl bg-[#F0F0EA] animate-pulse" />}

        {!criteria.loading && rows.length === 0 && (
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <IconBadge size="sm" tone="warn" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
            <span className="pt-1.5">
              No rubric criteria are seeded, so evaluators cannot score anything yet.
            </span>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-[#18181B] truncate">{c.name}</span>
                <span className="font-black text-[#18181B] tabular-nums shrink-0">{c.weight}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F0F0EA] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#18181B]"
                  style={{
                    width: `${totalWeight ? (c.weight / totalWeight) * 100 : 0}%`,
                  }}
                />
              </div>
              {c.category && (
                <div className="text-[9px] text-gray-400">{humanize(c.category)} only</div>
              )}
            </div>
          ))}
        </div>

        <ScopeNote className="mt-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#18181B]">
            <FileText className="w-3 h-3" /> Clause templates
          </span>{' '}
          are generated server-side per category from a fixed dictionary and frozen onto
          each contract as `clause_snapshot`. They are visible on any contract, and there
          is no endpoint to edit them.
        </ScopeNote>
      </Card>
    </div>
  );
};
