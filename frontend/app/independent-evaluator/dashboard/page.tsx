'use client';

/**
 * Independent evaluator overview.
 *
 * The API has no route listing an IE's caseload, so this page does not invent
 * one. Instead it shows the verification pipeline the IE works through — the
 * same stepper shape used for milestones — and the fixed rules they apply.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { QuickLink } from '@/components/shared/Dashboard';
import {
  Card,
  HeroCard,
  IconBadge,
  PageHeader,
  ScopeNote,
  StatPill,
  Stepper,
} from '@/components/shared/design-system';
import { CheckCircle2, ClipboardCheck, FlaskConical, Gauge, Microscope, Search, Sliders } from 'lucide-react';

const STAGES = [
  {
    title: 'Sandbox trial',
    icon: <FlaskConical className="w-4 h-4" />,
    body: 'Four checks — functional, directional KPI, operational fit, no red flags — then a verdict. Leave the verdict blank and the service derives it from the checks.',
    tags: ['4 checks', 'verdict'],
  },
  {
    title: 'Milestone review',
    icon: <ClipboardCheck className="w-4 h-4" />,
    body: 'The startup submits evidence against each of the five fixed milestones. You accept or reject, and set payment status in the same call.',
    tags: ['5 milestones', 'payment'],
  },
  {
    title: 'KPI verdicts',
    icon: <Gauge className="w-4 h-4" />,
    body: 'One met / not-met verdict per KPI, recorded as a desk review or field visit, with justification. All met = pilot success.',
    tags: ['met / not met', 'mode'],
  },
];

export default function IndependentEvaluatorDashboardPage() {
  return (
    <AppLayout allow="independent_evaluator">
      <div className="space-y-6 pb-12">
        <PageHeader
          line1="Independent"
          glyph={<Sliders className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Verification"
          line2="and"
          accentGlyph={<Microscope className="w-5 h-5" />}
          line2Tail="Evidence"
        />

        {/* Addition 1 — the verification pipeline, as the shared stepper. */}
        <Card icon={<CheckCircle2 className="w-4 h-4" />} label="Verification Pipeline" aside={<StatPill>3 stages</StatPill>}>
          <Stepper
            className="mt-2"
            steps={[
              { label: 'Sandbox trial', state: 'pre-selection', tone: 'active' },
              { label: 'Milestone review', state: 'during pilot', tone: 'pending' },
              { label: 'KPI verdicts', state: 'pilot close', tone: 'pending' },
              { label: 'Officer decides', state: 'scale / iterate / stop', tone: 'pending' },
            ]}
          />
        </Card>

        {/* Addition 2 — what each stage asks of you, one card each. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STAGES.map((stage, idx) => (
            <div key={stage.title} className="bg-white rounded-3xl border border-[#E5E5E0] shadow-sm p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <IconBadge icon={stage.icon} tone={idx === 0 ? 'accent' : 'muted'} />
                <span className="text-3xl font-black text-[#E5E5E0]">0{idx + 1}</span>
              </div>
              <h3 className="text-base font-black text-[#18181B] tracking-tight">{stage.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">{stage.body}</p>
              <div className="flex gap-1.5 flex-wrap">
                {stage.tags.map((t) => (
                  <StatPill key={t} tone="ghost">{t}</StatPill>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HeroCard
            icon={<Search className="w-4 h-4" />}
            label="Start here"
            title="Open work by application id"
            body="Enter an id to reach its sandbox trial, milestones and KPI verdicts."
            action={{ label: 'Pending Reviews', href: '/independent-evaluator/applications' }}
          />
          <QuickLink
            href="/independent-evaluator/applications"
            title="Verification workspace"
            description="Sandbox, milestone and KPI panels for one application."
            icon={<FlaskConical className="w-5 h-5" />}
          />
        </div>

        <ScopeNote>
          There is no route that lists the applications or contracts assigned to an
          independent evaluator, so this page shows no caseload count rather than a
          made-up one.
        </ScopeNote>
      </div>
    </AppLayout>
  );
}
