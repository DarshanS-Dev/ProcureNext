'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { FlaskGauge } from '@/components/shared/Metaphors';
import {
  PageHeader, DocumentForm, DataCard, StickyNote, DocButton, AlertStrip
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { CheckCircle2, BarChart3, Award } from 'lucide-react';

export default function IndependentKPIVerdictsPage() {
  const [verdictsSubmitted, setVerdictsSubmitted] = useState(false);

  return (
    <AppLayout defaultRole={UserRole.INDEPENDENT_EVALUATOR}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="KPI Verdicts & Outcome Input"
          subtitle="Phase 12 — Independent KPI Verdict Submission & Scale/Iterate Recommendation"
          role={UserRole.INDEPENDENT_EVALUATOR}
          stickyNote={
            <StickyNote color="blue" title="Final Verdict">
              Submitting these KPI verdicts transitions Application.status to completed and unlocks officer scale recommendations.
            </StickyNote>
          }
        />

        {verdictsSubmitted && (
          <AlertStrip
            type="success"
            title="KPI Verdicts Recorded"
            message="Application.status → completed. Officer Pilot Outcome tab is now unblocked!"
          />
        )}

        <DocumentForm
          title="Phase 12.1 Independent KPI Verdict Gauges"
          subtitle="Empirical Telemetry Verification Scorecard"
          refNumber="VRD-2024-89"
          role={UserRole.INDEPENDENT_EVALUATOR}
          watermark="VERDICT"
        >
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataCard>
                <FlaskGauge actual={48} target={30} metricName="Continuous Flight Patrol Range" unit="km" />
              </DataCard>
              <DataCard>
                <FlaskGauge actual={98.4} target={95} metricName="Thermal Vision Target Detection Accuracy" unit="%" />
              </DataCard>
            </div>

            <DocButton
              variant="primary"
              role={UserRole.INDEPENDENT_EVALUATOR}
              size="lg"
              className="w-full"
              icon={<Award className="w-4 h-4" />}
              onClick={() => setVerdictsSubmitted(true)}
            >
              Submit Independent KPI Verdicts (Phase 12.1)
            </DocButton>
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
