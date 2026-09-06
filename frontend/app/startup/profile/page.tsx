'use client';

/**
 * GET  /startup/profile
 * PATCH /startup/profile/level1
 * PATCH /startup/profile/level2
 *
 * Level 2 and admin compliance verification are both hard gates on applying
 * (application_service raises IncompleteProfileError / ComplianceNotVerifiedError),
 * so this page shows exactly which of the two is still blocking.
 */

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocInput,
  DocSelect,
  DocTextarea,
  DocumentForm,
  FormField,
  PageHeader,
  SectionDivider,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, LoadingBlock, fmtDateTime, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import {
  ARCHITECTURE_VALUES,
  ArchitectureTagEnum,
  FUNDING_BAND_VALUES,
  FundingBandEnum,
  StartupProfileRead,
} from '@/lib/types/api';
import { CheckCircle2, Save, ShieldCheck } from 'lucide-react';

/** "a, b , c" <-> ["a","b","c"], for the list-typed columns. */
const parseList = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const joinList = (values?: string[] | null): string => (values ?? []).join(', ');

export default function StartupProfilePage() {
  const profileQuery = useQuery(() => api.getMyProfile(), []);
  const level1 = useMutation();
  const level2 = useMutation();

  const [tab, setTab] = useState<'level1' | 'level2'>('level1');

  // Level 1 fields
  const [entityType, setEntityType] = useState('');
  const [dpiitNumber, setDpiitNumber] = useState('');
  const [pan, setPan] = useState('');
  const [gst, setGst] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [stage, setStage] = useState('');
  const [sectorTags, setSectorTags] = useState('');

  // Level 2 fields
  const [teamHeadcount, setTeamHeadcount] = useState('');
  const [techStack, setTechStack] = useState('');
  const [trlStage, setTrlStage] = useState('');
  const [architecture, setArchitecture] = useState<ArchitectureTagEnum[]>([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [fundingBand, setFundingBand] = useState<FundingBandEnum | ''>('');
  const [description, setDescription] = useState('');

  const profile = profileQuery.data;

  // Seed the form once the server row arrives (and after each successful save).
  useEffect(() => {
    if (!profile) return;
    setEntityType(profile.entity_type ?? '');
    setDpiitNumber(profile.dpiit_number ?? '');
    setPan(profile.pan ?? '');
    setGst(profile.gst ?? '');
    setAddress(profile.address ?? '');
    setWebsite(profile.website ?? '');
    setStage(profile.stage ?? '');
    setSectorTags(joinList(profile.sector_tags));

    setTeamHeadcount(profile.team_headcount != null ? String(profile.team_headcount) : '');
    setTechStack(joinList(profile.tech_stack));
    setTrlStage(profile.trl_stage != null ? String(profile.trl_stage) : '');
    setArchitecture(profile.architecture ?? []);
    setApiAvailable(profile.api_available ?? false);
    setFundingBand(profile.funding_band ?? '');
    setDescription(profile.description ?? '');
  }, [profile]);

  const saveLevel1 = (e: React.FormEvent) => {
    e.preventDefault();
    level1.run(
      () =>
        api.updateProfileLevel1({
          entity_type: entityType || null,
          dpiit_number: dpiitNumber || null,
          pan: pan || null,
          gst: gst || null,
          address: address || null,
          website: website || null,
          stage: stage || null,
          sector_tags: sectorTags ? parseList(sectorTags) : null,
        }),
      {
        successMessage: 'Level 1 registration details saved.',
        onSuccess: (updated) => profileQuery.setData(updated as StartupProfileRead),
      },
    );
  };

  const saveLevel2 = (e: React.FormEvent) => {
    e.preventDefault();
    level2.run(
      () =>
        api.updateProfileLevel2({
          team_headcount: teamHeadcount ? Number(teamHeadcount) : null,
          tech_stack: techStack ? parseList(techStack) : null,
          trl_stage: trlStage ? Number(trlStage) : null,
          architecture: architecture.length ? architecture : null,
          api_available: apiAvailable,
          funding_band: fundingBand || null,
          description: description || null,
        }),
      {
        successMessage: 'Level 2 capability profile saved.',
        onSuccess: (updated) => profileQuery.setData(updated as StartupProfileRead),
      },
    );
  };

  const toggleArchitecture = (tag: ArchitectureTagEnum) =>
    setArchitecture((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );

  return (
    <AppLayout allow="startup">
      <div className="space-y-6">
        <PageHeader
          title="Startup Profile"
          subtitle="Level 1 registration and Level 2 capability data. Both must be complete, and an admin must verify compliance, before you can apply."
          phase="Layer 1 · Actors"
          role="startup"
          breadcrumb={[{ label: 'Startup', href: '/startup/dashboard' }, { label: 'Profile' }]}
        />

        {profileQuery.loading && <LoadingBlock label="Loading profile…" />}

        {profileQuery.error && (
          <ApiErrorState error={profileQuery.error} onRetry={profileQuery.refetch} />
        )}

        {profile && (
          <>
            <ComplianceCard profile={profile} />

            <div className="flex gap-2">
              {(
                [
                  { id: 'level1', label: 'Level 1 — Registration' },
                  { id: 'level2', label: 'Level 2 — Capability' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  style={
                    tab === t.id
                      ? { backgroundColor: '#EAF7ED', color: '#1E9E5A', border: '1.5px solid #B8E6C4' }
                      : { backgroundColor: '#fff', color: '#6B6560', border: '1px solid #E8E2D5' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'level1' ? (
              <DocumentForm
                title="Company Registration Details"
                subtitle="PATCH /startup/profile/level1"
                refNumber="FORM-STR-L1"
                role="startup"
              >
                <form onSubmit={saveLevel1} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField label="Entity type" hint="e.g. Private Limited, LLP">
                      <DocInput
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                        placeholder="Private Limited"
                      />
                    </FormField>
                    <FormField label="DPIIT recognition number">
                      <DocInput
                        value={dpiitNumber}
                        onChange={(e) => setDpiitNumber(e.target.value)}
                        placeholder="DIPP12345"
                      />
                    </FormField>
                    <FormField label="PAN">
                      <DocInput value={pan} onChange={(e) => setPan(e.target.value)} placeholder="AAAAA0000A" />
                    </FormField>
                    <FormField label="GST">
                      <DocInput value={gst} onChange={(e) => setGst(e.target.value)} placeholder="22AAAAA0000A1Z5" />
                    </FormField>
                    <FormField label="Company stage" hint="e.g. early, growth">
                      <DocInput value={stage} onChange={(e) => setStage(e.target.value)} />
                    </FormField>
                    <FormField label="Website">
                      <DocInput
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://example.com"
                      />
                    </FormField>
                  </div>

                  <FormField label="Registered address">
                    <DocTextarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                  </FormField>

                  <FormField label="Sector tags" hint="Comma separated — e.g. healthcare, iot">
                    <DocInput value={sectorTags} onChange={(e) => setSectorTags(e.target.value)} />
                  </FormField>

                  <SaveRow
                    state={level1}
                    label="Save Level 1"
                    lockedNote="Fields already verified by an admin can no longer be edited — the server rejects the change."
                  />
                </form>
              </DocumentForm>
            ) : (
              <DocumentForm
                title="Technical Capability Profile"
                subtitle="PATCH /startup/profile/level2"
                refNumber="FORM-STR-L2"
                role="startup"
              >
                <form onSubmit={saveLevel2} className="space-y-5">
                  <FormField
                    label="Capability description"
                    required
                    hint="Feeds semantic matching against published problem statements."
                  >
                    <DocTextarea
                      rows={4}
                      lineStyle
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What your product does, for whom, and the outcome it delivers."
                    />
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField label="Team headcount">
                      <DocInput
                        type="number"
                        min={0}
                        value={teamHeadcount}
                        onChange={(e) => setTeamHeadcount(e.target.value)}
                      />
                    </FormField>

                    <FormField label="TRL stage" hint="1–9 (Technology Readiness Level)">
                      <DocSelect value={trlStage} onChange={(e) => setTrlStage(e.target.value)}>
                        <option value="">Not set</option>
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            TRL {n}
                          </option>
                        ))}
                      </DocSelect>
                    </FormField>

                    <FormField
                      label="Funding band"
                      classified
                      hint="Risk profiling input only — never used for eligibility or scoring."
                    >
                      <DocSelect
                        value={fundingBand}
                        onChange={(e) => setFundingBand(e.target.value as FundingBandEnum | '')}
                      >
                        <option value="">Not set</option>
                        {FUNDING_BAND_VALUES.map((band) => (
                          <option key={band} value={band}>
                            {humanize(band)}
                          </option>
                        ))}
                      </DocSelect>
                    </FormField>
                  </div>

                  <FormField label="Tech stack" hint="Comma separated — e.g. python, postgres, react">
                    <DocInput value={techStack} onChange={(e) => setTechStack(e.target.value)} />
                  </FormField>

                  <FormField label="Architecture" hint="Fixed set — feeds the cybersecurity and scalability risk grids.">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ARCHITECTURE_VALUES.map((tag) => {
                        const on = architecture.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleArchitecture(tag)}
                            aria-pressed={on}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-colors"
                            style={
                              on
                                ? { backgroundColor: '#EAF7ED', color: '#1E9E5A', border: '1.5px solid #B8E6C4' }
                                : { backgroundColor: '#fff', color: '#6B6560', border: '1px solid #E8E2D5' }
                            }
                          >
                            {humanize(tag)}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>

                  <FormField label="Public API available">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-[#1A1A1A] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={apiAvailable}
                        onChange={(e) => setApiAvailable(e.target.checked)}
                        className="w-4 h-4 accent-[#1E9E5A] cursor-pointer"
                      />
                      Yes, the product exposes an integration API
                    </label>
                  </FormField>

                  <SaveRow state={level2} label="Save Level 2" />
                </form>
              </DocumentForm>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

const SaveRow: React.FC<{
  state: ReturnType<typeof useMutation>;
  label: string;
  lockedNote?: string;
}> = ({ state, label, lockedNote }) => (
  <>
    <SectionDivider label="Submit" />
    {state.error && <AlertStrip type="error" title="Not saved" message={state.error.detail} />}
    {state.success && <AlertStrip type="success" message={state.success} />}
    {lockedNote && <p className="text-[10px] text-[#A89F94] italic">{lockedNote}</p>}
    <DocButton
      type="submit"
      variant="primary"
      role="startup"
      loading={state.pending}
      icon={<Save className="w-3.5 h-3.5" />}
    >
      {label}
    </DocButton>
  </>
);

/** The two gates the backend enforces before an application can be created. */
const ComplianceCard: React.FC<{ profile: StartupProfileRead }> = ({ profile }) => {
  const level2Complete = Boolean(profile.description && profile.trl_stage);
  const complianceVerified = Boolean(profile.compliance_verified_at);

  const checks = [
    { label: 'DPIIT status', ok: profile.dpiit_status === 'verified', value: humanize(profile.dpiit_status) },
    { label: 'Entity verified', ok: profile.entity_verified, value: profile.entity_verified ? 'Yes' : 'No' },
    { label: 'PAN verified', ok: profile.pan_verified, value: profile.pan_verified ? 'Yes' : 'No' },
    { label: 'GST verified', ok: profile.gst_verified, value: profile.gst_verified ? 'Yes' : 'No' },
  ];

  return (
    <DataCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1E9E5A]" />
          <span className="text-sm font-bold text-[#1A1A1A]">Application readiness</span>
        </div>
        <StatusBadge
          status={complianceVerified && level2Complete ? 'verified' : 'pending'}
          label={complianceVerified && level2Complete ? 'Ready to apply' : 'Blocked'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <GateRow
          ok={level2Complete}
          label="Level 2 profile complete"
          detail={level2Complete ? 'Description and TRL stage present' : 'Add a description and TRL stage'}
        />
        <GateRow
          ok={complianceVerified}
          label="Compliance verified by admin"
          detail={
            complianceVerified
              ? `Verified ${fmtDateTime(profile.compliance_verified_at)}`
              : 'An admin reviews this from the compliance queue'
          }
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {checks.map((c) => (
          <div
            key={c.label}
            className="px-3 py-2 rounded-lg text-center"
            style={{
              backgroundColor: c.ok ? '#EAF7ED' : '#F8F6F1',
              border: `1px solid ${c.ok ? '#B8E6C4' : '#E8E2D5'}`,
            }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#A89F94]">{c.label}</div>
            <div
              className="text-xs font-bold mt-0.5"
              style={{ color: c.ok ? '#1E9E5A' : '#6B6560' }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
};

const GateRow: React.FC<{ ok: boolean; label: string; detail: string }> = ({ ok, label, detail }) => (
  <div
    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
    style={{
      backgroundColor: ok ? '#EAF7ED' : '#FDF3DC',
      border: `1px solid ${ok ? '#B8E6C4' : '#F7E1B5'}`,
    }}
  >
    <CheckCircle2
      className="w-4 h-4 shrink-0 mt-0.5"
      style={{ color: ok ? '#1E9E5A' : '#B8860B', opacity: ok ? 1 : 0.4 }}
    />
    <div>
      <div className="text-xs font-bold" style={{ color: ok ? '#1E9E5A' : '#B8860B' }}>
        {label}
      </div>
      <div className="text-[11px] text-[#6B6560]">{detail}</div>
    </div>
  </div>
);
