'use client';

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip, DataCard, PageHeader } from '@/components/shared/DesignSystem';
import { QuickLink } from '@/components/shared/Dashboard';
import { PanelHeading } from '@/components/panels/ApplicationPanels';

export default function IndependentEvaluatorDashboardPage() {
  return (
    <AppLayout allow="independent_evaluator">
      <div className="space-y-6">
        <PageHeader
          title="Independent Evaluator Overview"
          subtitle="Verification work: sandbox trials, milestone evidence and KPI verdicts."
          role="independent-evaluator"
          breadcrumb={[{ label: 'Independent evaluator' }, { label: 'Overview' }]}
        />

        <AlertStrip
          type="info"
          title="No queue to show"
          message="The API exposes no route that lists the applications or contracts assigned to an independent evaluator, so there is no caseload to count here. Open work by application id."
        />

        <DataCard>
          <PanelHeading title="What you verify" endpoint="Layer 5 — Execution" />
          <ol className="space-y-3">
            {[
              {
                n: 1,
                title: 'Sandbox trial',
                body: 'Four checks — functional, directional KPI, operational fit, no red flags — then a verdict of promising, not promising or inconclusive. Leave the verdict blank and the service computes it from the checks.',
              },
              {
                n: 2,
                title: 'Milestone review',
                body: 'The startup submits evidence against each of the five fixed pilot milestones. You accept or reject, and set whether payment is due.',
              },
              {
                n: 3,
                title: 'KPI verdicts',
                body: 'One met / not-met verdict per KPI on the problem statement, recorded as either a desk review or a field visit, with your justification.',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                  style={{
                    backgroundColor: '#FBEFE6',
                    color: '#D2691E',
                    border: '1px solid #F0CDB5',
                  }}
                >
                  {step.n}
                </span>
                <div>
                  <div className="text-xs font-bold text-[#1A1A1A]">{step.title}</div>
                  <p className="text-[11px] text-[#6B6560] leading-relaxed mt-0.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </DataCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickLink
            role="independent-evaluator"
            href="/independent-evaluator/applications"
            title="Open verification work"
            description="Enter an application id to reach its sandbox trial, milestones and KPI verdicts."
          />
        </div>
      </div>
    </AppLayout>
  );
}
