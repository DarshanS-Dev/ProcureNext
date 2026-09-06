'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { useRouter } from 'next/navigation';
import {
  PageHeader, DocumentForm, FormField, DocInput, DocSelect, DocTextarea,
  DocButton, AlertStrip, StickyNote, SectionDivider
} from '@/components/shared/DesignSystem';
import { Sparkles, PlusCircle, Trash2, BarChart3, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'Defense & Aerospace Systems',
  'Cybersecurity & Critical Infrastructure',
  'Autonomous Systems & Drones',
  'Renewable Energy & Smart Grid',
  'Healthcare & Medical Devices',
  'Urban Mobility & Logistics',
  'Fintech & Digital Governance'
];

const UNITS = ['km', '%', 'hrs', 'units', 'TPS', 'ms', 'kg', 'L/min', 'dB', 'custom'];

interface KPIDraft {
  id: string;
  metric_name: string;
  target_value: string;
  unit: string;
  verification_method: string;
}

const emptyKPI = (): KPIDraft => ({
  id: Math.random().toString(36).slice(2),
  metric_name: '',
  target_value: '',
  unit: 'km',
  verification_method: '',
});

export default function NewProblemStatementPage() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [baseline, setBaseline] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState('');
  const [description, setDescription] = useState('');
  const [kpis, setKpis] = useState<KPIDraft[]>([emptyKPI()]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handleAiAssist = () => {
    setAiNotice('AI Advisory: Description contains technical-prescriptive phrases. Outcome-based focus is recommended. (Advisory only — does not block publishing.)');
  };

  const addKPI = () => setKpis([...kpis, emptyKPI()]);

  const removeKPI = (id: string) => {
    if (kpis.length === 1) return; // keep at least one row
    setKpis(kpis.filter(k => k.id !== id));
  };

  const updateKPI = (id: string, field: keyof KPIDraft, value: string) => {
    setKpis(kpis.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!baseline.trim() || !measurementMethod.trim()) {
      setErrorMessage('Hard Gate Blocked (Phase 3.3): Baseline metric and Measurement Method are mandatory fields before this Problem Statement can be published.');
      return;
    }

    const invalidKpi = kpis.find(k => !k.metric_name.trim() || !k.target_value.trim());
    if (invalidKpi) {
      setErrorMessage('KPI Gate Blocked: Every KPI must have a Metric Name and Target Value. Remove empty rows or complete them before publishing.');
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
              Baseline + Measurement Method + at least 1 KPI are required before publishing.
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

            {/* Baseline zone */}
            <div
              className="p-5 rounded-xl space-y-4"
              style={{ backgroundColor: '#FDF3DC', border: '1px solid #F7E1B5' }}
            >
              <p className="text-[11px] font-bold text-[#B8860B] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                These fields enforce a hard publication gate — both are required.
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

            {/* ── KPI Section ─────────────────────────────────── */}
            <SectionDivider label="Success KPIs (Phase 3.4 — POST /kpis)" />

            <div
              className="p-5 rounded-xl space-y-4"
              style={{ backgroundColor: '#E9F1FB', border: '1px solid #BFD7F8' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <p className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">
                    KPI Success Metrics — used by IE for final verdicts (Phase 12)
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#2563EB] bg-white px-2 py-0.5 rounded border border-[#BFD7F8]">
                  {kpis.length} KPI{kpis.length !== 1 ? 's' : ''}
                </span>
              </div>

              <AnimatePresence>
                {kpis.map((kpi, i) => (
                  <motion.div
                    key={kpi.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 rounded-lg space-y-3"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #BFD7F8' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#A89F94] uppercase tracking-wider">KPI {i + 1}</span>
                      {kpis.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKPI(kpi.id)}
                          className="text-[#C81E4A] hover:text-[#9B1240] transition-colors cursor-pointer"
                          title="Remove KPI"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField label="Metric Name" required>
                        <DocInput
                          lineStyle={false}
                          placeholder="e.g. Continuous Flight Patrol Range"
                          value={kpi.metric_name}
                          onChange={(e) => updateKPI(kpi.id, 'metric_name', e.target.value)}
                        />
                      </FormField>

                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Target Value" required>
                          <DocInput
                            type="number"
                            lineStyle={false}
                            placeholder="e.g. 30"
                            value={kpi.target_value}
                            onChange={(e) => updateKPI(kpi.id, 'target_value', e.target.value)}
                          />
                        </FormField>
                        <FormField label="Unit" required>
                          <DocSelect
                            value={kpi.unit}
                            onChange={(e) => updateKPI(kpi.id, 'unit', e.target.value)}
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </DocSelect>
                        </FormField>
                      </div>
                    </div>

                    <FormField label="Verification Method" hint="How will the IE measure this in field trials?">
                      <DocInput
                        lineStyle={false}
                        placeholder="e.g. GPS telemetry logs from 3 independent night sorties"
                        value={kpi.verification_method}
                        onChange={(e) => updateKPI(kpi.id, 'verification_method', e.target.value)}
                      />
                    </FormField>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={addKPI}
                className="flex items-center gap-2 text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] uppercase tracking-wide cursor-pointer transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Another KPI
              </button>
            </div>
            {/* ── /KPI Section ─────────────────────────────────── */}

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
