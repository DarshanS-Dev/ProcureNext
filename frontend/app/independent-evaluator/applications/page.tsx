'use client';

/**
 * Entry point for independent-evaluator verification work.
 *
 * Like the evaluator, this role cannot enumerate applications: GET /applications
 * only accepts an officer/admin problem-statement filter or a startup's own id.
 * Everything the independent evaluator does — sandbox trials, milestone reviews,
 * KPI verdicts — hangs off an application id supplied by the officer running the
 * pilot, so this page takes that id and opens the verification workspace.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocInput,
} from '@/components/shared/DesignSystem';
import {
  Card,
  PageHeader as Header,
  StatPill,
  Stepper,
} from '@/components/shared/design-system';

import { AppLayout } from '@/components/shared/AppLayout';
import { ArrowRight, Clock, Microscope } from 'lucide-react';

const RECENT_KEY = 'procurenext.ie.recent';

export default function IndependentEvaluatorApplicationsPage() {
  const router = useRouter();
  const [appId, setAppId] = useState('');
  const [recent, setRecent] = useState<number[]>([]);

  // A small local convenience so the same handful of pilots are one click away.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as number[]);
    } catch {
      /* private mode or blocked storage — the page works without it */
    }
  }, []);

  const open = (id: number) => {
    try {
      const next = [id, ...recent.filter((r) => r !== id)].slice(0, 8);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    router.push(`/independent-evaluator/applications/${id}`);
  };

  return (
    <AppLayout allow="independent_evaluator">
      <div className="space-y-6 max-w-3xl">
        <Header
          line1="Verification"
          glyph={<Microscope className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Work"
          subtitle="Open the application you have been asked to verify."
        />

        <Card label="What opens" aside={<StatPill>per application</StatPill>}>
          <Stepper
            steps={[
              { label: 'Sandbox trial', state: 'application', tone: 'active' },
              { label: 'Milestones', state: 'contract', tone: 'pending' },
              { label: 'KPI verdicts', state: 'contract', tone: 'pending' },
            ]}
          />
        </Card>

        <DataCard>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const id = Number(appId.trim());
              if (Number.isFinite(id) && id > 0) open(id);
            }}
          >
            <div>
              <h3 className="text-sm font-bold text-[#18181B]">Open an application</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Sandbox trials attach to an application; milestones and KPI verdicts
                attach to its contract. Both are reached from the application id.
              </p>
            </div>

            <div className="flex gap-2 items-end max-w-sm">
              <div className="flex-1">
                <DocInput
                  lineStyle={false}
                  type="number"
                  min={1}
                  placeholder="Application id"
                  aria-label="Application id"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>
              <DocButton
                type="submit"
                size="sm"
                variant="primary"
                role="independent-evaluator"
                disabled={!appId.trim()}
                icon={<ArrowRight className="w-3 h-3" />}
              >
                Open
              </DocButton>
            </div>
          </form>

          {recent.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#F0F0EA]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">
                <Clock className="w-3 h-3" /> Recently opened
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((id) => (
                  <button
                    key={id}
                    onClick={() => open(id)}
                    className="px-4 py-2 rounded-full text-[11px] font-bold cursor-pointer transition-colors bg-white border border-[#E5E5E0] text-[#18181B] hover:bg-[#D7FD44] hover:border-[#C3EB30]"
                  >
                    Application #{id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DataCard>

        <AlertStrip
          type="info"
          title="Why there is no list here"
          message="The API has no route that returns the applications assigned to an independent evaluator — GET /applications is restricted to the owning officer, an admin, or the startup itself. Until such a route exists, the officer running the pilot passes you the ids."
        />
      </div>
    </AppLayout>
  );
}
