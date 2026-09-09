'use client';

/**
 * GET  /admin/startups?compliance_status=unverified
 * POST /admin/startups/{user_id}/verify-compliance
 *
 * Verification is a single pass: all four fields go together in one request,
 * and doing it is what unblocks the startup from applying at all.
 */

import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocSelect,
  PageHeader,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, EmptyState, LoadingBlock, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { DpiitStatusEnum, StartupProfileRead } from '@/lib/types/api';
import { ShieldCheck } from 'lucide-react';

interface Draft {
  dpiit_status: DpiitStatusEnum;
  entity_verified: boolean;
  pan_verified: boolean;
  gst_verified: boolean;
}

export default function AdminComplianceQueuePage() {
  const query = useQuery(() => api.getUnverifiedStartups(), []);
  const verify = useMutation();
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const draftFor = (p: StartupProfileRead): Draft =>
    drafts[p.user_id] ?? {
      dpiit_status: p.dpiit_status,
      entity_verified: p.entity_verified,
      pan_verified: p.pan_verified,
      gst_verified: p.gst_verified,
    };

  const setDraft = (userId: number, patch: Partial<Draft>, current: Draft) =>
    setDrafts((d) => ({ ...d, [userId]: { ...current, ...patch } }));

  return (
    <AppLayout allow="admin">
      <div className="space-y-6">
        <PageHeader
          title="Compliance Queue"
          subtitle="Startups awaiting verification. Until this is done they cannot submit an application."
          phase="Layer 1 · Actors"
          role="admin"
          breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Compliance' }]}
        />

        <AlertStrip
          type="info"
          title="One pass, four fields"
          message="DPIIT status, entity, PAN and GST are submitted together — the endpoint takes all four at once. Check the submitted registration details against the source registries before verifying."
        />

        {verify.error && (
          <AlertStrip type="error" title="Verification failed" message={verify.error.detail} />
        )}
        {verify.success && <AlertStrip type="success" message={verify.success} />}

        {query.loading && <LoadingBlock label="Loading queue…" />}
        {query.error && <ApiErrorState error={query.error} onRetry={query.refetch} />}

        {query.data && query.data.length === 0 && (
          <EmptyState
            title="Queue is clear"
            hint="Every startup profile on the platform has been through compliance verification."
          />
        )}

        <div className="space-y-4">
          {(query.data ?? []).map((profile) => {
            const draft = draftFor(profile);
            return (
              <DataCard key={profile.user_id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-[#18181B]">
                      Startup user #{profile.user_id}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      {profile.entity_type || 'Entity type not stated'}
                      {profile.stage ? ` · ${profile.stage}` : ''}
                    </div>
                  </div>
                  <StatusBadge status="pending" label="Unverified" />
                </div>

                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 p-3 rounded-lg text-xs"
                  style={{ backgroundColor: '#F4F4EF', border: '1px solid #E5E5E0' }}
                >
                  <Submitted label="DPIIT number" value={profile.dpiit_number} />
                  <Submitted label="PAN" value={profile.pan} />
                  <Submitted label="GST" value={profile.gst} />
                  <Submitted label="Website" value={profile.website} />
                  <Submitted label="Address" value={profile.address} />
                  <Submitted
                    label="Sector tags"
                    value={(profile.sector_tags ?? []).join(', ') || null}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                      DPIIT status
                    </span>
                    <DocSelect
                      value={draft.dpiit_status}
                      onChange={(e) =>
                        setDraft(
                          profile.user_id,
                          { dpiit_status: e.target.value as DpiitStatusEnum },
                          draft,
                        )
                      }
                    >
                      <option value="unverified">Unverified</option>
                      <option value="verified">Verified</option>
                      <option value="failed">Failed</option>
                    </DocSelect>
                  </label>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                      Document checks
                    </span>
                    {(
                      [
                        ['entity_verified', 'Entity verified'],
                        ['pan_verified', 'PAN verified'],
                        ['gst_verified', 'GST verified'],
                      ] as [keyof Draft, string][]
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-xs font-medium text-[#18181B] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(draft[key])}
                          onChange={(e) =>
                            setDraft(profile.user_id, { [key]: e.target.checked } as Partial<Draft>, draft)
                          }
                          className="w-4 h-4 accent-[#C81E4A] cursor-pointer"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <DocButton
                  size="sm"
                  variant="primary"
                  role="admin"
                  loading={verify.pending}
                  icon={<ShieldCheck className="w-3 h-3" />}
                  onClick={() =>
                    verify.run(() => api.verifyStartupCompliance(profile.user_id, draft), {
                      successMessage: `Compliance recorded for startup #${profile.user_id}.`,
                      onSuccess: () => query.refetch(),
                    })
                  }
                >
                  Record verification
                </DocButton>

                {draft.dpiit_status !== 'verified' && (
                  <p className="text-[11px] text-[#9CA3AF] italic">
                    Recording anything other than a verified DPIIT status leaves this
                    startup blocked from applying, which may be the correct outcome.
                  </p>
                )}
              </DataCard>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

const Submitted: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-[10px] font-bold uppercase text-[#9CA3AF] w-28 shrink-0 pt-0.5">
      {label}
    </span>
    <span className="text-[#18181B] font-medium flex-1 break-words">
      {value || <span className="text-[#9CA3AF] italic">Not provided</span>}
    </span>
  </div>
);
