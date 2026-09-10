'use client';

/**
 * POST /applications
 *
 * The endpoint takes `problem_statement_id` plus two free-form JSON blobs —
 * `technical_proposal` and `commercial_proposal` — not flat proposal columns.
 * This form collects named fields and submits them as those two objects, so the
 * shape stored is consistent and readable back on the detail page.
 *
 * The server rejects the submission unless the PS is published, Level 2 of the
 * profile is complete, and an admin has verified compliance; those failures come
 * back as 400s and are surfaced verbatim.
 */

import React, { Suspense, useState } from 'react';
import { DataCard } from '@/components/shared/DesignSystem';
import {
  HeroCard,
  IconBadge,
  PageHeader,
  ProgressCapsule,
  StatPill,
} from '@/components/shared/design-system';
import { Lock, Send } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DocButton,
  DocInput,
  DocSelect,
  DocTextarea,
  DocumentForm,
  FormField,
  SectionDivider,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, LoadingBlock, humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';

function NewApplicationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetPsId = searchParams.get('ps_id');

  const psQuery = useQuery(() => api.getProblemStatements(), []);
  const submit = useMutation();

  const [psId, setPsId] = useState(presetPsId ?? '');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [approach, setApproach] = useState('');
  const [timelineWeeks, setTimelineWeeks] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState('');
  const [assumptions, setAssumptions] = useState('');

  // Field presence only — nothing here is scored or sent anywhere.
  const COMPLETION_FIELDS = [
    psId,
    title,
    summary,
    approach,
    timelineWeeks,
    bidAmount,
    paymentSchedule,
    assumptions,
  ];
  const completion = COMPLETION_FIELDS.filter((v) => String(v).trim()).length;

  // Only published problem statements accept applications.
  const publishable = (psQuery.data ?? []).filter((ps) => ps.status === 'published');
  const selectedPs = publishable.find((ps) => String(ps.id) === psId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!psId) return;

    submit.run(
      () =>
        api.createApplication({
          problem_statement_id: Number(psId),
          technical_proposal: {
            title,
            summary,
            approach: approach || null,
            implementation_timeline_weeks: timelineWeeks ? Number(timelineWeeks) : null,
          },
          commercial_proposal: {
            bid_amount: bidAmount ? Number(bidAmount) : null,
            payment_schedule: paymentSchedule || null,
            assumptions: assumptions || null,
          },
        }),
      {
        successMessage: 'Application submitted.',
        onSuccess: (app) => router.push(`/startup/applications/${app.id}`),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        line1="Submit an"
        glyph={<Send className="w-5 h-5 text-[#18181B]" />}
        line1Tail="Application"
        subtitle="Technical and commercial proposal for one published problem statement."
      />

      {/* Sealed-bid notice. This states the real rule — the commercial proposal
          is hidden from evaluators until technical scoring locks — rather than
          dressing it up as an animation. */}
      <HeroCard
        icon={<Lock className="w-4 h-4" />}
        label="Sealed bid"
        aside={<StatPill tone="warn">Two envelopes</StatPill>}
        title="Your commercial bid stays sealed"
        body="Evaluators score the technical proposal without seeing your price. The commercial proposal is only unlocked once technical scoring is complete for this problem statement."
      />

      {/* Completion across the two proposals, live off form state. */}
      <DataCard>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <IconBadge size="sm" icon={<Send className="w-3.5 h-3.5" />} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#18181B]">
              Proposal completeness
            </span>
          </div>
          <StatPill tone={completion === COMPLETION_FIELDS.length ? 'ok' : 'ghost'}>
            {completion} / {COMPLETION_FIELDS.length}
          </StatPill>
        </div>
        <ProgressCapsule filled={completion} total={COMPLETION_FIELDS.length} />
        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
          Only the problem statement, title and summary are required to submit; the rest
          strengthens the bid.
        </p>
      </DataCard>

      {psQuery.loading && <LoadingBlock label="Loading problem statements…" />}
      {psQuery.error && <ApiErrorState error={psQuery.error} onRetry={psQuery.refetch} />}

      {psQuery.data && (
        <DocumentForm
          title="Application Docket"
          subtitle="POST /applications"
          refNumber="APP-NEW"
          role="startup"
        >
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <FormField label="Problem statement" required>
              <DocSelect
                value={psId}
                onChange={(e) => setPsId(e.target.value)}
                required
              >
                <option value="">Select a published problem statement…</option>
                {publishable.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    PS #{ps.id} — {ps.title} ({humanize(ps.category)})
                  </option>
                ))}
              </DocSelect>
            </FormField>

            {publishable.length === 0 && (
              <AlertStrip
                type="info"
                title="Nothing is open right now"
                message="Only published problem statements accept applications. Check back once an officer publishes one."
              />
            )}

            {selectedPs && (
              <div
                className="p-3.5 rounded-2xl space-y-1.5 text-xs"
                style={{ backgroundColor: '#F4F4EF', border: '1px solid #E5E5E0' }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  What this problem statement is measured on
                </div>
                <Detail label="Baseline" value={selectedPs.baseline} />
                <Detail label="Target" value={selectedPs.target} />
                <Detail label="Measurement" value={selectedPs.measurement_method} />
                <Detail label="Success condition" value={selectedPs.success_condition} />
                <Detail
                  label="Budget"
                  value={selectedPs.budget_range ? humanize(selectedPs.budget_range) : null}
                />
              </div>
            )}

            <SectionDivider label="Technical proposal" />

            <FormField label="Proposal title" required>
              <DocInput
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What you are proposing to deploy"
              />
            </FormField>

            <FormField label="Summary" required hint="What the solution does and the outcome it targets.">
              <DocTextarea
                rows={3}
                required
                lineStyle
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </FormField>

            <FormField label="Implementation approach" hint="How the pilot would actually run.">
              <DocTextarea rows={3} value={approach} onChange={(e) => setApproach(e.target.value)} />
            </FormField>

            <FormField label="Implementation timeline (weeks)">
              <DocInput
                type="number"
                min={1}
                value={timelineWeeks}
                onChange={(e) => setTimelineWeeks(e.target.value)}
              />
            </FormField>

            <SectionDivider label="Commercial proposal" />

            <FormField
              label="Bid amount (INR)"
              classified
              hint="Stays sealed until the officer unlocks the commercial stage."
            >
              <DocInput
                type="number"
                min={0}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </FormField>

            <FormField label="Payment schedule" hint="How you propose payment maps to milestones.">
              <DocTextarea
                rows={2}
                value={paymentSchedule}
                onChange={(e) => setPaymentSchedule(e.target.value)}
              />
            </FormField>

            <FormField label="Commercial assumptions">
              <DocTextarea
                rows={2}
                value={assumptions}
                onChange={(e) => setAssumptions(e.target.value)}
              />
            </FormField>

            <SectionDivider label="Submit" />

            {submit.error && (
              <AlertStrip
                type="error"
                title={
                  submit.error.status === 409
                    ? 'Already applied'
                    : submit.error.status === 400
                      ? 'Blocked by a submission gate'
                      : 'Submission failed'
                }
                message={submit.error.detail}
              />
            )}

            <AlertStrip
              type="info"
              title="What happens next"
              message="Submitting creates the application, snapshots an eligibility check against your verified compliance data, and generates the document checklist you then upload against."
            />

            <DocButton
              type="submit"
              variant="primary"
              role="startup"
              size="lg"
              className="w-full"
              loading={submit.pending}
              disabled={!psId}
              icon={<Send className="w-4 h-4" />}
            >
              Submit application
            </DocButton>
          </form>
        </DocumentForm>
      )}
    </div>
  );
}

const Detail: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-[10px] font-bold uppercase text-[#9CA3AF] w-32 shrink-0 pt-0.5">
      {label}
    </span>
    <span className="text-[#6B7280] flex-1">{value || '—'}</span>
  </div>
);

export default function NewApplicationPage() {
  return (
    <AppLayout allow="startup">
      {/* useSearchParams needs a Suspense boundary above it. */}
      <Suspense fallback={<LoadingBlock label="Loading form…" />}>
        <NewApplicationForm />
      </Suspense>
    </AppLayout>
  );
}
