'use client';

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip, PageHeader } from '@/components/shared/DesignSystem';
import { PillLink } from '@/components/shared/design-system';
import { QuickLink, Stat } from '@/components/shared/Dashboard';
import { api } from '@/lib/api/client';
import { useQuery } from '@/lib/hooks/useApi';
import { PlatformRules } from '@/components/admin/PlatformRules';
import { ShieldCheck, Users } from 'lucide-react';

export default function AdminDashboardPage() {
  const users = useQuery(() => api.getUsers(), []);
  const unverified = useQuery(() => api.getUnverifiedStartups(), []);
  const ps = useQuery(() => api.getProblemStatements(), []);

  const pending = unverified.data?.length ?? 0;

  return (
    <AppLayout allow="admin">
      <div className="space-y-6">
        <PageHeader
          title="Admin Overview"
          subtitle="Accounts, compliance verification, evaluator panels and audit records."
          actions={
            <PillLink
              href="/admin/startups/compliance"
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Compliance Queue
            </PillLink>
          }
        />

        {pending > 0 && (
          <AlertStrip
            type="warning"
            title={`${pending} startup${pending === 1 ? '' : 's'} awaiting compliance verification`}
            message="Until you verify them, these startups cannot submit an application at all."
          />
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            role="admin"
            label="Accounts"
            value={users.data?.length}
            loading={users.loading}
            error={users.error}
            hint={`${(users.data ?? []).filter((u) => u.role === 'startup').length} startups`}
            href="/admin/users"
            icon={<Users className="w-4 h-4" />}
          />
          <Stat
            role="admin"
            label="Awaiting verification"
            value={pending}
            loading={unverified.loading}
            error={unverified.error}
            hint="Blocked from applying"
            href="/admin/startups/compliance"
            icon={<ShieldCheck className="w-4 h-4" />}
            accent
          />
          <Stat
            role="admin"
            label="Problem statements"
            value={ps.data?.length}
            loading={ps.loading}
            error={ps.error}
            hint={`${(ps.data ?? []).filter((p) => p.status === 'published').length} published`}
            href="/admin/evaluators"
          />
          <Stat
            role="admin"
            label="Evaluators"
            value={(users.data ?? []).filter((u) => u.role === 'evaluator').length}
            loading={users.loading}
            error={users.error}
            hint="Available for panels"
            href="/admin/evaluators"
          />
        </div>

        {/* The rules that govern every decision on the platform, read-only —
            see the component for why none of it is editable. */}
        <PlatformRules />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickLink
            role="admin"
            href="/admin/startups/compliance"
            title="Verify compliance"
            description="DPIIT, entity, PAN and GST — the gate that lets a startup apply."
          />
          <QuickLink
            role="admin"
            href="/admin/users"
            title="Provision accounts"
            description="Officers, evaluators, independent evaluators and admins are created here."
          />
          <QuickLink
            role="admin"
            href="/admin/evaluators"
            title="Manage evaluator panels"
            description="Assign evaluators to a problem statement, and replace them on recusal."
          />
          <QuickLink
            role="admin"
            href="/admin/applications"
            title="Compile compliance records"
            description="Sealed, audit-grade snapshots of an application's full decision trail."
          />
        </div>
      </div>
    </AppLayout>
  );
}
