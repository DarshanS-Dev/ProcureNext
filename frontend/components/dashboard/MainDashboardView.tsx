'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api/client';
import {
  UserRole, ProblemStatementRead, ApplicationRead, AuditLogRead
} from '@/lib/types/api';
import {
  PageHeader, DataCard, MetricCard, StatusBadge, StickyNote, DocLinkButton, DocButton, DocRow, AlertStrip
} from '@/components/shared/DesignSystem';
import {
  FileText, Activity, Zap, CheckCircle, ArrowRight, FolderOpen,
  Send, User, Search, PenLine, ClipboardCheck, Scale, FlaskConical,
  BarChart2, Users2, ScrollText, ShieldCheck, FileX2
} from 'lucide-react';
import Link from 'next/link';

interface MainDashboardViewProps {
  role: UserRole;
  onNavigateToApp: (appId: number) => void;
}

const ROLE_DASHBOARD_TITLES: Record<UserRole, { greeting: string; subtitle: string; phase: string }> = {
  startup:              { greeting: 'Startup Portal', subtitle: 'Track your applications and discover new opportunities.', phase: 'Phase 1–5' },
  officer:              { greeting: 'Officer Command Centre', subtitle: 'Manage problem statements, review applications and track pipeline.', phase: 'Phase 3–9' },
  evaluator:            { greeting: 'Evaluator Panel', subtitle: 'Review assigned applications and submit rubric scores.', phase: 'Phase 7–8' },
  'independent-evaluator': { greeting: 'Sandbox Review Console', subtitle: 'Verify sandbox outcomes and submit KPI verdicts.', phase: 'Phase 10–12' },
  admin:                { greeting: 'Platform Administration', subtitle: 'Oversee compliance, governance and the complete audit trail.', phase: 'Phase 0 & 13–14' },
};

