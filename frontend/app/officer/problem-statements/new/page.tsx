'use client';

/**
 * POST /problem-statements — creates a draft.
 *
 * AI assist is deliberately not on this page: POST /problem-statements/{id}/
 * ai-assist is keyed to an existing row, so it lives on the detail page once the
 * draft exists.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DocButton,
  DocInput,
  DocSelect,
  DocTextarea,
  DocumentForm,
  FormField,
  PageHeader,
  SectionDivider,
} from '@/components/shared/DesignSystem';
import { humanize } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation } from '@/lib/hooks/useApi';
import {
  BUDGET_RANGE_VALUES,
  BudgetRangeEnum,
  CATEGORY_VALUES,
  CategoryEnum,
} from '@/lib/types/api';
import { FilePlus2 } from 'lucide-react';

const parseList = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default function NewProblemStatementPage() {
  const router = useRouter();
  const create = useMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryEnum>('healthcare');
  const [targetBeneficiaries, setTargetBeneficiaries] = useState('');
  const [baseline, setBaseline] = useState('');
  const [target, setTarget] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState('');
  const [measurementPeriod, setMeasurementPeriod] = useState('');
  const [budgetRange, setBudgetRange] = useState<BudgetRangeEnum | ''>('');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [sensitivityFlags, setSensitivityFlags] = useState('');
  const [successCondition, setSuccessCondition] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.run(
      () =>
        api.createProblemStatement({
          title,
          description: description || null,
          category,
          target_beneficiaries: targetBeneficiaries || null,
          baseline: baseline || null,
          target: target || null,
          measurement_method: measurementMethod || null,
          measurement_period: measurementPeriod || null,
          budget_range: budgetRange || null,
          budget_description: budgetDescription || null,
          sensitivity_flags: sensitivityFlags ? parseList(sensitivityFlags) : null,
          success_condition: successCondition || null,
          additional_required_documents: requiredDocuments ? parseList(requiredDocuments) : null,
        }),
      {
        successMessage: 'Draft created.',
        onSuccess: (ps) => router.push(`/officer/problem-statements/${ps.id}`),
      },
    );
  };

  return (
    <AppLayout allow="officer">
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="New Problem Statement"
          subtitle="Creates a draft. Nothing is visible to startups until you publish it."
          phase="Layer 2 · Problem statement"
          role="officer"
          breadcrumb={[
            { label: 'Officer', href: '/officer/dashboard' },
            { label: 'Problem statements', href: '/officer/problem-statements' },
            { label: 'New' },
          ]}
        />

        <DocumentForm
          title="Problem Statement Draft"
          subtitle="POST /problem-statements"
          refNumber="PS-NEW"
          role="officer"
        >
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <FormField label="Title" required>
              <DocInput
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The outcome you need, not the technology you imagine"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Category" required>
                <DocSelect
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryEnum)}
                  required
                >
                  {CATEGORY_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {humanize(c)}
                    </option>
                  ))}
                </DocSelect>
              </FormField>

              <FormField
                label="Budget range"
                hint="Feeds the financial and implementation risk grids."
              >
                <DocSelect
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value as BudgetRangeEnum | '')}
                >
                  <option value="">Not set</option>
                  {BUDGET_RANGE_VALUES.map((b) => (
                    <option key={b} value={b}>
                      {humanize(b)}
                    </option>
                  ))}
                </DocSelect>
              </FormField>
            </div>

            <FormField label="Description">
              <DocTextarea
                rows={4}
                lineStyle
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <FormField label="Target beneficiaries">
              <DocInput
                value={targetBeneficiaries}
                onChange={(e) => setTargetBeneficiaries(e.target.value)}
                placeholder="Who is better off if this works"
              />
            </FormField>

            <SectionDivider label="How success is measured" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Baseline" hint="Where things stand today.">
                <DocInput value={baseline} onChange={(e) => setBaseline(e.target.value)} />
              </FormField>
              <FormField label="Target" hint="Where they need to get to.">
                <DocInput value={target} onChange={(e) => setTarget(e.target.value)} />
              </FormField>
              <FormField label="Measurement method">
                <DocInput
                  value={measurementMethod}
                  onChange={(e) => setMeasurementMethod(e.target.value)}
                />
              </FormField>
              <FormField label="Measurement period">
                <DocInput
                  value={measurementPeriod}
                  onChange={(e) => setMeasurementPeriod(e.target.value)}
                  placeholder="e.g. 12 weeks"
                />
              </FormField>
            </div>

            <FormField label="Success condition" hint="The single condition that decides scale vs stop.">
              <DocTextarea
                rows={2}
                value={successCondition}
                onChange={(e) => setSuccessCondition(e.target.value)}
              />
            </FormField>

            <SectionDivider label="Procurement detail" />

            <FormField label="Budget narrative">
              <DocTextarea
                rows={2}
                value={budgetDescription}
                onChange={(e) => setBudgetDescription(e.target.value)}
              />
            </FormField>

            <FormField label="Sensitivity flags" hint="Comma separated — e.g. personal_data, critical_infrastructure">
              <DocInput
                value={sensitivityFlags}
                onChange={(e) => setSensitivityFlags(e.target.value)}
              />
            </FormField>

            <FormField
              label="Additional required documents"
              hint="Comma separated. These become checklist items on every application."
            >
              <DocInput
                value={requiredDocuments}
                onChange={(e) => setRequiredDocuments(e.target.value)}
                placeholder="Data protection plan, Deployment references"
              />
            </FormField>

            <SectionDivider label="Create" />

            {create.error && (
              <AlertStrip type="error" title="Not created" message={create.error.detail} />
            )}

            <AlertStrip
              type="info"
              message="After creating the draft you can run AI assist on it, attach KPIs, and publish — all from its detail page."
            />

            <DocButton
              type="submit"
              variant="primary"
              role="officer"
              size="lg"
              className="w-full"
              loading={create.pending}
              icon={<FilePlus2 className="w-4 h-4" />}
            >
              Create draft
            </DocButton>
          </form>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
