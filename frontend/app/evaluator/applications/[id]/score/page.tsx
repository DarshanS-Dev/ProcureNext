'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, FormField, DocTextarea, DocButton,
  DataCard, StatusBadge, StickyNote, AlertStrip, SectionDivider, DocRow
} from '@/components/shared/DesignSystem';
import { Award, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CRITERIA = [
  { key: 'c1', label: 'Technical Innovation & Feasibility', desc: 'Edge AI vision accuracy & latency testing', max: 20 },
  { key: 'c2', label: 'Operational Suitability & Defense Fit', desc: 'Ruggedized hardware specs', max: 20 },
  { key: 'c3', label: 'Scalability & Deployment Readiness', desc: 'Time-to-scale estimates', max: 15 },
  { key: 'c4', label: 'Cost Efficiency & Value for Money', desc: 'Total cost of ownership analysis', max: 15 },
  { key: 'c5', label: 'Team Expertise & Track Record', desc: 'Domain expertise verification', max: 10 },
  { key: 'c6', label: 'IP & Legal Compliance', desc: 'Patent landscape, export control', max: 10 },
  { key: 'c7', label: 'Environmental & Safety Impact', desc: 'Compliance with safety standards', max: 10 },
] as const;

type ScoreKey = 'c1'|'c2'|'c3'|'c4'|'c5'|'c6'|'c7';

export default function EvaluatorScoringPage() {
  const [coiDeclared, setCoiDeclared] = useState(false);
  const [coiType, setCoiType] = useState<'none' | 'recuse' | null>(null);
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    c1: 18, c2: 17, c3: 13, c4: 12, c5: 9, c6: 8, c7: 4
  });
  const [justification, setJustification] = useState(
    'Demonstrated superior thermal edge processing with robust zero-bandwidth operation during live bench testing.'
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const totalMax = CRITERIA.reduce((a, c) => a + c.max, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <AppLayout defaultRole="evaluator">
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Technical Proposal Rubric Scoring"
          subtitle="Evaluate AeroTech Defense Labs · PS #26136 — Thermal Surveillance Drones"
          phase="Phase 7 · Evaluator"
          role="evaluator"
          breadcrumb={[
            { label: 'Evaluator', href: '/evaluator/dashboard' },
            { label: 'Applications', href: '/evaluator/assigned' },
            { label: 'Score' }
          ]}
          stickyNote={
            <StickyNote color="blue" rotate={-1} title="Blind Review">
              Funding band & commercial bids are hidden from this view (Rule 7.5).
            </StickyNote>
          }
        />

        {/* Rule 7.5 Lock Notice */}
        <AlertStrip type="lock">
          <strong>Rule 7.5 Compliance Active:</strong> Startup financial funding band, risk profile, and commercial bid amounts are strictly hidden from all Evaluator views. Scores must be based solely on technical merits.
        </AlertStrip>

        {/* Phase 7.2 COI Gate */}
        <AnimatePresence mode="wait">
          {!coiDeclared ? (
            <motion.div
              key="coi-gate"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <DocumentForm
                title="Conflict of Interest Declaration"
                subtitle="Phase 7.2 — Mandatory Gate before Scoring"
                refNumber="FORM-COI-7.2"
                role="evaluator"
                stampLabel="Required"
              >
                <AlertStrip type="error">
                  You must declare any personal, financial, or organizational conflict of interest regarding <strong>AeroTech Defense Labs</strong> before scoring is unlocked.
                </AlertStrip>

                <SectionDivider label="Declaration" />

                <div className="flex flex-col sm:flex-row gap-3">
                  <DocButton
                    variant="primary"
                    role="evaluator"
                    size="md"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => { setCoiDeclared(true); setCoiType('none'); }}
                    className="flex-1 justify-center"
                  >
                    Declare NO Conflict of Interest
                  </DocButton>

                  <DocButton
                    variant="danger"
                    size="md"
                    icon={<ShieldAlert className="w-4 h-4" />}
                    onClick={() => { setCoiDeclared(true); setCoiType('recuse'); }}
                    className="flex-1 justify-center"
                  >
                    Declare Conflict & Recuse Self
                  </DocButton>
                </div>
              </DocumentForm>
            </motion.div>
          ) : coiType === 'recuse' ? (
            <motion.div key="recused" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AlertStrip type="warning">
                <strong>Recusal Logged.</strong> Admin has been notified for evaluator panel replacement. This application has been returned to the assignment queue (Phase 7.6).
              </AlertStrip>
            </motion.div>
          ) : (
            <motion.div
              key="scorecard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {isSubmitted ? (
                <AlertStrip type="success">
                  <strong>Scores submitted!</strong> Total Technical Score: {totalScore} / {totalMax} points. Rubric locked and forwarded to Officer for Decision Readiness review.
                </AlertStrip>
              ) : null}

              <DocumentForm
                title="7-Criterion Rubric Scorecard"
                subtitle="Technical Evaluation — AeroTech Defense Labs"
                refNumber="FORM-EVL-7.4"
                role="evaluator"
                watermark="EVALUATOR"
                stampLabel="COI Cleared ✓"
              >
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Score rows */}
                  <div className="space-y-2">
                    {CRITERIA.map((c, i) => (
                      <motion.div
                        key={c.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 px-4 py-3 rounded-lg"
                        style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E2D5' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#1A1A1A]">
                            {i + 1}. {c.label}
                          </div>
                          <div className="text-[11px] text-[#A89F94]">{c.desc}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={c.max}
                            value={scores[c.key]}
                            onChange={(e) => setScores({ ...scores, [c.key]: parseInt(e.target.value) || 0 })}
                            className="w-14 text-center text-sm font-bold rounded-lg py-1.5 focus:outline-none"
                            style={{ backgroundColor: '#fff', border: '1.5px solid #BFD7F8', color: '#2563EB' }}
                          />
                          <span className="text-[11px] text-[#A89F94]">/ {c.max}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Score total */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ backgroundColor: '#E9F1FB', border: '1px solid #BFD7F8' }}
                  >
                    <span className="text-xs font-bold text-[#1E3A8A]">Total Technical Score</span>
                    <span className="text-xl font-black" style={{ color: '#2563EB' }}>
                      {totalScore} <span className="text-sm text-[#A89F94]">/ {totalMax}</span>
                    </span>
                  </div>

                  <SectionDivider label="Mandatory Justification (Phase 7.4)" />

                  <FormField label="Scoring Justification Notes" required hint="Mandatory — your rationale is sealed with the score submission.">
                    <DocTextarea
                      rows={4}
                      required
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      lineStyle={true}
                    />
                  </FormField>

                  <DocButton
                    type="submit"
                    variant="primary"
                    role="evaluator"
                    size="lg"
                    className="w-full justify-center"
                    icon={<Award className="w-4 h-4" />}
                  >
                    Submit Rubric Scores (Phase 7.4)
                  </DocButton>
                </form>
              </DocumentForm>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
