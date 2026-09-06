'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, FormField, DocInput, DocTextarea, DocSelect, DocButton,
  DataCard, StatusBadge, StickyNote, AlertStrip, SectionDivider
} from '@/components/shared/DesignSystem';
import { Rocket, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StartupProfilePage() {
  const [activeTab, setActiveTab] = useState<'level1' | 'level2'>('level1');
  const [companyName, setCompanyName] = useState('AeroTech Defense Labs Pvt Ltd');
  const [dpiitNumber, setDpiitNumber] = useState('DPIIT-98234-IN');
  const [email, setEmail] = useState('founder@aerotech.io');
  const [phone, setPhone] = useState('+91 9876543210');
  const [capabilities, setCapabilities] = useState('Autonomous AI Drone Navigation, Thermal Vision, Obstacle Avoidance');
  const [fundingBand, setFundingBand] = useState('Series A ($2.5M)');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const TABS = [
    { id: 'level1', label: 'Level 1 — Basic Info', phase: 'Phase 1.3' },
    { id: 'level2', label: 'Level 2 — Capability Profile', phase: 'Phase 1.4' },
  ] as const;

  return (
    <AppLayout defaultRole="startup">
      <div className="space-y-6">
        <PageHeader
          title="Startup Profile & Verification"
          subtitle="Complete your registration to unlock funding opportunities and PS matching."
          phase="Phase 1 · Startup"
          role="startup"
          breadcrumb={[{ label: 'Startup', href: '/startup/dashboard' }, { label: 'Profile' }]}
          actions={
            <DocButton
              variant="primary"
              role="startup"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => window.location.href = '/startup/discover'}
            >
              Proceed to PS Discovery
            </DocButton>
          }
          stickyNote={
            <StickyNote color="green" rotate={1} title="Next step">
              Fill Level 2 capabilities to unlock invite-based matching!
            </StickyNote>
          }
        />

        {isSaved && (
          <AlertStrip type="success">
            Profile snapshot saved! Level {activeTab === 'level1' ? '1' : '2'} data synced via PATCH endpoint.
          </AlertStrip>
        )}

        {/* Completion progress */}
        <DataCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1A1A1A]">Profile Completion</span>
            <span className="text-xs font-bold text-[#1E9E5A]">85%</span>
          </div>
          <div className="h-2 bg-[#EAF7ED] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: '#1E9E5A' }}
            />
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#1E9E5A' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Level 1 Complete
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#B8860B]">
              ⚠ Level 2 Incomplete
            </div>
          </div>
        </DataCard>

        {/* Tab Selector */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              style={activeTab === tab.id
                ? { backgroundColor: '#EAF7ED', color: '#1E9E5A', border: '1.5px solid #B8E6C4' }
                : { backgroundColor: '#fff', color: '#6B6560', border: '1px solid #E8E2D5' }
              }
            >
              <span className="text-[10px] text-[#A89F94] block">{tab.phase}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <DocumentForm
          title={activeTab === 'level1' ? 'Company Registration Details' : 'Technical Capability Profile'}
          subtitle={activeTab === 'level1' ? 'DPIIT Verified Registration Record' : 'Procurement Matching & Risk Profile'}
          refNumber={activeTab === 'level1' ? 'FORM-STR-L1' : 'FORM-STR-L2'}
          role="startup"
          watermark={activeTab === 'level1' ? 'DPIIT' : 'CONFIDENTIAL'}
          stampLabel={activeTab === 'level1' ? 'Level 1' : 'Level 2 Mandatory'}
        >
          <form onSubmit={handleSave} className="space-y-5">
            {activeTab === 'level1' ? (
              <>
                <FormField label="Company Registered Name" required>
                  <DocInput
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </FormField>

                <FormField label="DPIIT Registration Certificate Number" required>
                  <DocInput
                    type="text"
                    required
                    value={dpiitNumber}
                    onChange={(e) => setDpiitNumber(e.target.value)}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-5">
                  <FormField label="Primary Contact Email" required>
                    <DocInput
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Primary Contact Phone" required>
                    <DocInput
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </FormField>
                </div>
              </>
            ) : (
              <>
                <FormField label="Technical Capabilities Summary" required hint="Describe your core technology and domain expertise.">
                  <DocTextarea
                    rows={4}
                    required
                    value={capabilities}
                    onChange={(e) => setCapabilities(e.target.value)}
                    lineStyle={true}
                  />
                </FormField>

                <FormField
                  label="Financial Risk Input — Funding Band"
                  required
                  classified
                  hint="Used exclusively for risk profiling. Hidden from Evaluator rubric score sheets (Rule 7.5)."
                >
                  <DocSelect
                    value={fundingBand}
                    onChange={(e) => setFundingBand(e.target.value)}
                  >
                    <option value="Bootstrapped">Bootstrapped / Seed (&lt;$500k)</option>
                    <option value="Series A ($2.5M)">Series A ($2.5M)</option>
                    <option value="Series B+ ($10M+)">Series B+ ($10M+)</option>
                  </DocSelect>
                </FormField>
              </>
            )}

            <SectionDivider label="Submit" />
            <DocButton type="submit" variant="primary" role="startup" icon={<Rocket className="w-3.5 h-3.5" />}>
              Save Profile Snapshot
            </DocButton>
          </form>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