const METRICS: Record<UserRole, { label: string; value: string; icon: React.ReactNode; trend?: string; trendUp?: boolean }[]> = {
  startup: [
    { label: 'Open Problem Statements', value: '18', icon: <FileText className="w-4 h-4" />, trend: '3 new this week', trendUp: true },
    { label: 'My Applications', value: '2', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Invites Received', value: '1', icon: <Zap className="w-4 h-4" /> },
    { label: 'Profile Completeness', value: '85%', icon: <CheckCircle className="w-4 h-4" />, trend: 'Level 2 needed', trendUp: false },
  ],
  officer: [
    { label: 'Open Problem Statements', value: '18', icon: <FileText className="w-4 h-4" /> },
    { label: 'Applications Received', value: '245', icon: <Activity className="w-4 h-4" />, trend: '+12 this week', trendUp: true },
    { label: 'Active Pilots', value: '14', icon: <Zap className="w-4 h-4" /> },
    { label: 'Compliance Rate', value: '88%', icon: <CheckCircle className="w-4 h-4" />, trend: 'Up from 82%', trendUp: true },
  ],
  evaluator: [
    { label: 'Assigned for Review', value: '6', icon: <FileText className="w-4 h-4" /> },
    { label: 'Scored This Cycle', value: '4', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Avg Technical Score', value: '78/100', icon: <Activity className="w-4 h-4" /> },
    { label: 'COI Declarations', value: '100%', icon: <CheckCircle className="w-4 h-4" /> },
  ],
  'independent-evaluator': [
    { label: 'Sandbox Trials Active', value: '3', icon: <Activity className="w-4 h-4" /> },
    { label: 'KPI Verdicts Due', value: '2', icon: <FileText className="w-4 h-4" /> },
    { label: 'Milestones Reviewed', value: '7', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Avg Verdict Score', value: '91%', icon: <Zap className="w-4 h-4" /> },
  ],
  admin: [
    { label: 'Total Registered Users', value: '312', icon: <Activity className="w-4 h-4" />, trend: '+8 this month', trendUp: true },
    { label: 'Compliance Completeness', value: '88%', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Active Pilots', value: '14', icon: <Zap className="w-4 h-4" /> },
    { label: 'Audit Events Today', value: '24', icon: <FileText className="w-4 h-4" /> },
  ],
};

export const MainDashboardView: React.FC<MainDashboardViewProps> = ({ role, onNavigateToApp }) => {
  const [psList, setPsList] = useState<ProblemStatementRead[]>([]);
  const [logs, setLogs] = useState<AuditLogRead[]>([]);

  useEffect(() => {
    api.getProblemStatements().then(setPsList);
    api.getAuditLogs().then(setLogs);
  }, [role]);

  const info = ROLE_DASHBOARD_TITLES[role];
  const metrics = METRICS[role];

  return (
    <div className="space-y-6">
      <PageHeader
        title={info.greeting}
        subtitle={info.subtitle}
        phase={info.phase}
        role={role}
        stickyNote={
          role === 'officer' ? (
            <StickyNote color="yellow" rotate={-1} title="Quick tip">
              Publish a new Problem Statement to open the next procurement cycle.
            </StickyNote>
          ) : role === 'startup' ? (
            <StickyNote color="blue" rotate={1} title="Reminder">
              Complete Level 2 profile to unlock invite matching!
            </StickyNote>
          ) : undefined
        }
        actions={
          role === 'officer' ? (
            <DocLinkButton href="/officer/problem-statements/new" role="officer" icon={<FileText className="w-3.5 h-3.5" />}>
              New Problem Statement
            </DocLinkButton>
          ) : role === 'startup' ? (
            <DocLinkButton href="/startup/discover" role="startup" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              Discover PS
            </DocLinkButton>
          ) : undefined
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <MetricCard
              label={m.label}
              value={m.value}
              icon={<span className="text-lg">{m.icon}</span>}
              role={role}
              trend={m.trend}
              trendUp={m.trendUp}
            />
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Problem Statements / Applications */}
        <div className="lg:col-span-2 space-y-4">
          <DataCard noPad>
            <div className="px-5 py-4 border-b border-[#EDE7DB] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#A89F94]" />
                Active Problem Statements
              </h2>
              <span className="text-[11px] text-[#A89F94] font-medium">Cycle 2024 Q3</span>
            </div>

            {psList.length > 0 ? (
              <div className="divide-y divide-[#EDE7DB]">
                {psList.slice(0, 4).map((ps) => (
                  <DocRow
                    key={ps.id}
                    title={ps.title}
                    refNum={`PS #${ps.id}`}
                    subtitle={`${ps.domain} · Deadline: ${ps.submission_deadline}`}
                    badge={<StatusBadge status="published" />}
                    actions={
                      <DocButton
                        variant="secondary"
                        role={role}
                        size="sm"
                        onClick={() => onNavigateToApp(ps.id)}
                        icon={<ArrowRight className="w-3 h-3" />}
                      >
                        Open
                      </DocButton>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <FileX2 className="w-8 h-8 text-[#C4B9AE] mx-auto mb-2" />
                <p className="text-sm text-[#A89F94] font-medium">No problem statements yet.</p>
              </div>
            )}
          </DataCard>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Activity Feed */}
          <DataCard noPad>
            <div className="px-5 py-4 border-b border-[#EDE7DB] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#A89F94]" />
              <h2 className="text-sm font-bold text-[#1A1A1A]">Recent Activity</h2>
            </div>
            <div className="p-4 space-y-3">
              {logs.slice(0, 4).map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-[#F8F6F1] border border-[#E8E2D5] flex items-center justify-center shrink-0 mt-0.5">
                    <ScrollText className="w-3 h-3 text-[#A89F94]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[#1A1A1A] truncate">{log.details}</div>
                    <div className="text-[10px] text-[#A89F94]">{log.timestamp.substring(0, 10)}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </DataCard>

          {/* Quick Actions */}
          <DataCard>
            <h2 className="text-sm font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#A89F94]" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {role === 'startup' && (
                <>
                  <DocLinkButton href="/startup/applications/new?ps_id=1" role="startup" size="sm" className="w-full justify-center" icon={<Send className="w-3 h-3" />}>
                    Submit Proposal
                  </DocLinkButton>
                  <DocLinkButton href="/startup/profile" variant="secondary" role="startup" size="sm" className="w-full justify-center" icon={<User className="w-3 h-3" />}>
                    Complete Profile
                  </DocLinkButton>
                  <DocLinkButton href="/startup/discover" variant="ghost" size="sm" className="w-full justify-center" icon={<Search className="w-3 h-3" />}>
                    Browse Problem Statements
                  </DocLinkButton>
                </>
              )}
              {role === 'officer' && (
                <>
                  <DocLinkButton href="/officer/problem-statements/new" role="officer" size="sm" className="w-full justify-center" icon={<PenLine className="w-3 h-3" />}>
                    Draft New PS
                  </DocLinkButton>
                  <DocLinkButton href="/officer/applications" variant="secondary" role="officer" size="sm" className="w-full justify-center" icon={<ClipboardCheck className="w-3 h-3" />}>
                    Review Applications
                  </DocLinkButton>
                </>
              )}
              {role === 'evaluator' && (
                <>
                  <DocLinkButton href="/evaluator/applications/1/score" role="evaluator" size="sm" className="w-full justify-center" icon={<Scale className="w-3 h-3" />}>
                    Score Application
                  </DocLinkButton>
                  <DocLinkButton href="/evaluator/assigned" variant="secondary" role="evaluator" size="sm" className="w-full justify-center" icon={<FileText className="w-3 h-3" />}>
                    Assigned List
                  </DocLinkButton>
                </>
              )}
              {role === 'independent-evaluator' && (
                <>
                  <DocLinkButton href="/independent-evaluator/applications/1/sandbox" role="independent-evaluator" size="sm" className="w-full justify-center" icon={<FlaskConical className="w-3 h-3" />}>
                    Sandbox Trial
                  </DocLinkButton>
                  <DocLinkButton href="/independent-evaluator/contracts/1/kpi-verdicts" variant="secondary" role="independent-evaluator" size="sm" className="w-full justify-center" icon={<BarChart2 className="w-3 h-3" />}>
                    KPI Verdicts
                  </DocLinkButton>
                </>
              )}
              {role === 'admin' && (
                <>
                  <DocLinkButton href="/admin/users" role="admin" size="sm" className="w-full justify-center" icon={<Users2 className="w-3 h-3" />}>
                    Manage Users
                  </DocLinkButton>
                  <DocLinkButton href="/admin/audit-log" variant="secondary" role="admin" size="sm" className="w-full justify-center" icon={<ScrollText className="w-3 h-3" />}>
                    View Audit Log
                  </DocLinkButton>
                  <DocLinkButton href="/admin/startups/compliance" variant="ghost" size="sm" className="w-full justify-center" icon={<ShieldCheck className="w-3 h-3" />}>
                    Compliance Queue
                  </DocLinkButton>
                </>
              )}
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  );
};
