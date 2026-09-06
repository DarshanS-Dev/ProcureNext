'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { useRouter } from 'next/navigation';
import {
  PageHeader, DocumentForm, FormField, DocInput, DocSelect, DocTextarea,
  DocButton, AlertStrip, StickyNote, SectionDivider, DataCard
} from '@/components/shared/DesignSystem';
import { Sparkles, PlusCircle, AlertOctagon } from 'lucide-react';

const CATEGORIES = [
  'Defense & Aerospace Systems',
  'Cybersecurity & Critical Infrastructure',
  'Autonomous Systems & Drones',
  'Renewable Energy & Smart Grid',
  'Healthcare & Medical Devices',
  'Urban Mobility & Logistics',
  'Fintech & Digital Governance'
];

export default function NewProblemStatementPage() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [baseline, setBaseline] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handleAiAssist = () => {
    setAiNotice('AI Advisory: Description contains technical-prescriptive phrases. Outcome-based focus is recommended. (Advisory only — does not block publishing.)');
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!baseline.trim() || !measurementMethod.trim()) {
      setErrorMessage('Hard Gate Blocked (Phase 3.3): Baseline metric and Measurement Method are mandatory fields before this Problem Statement can be published.');
      return;
    }
    setPublishing(true);
    setTimeout(() => router.push('/officer/problem-statements'), 1200);
  };

  return (
    <AppLayout defaultRole="officer">
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="New Problem Statement"
          subtitle="Draft a procurement challenge aligned to national innovation priorities."
          phase="Phase 3 · PS Builder"
          role="officer"
          breadcrumb={[
            { label: 'Officer', href: '/officer/dashboard' },
            { label: 'Problem Statements', href: '/officer/problem-statements' },
            { label: 'New' }
          ]}
          stickyNote={
            <StickyNote color="yellow" rotate={-2} title="Hard Gate Rule">
              Baseline + Measurement Method are mandatory before publishing.
            </StickyNote>
          }
        />

        {errorMessage && <AlertStrip type="error">{errorMessage}</AlertStrip>}
        {aiNotice && <AlertStrip type="warning">{aiNotice}</AlertStrip>}

        <DocumentForm
          title="Problem Statement Submission Form"
          subtitle="Government Procurement — Cycle 2024 Q3"
          refNumber="FORM-PS-NEW"
          role="officer"
          watermark="DRAFT"
          stampLabel="Officer Use Only"
        >
          <form onSubmit={handlePublish} className="space-y-6">

            <FormField label="Technology Category" required hint="Select from the closed enum of approved procurement categories.">
              <DocSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </DocSelect>
            </FormField>

            <FormField label="Problem Statement Title" required>
              <DocInput
                type="text"
                required
                placeholder="e.g. Autonomous Thermal Surveillance Drones for Border Patrol"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>

            <SectionDivider label="Mandatory Baseline (Phase 3.3 Hard Gate)" />

            {/* Baseline zone — styled as a special section */}
            <div
              className="p-5 rounded-xl space-y-4"
              style={{ backgroundColor: '#FDF3DC', border: '1px solid #F7E1B5' }}
            >
              <p className="text-[11px] font-bold text-[#B8860B] uppercase tracking-wider">
                ⚠ These fields enforce a hard publication gate — both are required.
              </p>

              <FormField label="Baseline Metric" required>
                <DocInput
                  lineStyle={false}
                  placeholder="e.g. Current manual patrol range: 12 km per shift"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                />
              </FormField>

              <FormField label="Measurement Method" required>
                <DocInput
                  lineStyle={false}
                  placeholder="e.g. Telemetry sensor logs & night field trials"
                  value={measurementMethod}
                  onChange={(e) => setMeasurementMethod(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Detailed Scope Description" required>
              <div className="flex justify-end mb-1.5">
                <button
                  type="button"
                  onClick={handleAiAssist}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#B8860B] hover:underline cursor-pointer uppercase tracking-wide"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Refine Check
                </button>
              </div>
              <DocTextarea
                rows={5}
                required
                placeholder="Describe operational requirements, performance targets, and success criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                lineStyle={true}
                className="leading-8"
              />
            </FormField>

            <SectionDivider label="Authorisation" />

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#A89F94] italic">
                Submission constitutes official procurement publication under PS 26136.
              </p>
              <DocButton
                type="submit"
                variant="primary"
                role="officer"
                size="lg"
                loading={publishing}
                icon={<PlusCircle className="w-4 h-4" />}
              >
                Publish Problem Statement
              </DocButton>
            </div>
          </form>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
