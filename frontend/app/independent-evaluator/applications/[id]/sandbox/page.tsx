'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StickyNote, DocButton, AlertStrip, SectionDivider
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { FlaskConical, CheckCircle2, ShieldAlert, Check, X, HelpCircle } from 'lucide-react';

export default function IndependentSandboxPage() {
  const [checks, setChecks] = useState({
    functional: true,
    directionalKpi: true,
    operationalFit: true,
    noRedFlags: true
  });

  const [verdict, setVerdict] = useState<'promising' | 'not_promising' | 'inconclusive' | null>(null);

  return (
    <AppLayout defaultRole={UserRole.INDEPENDENT_EVALUATOR}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Independent Sandbox Trial Evaluation"
          subtitle="Phase 10 — 4 Sandbox Verification Checks & Independent Verdict Assignment"
          role={UserRole.INDEPENDENT_EVALUATOR}
          stickyNote={
            <StickyNote color="yellow" title="Trial Gate">
              Completing sandbox verification determines pilot contract readiness or fallback sandbox path.
            </StickyNote>
          }
        />

        <DocumentForm
          title="Phase 10.3: 4 Sandbox Verification Checks"
          subtitle="Controlled Field Trial Evaluation Sheet"
          refNumber="SND-2024-009"
          role={UserRole.INDEPENDENT_EVALUATOR}
          watermark="SANDBOX"
        >
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3.5 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] cursor-pointer hover:border-[#1A1A1A] transition-colors">
                <span className="text-xs font-bold text-[#1A1A1A]">1. Functional & Technical Performance Check</span>
                <input
                  type="checkbox"
                  checked={checks.functional}
                  onChange={(e) => setChecks({ ...checks, functional: e.target.checked })}
                  className="w-4 h-4 accent-[#D2691E] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] cursor-pointer hover:border-[#1A1A1A] transition-colors">
                <span className="text-xs font-bold text-[#1A1A1A]">2. Directional KPI Benchmark Verification</span>
                <input
                  type="checkbox"
                  checked={checks.directionalKpi}
                  onChange={(e) => setChecks({ ...checks, directionalKpi: e.target.checked })}
                  className="w-4 h-4 accent-[#D2691E] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] cursor-pointer hover:border-[#1A1A1A] transition-colors">
                <span className="text-xs font-bold text-[#1A1A1A]">3. Operational Environment Fit Test</span>
                <input
                  type="checkbox"
                  checked={checks.operationalFit}
                  onChange={(e) => setChecks({ ...checks, operationalFit: e.target.checked })}
                  className="w-4 h-4 accent-[#D2691E] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] cursor-pointer hover:border-[#1A1A1A] transition-colors">
                <span className="text-xs font-bold text-[#1A1A1A]">4. Safety & Security Compliance (No Red Flags)</span>
                <input
                  type="checkbox"
                  checked={checks.noRedFlags}
                  onChange={(e) => setChecks({ ...checks, noRedFlags: e.target.checked })}
                  className="w-4 h-4 accent-[#D2691E] rounded cursor-pointer"
                />
              </label>
            </div>

            <SectionDivider label="Evaluator Verdict Decision" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setVerdict('promising')}
                className={`p-4 rounded-lg border font-bold text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  verdict === 'promising'
                    ? 'bg-[#EAF7ED] text-[#1E9E5A] border-[#1E9E5A] shadow-sm'
                    : 'bg-[#F8F6F1] text-[#6B6560] border-[#E8E2D5] hover:bg-[#EAF7ED] hover:text-[#1E9E5A]'
                }`}
              >
                <Check className="w-4 h-4" /> Verdict: Promising (Phase 10.4)
              </button>

              <button
                onClick={() => setVerdict('not_promising')}
                className={`p-4 rounded-lg border font-bold text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  verdict === 'not_promising'
                    ? 'bg-[#FBEAEC] text-[#C81E4A] border-[#C81E4A] shadow-sm'
                    : 'bg-[#F8F6F1] text-[#6B6560] border-[#E8E2D5] hover:bg-[#FBEAEC] hover:text-[#C81E4A]'
                }`}
              >
                <X className="w-4 h-4" /> Verdict: Not Promising (Phase 10.5)
              </button>

              <button
                onClick={() => setVerdict('inconclusive')}
                className={`p-4 rounded-lg border font-bold text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  verdict === 'inconclusive'
                    ? 'bg-[#FDF3DC] text-[#B8860B] border-[#B8860B] shadow-sm'
                    : 'bg-[#F8F6F1] text-[#6B6560] border-[#E8E2D5] hover:bg-[#FDF3DC] hover:text-[#B8860B]'
                }`}
              >
                <HelpCircle className="w-4 h-4" /> Verdict: Inconclusive (Phase 10.6)
              </button>
            </div>

            {verdict && (
              <AlertStrip
                type={verdict === 'promising' ? 'success' : verdict === 'not_promising' ? 'danger' : 'warning'}
                title={`Recorded Verdict: ${verdict.toUpperCase().replace('_', ' ')}`}
                message="Trial evaluation logged into immutable audit register."
              />
            )}
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
