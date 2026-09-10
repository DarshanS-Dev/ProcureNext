'use client';

/**
 * GET  /admin/users  — every account on the platform
 * POST /admin/users  — provision a non-startup account
 *
 * Startup accounts cannot be created here: auth_service.create_user_by_admin
 * rejects role='startup', because startups self-register at /register.
 */

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DocButton,
  DocInput,
  DocSelect,
  DocumentForm,
  FormField,
  PageHeader,
  RoleBadge,
  SectionDivider,
} from '@/components/shared/DesignSystem';
import { ApiErrorState, EmptyState, LoadingBlock, fmtDateTime } from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { RoleEnum, roleToSlug } from '@/lib/types/api';
import { ROLE_LABELS } from '@/lib/auth/session';
import { UserPlus } from 'lucide-react';
import { ScopeNote } from '@/components/shared/design-system';
import { ROLE_PALETTE } from '@/components/shared/DesignSystem';

/** Roles an admin may provision. `startup` is deliberately absent. */
const PROVISIONABLE: RoleEnum[] = ['officer', 'evaluator', 'independent_evaluator', 'admin'];

export default function AdminUsersPage() {
  const usersQuery = useQuery(() => api.getUsers(), []);
  const create = useMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleEnum>('officer');
  const [roleFilter, setRoleFilter] = useState<RoleEnum | ''>('');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (usersQuery.data ?? [])
      .filter((u) => (roleFilter ? u.role === roleFilter : true))
      .filter((u) =>
        q ? u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) : true,
      )
      .slice()
      .sort((a, b) => b.id - a.id);
  }, [usersQuery.data, roleFilter, search]);

  const counts = useMemo(() => {
    const map = new Map<RoleEnum, number>();
    for (const u of usersQuery.data ?? []) map.set(u.role, (map.get(u.role) ?? 0) + 1);
    return map;
  }, [usersQuery.data]);

  return (
    <AppLayout allow="admin">
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Every account, and the only place officer, evaluator and admin accounts are created."
          phase="Layer 1 · Actors"
          role="admin"
          breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users' }]}
        />

        {/* One card per role. Clicking one filters the register below. */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['startup', 'officer', 'evaluator', 'independent_evaluator', 'admin'] as RoleEnum[]).map(
            (r) => {
              const selected = roleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRoleFilter(selected ? '' : r)}
                  className={`px-4 py-4 rounded-3xl text-left transition-colors cursor-pointer border ${
                    selected
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-white border-[#E5E5E0] hover:border-[#18181B]'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      selected ? 'bg-white/10 text-[#D7FD44]' : 'bg-[#F3F3EE] text-[#18181B]'
                    }`}
                  >
                    {ROLE_PALETTE[roleToSlug(r)].icon}
                  </span>
                  <div className="text-2xl font-black tabular-nums leading-none">
                    {usersQuery.data ? (counts.get(r) ?? 0) : '—'}
                  </div>
                  <div
                    className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                      selected ? 'text-gray-300' : 'text-gray-400'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </div>
                </button>
              );
            },
          )}
        </div>

        {/* The admin console is read-only except for three things. Saying so on
            the page keeps the UI honest about its own scope. */}
        <ScopeNote>
          <span className="font-bold text-[#18181B]">Admin writes exactly three things:</span>{' '}
          account creation (here), evaluator assignment (Evaluators), and compliance
          verification (Compliance). Everything else in this console is read-only —
          rules, weights and clause templates are fixed for the MVP.
        </ScopeNote>

        <DocumentForm
          title="Provision an Account"
          subtitle="POST /admin/users"
          refNumber="USR-NEW"
          role="admin"
        >
          <form
            className="space-y-5 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.run(() => api.provisionUser({ name, email, password, role }), {
                successMessage: `${ROLE_LABELS[role]} account created for ${email}.`,
                onSuccess: () => {
                  setName('');
                  setEmail('');
                  setPassword('');
                  usersQuery.refetch();
                },
              });
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Full name" required>
                <DocInput required value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Email" required>
                <DocInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>
              <FormField
                label="Initial password"
                required
                hint="Shared with the account holder out of band; there is no reset endpoint."
              >
                <DocInput
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <FormField label="Role" required>
                <DocSelect value={role} onChange={(e) => setRole(e.target.value as RoleEnum)}>
                  {PROVISIONABLE.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </DocSelect>
              </FormField>
            </div>

            <AlertStrip
              type="info"
              message="Startup accounts are not created here — startups self-register, and the register endpoint forces the role regardless of what is submitted."
            />

            {create.error && (
              <AlertStrip
                type="error"
                title={create.error.status === 409 ? 'Email already in use' : 'Not created'}
                message={create.error.detail}
              />
            )}
            {create.success && <AlertStrip type="success" message={create.success} />}

            <SectionDivider label="Create" />

            <DocButton
              type="submit"
              variant="primary"
              role="admin"
              loading={create.pending}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Create account
            </DocButton>
          </form>
        </DocumentForm>

        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Role
            </label>
            <DocSelect
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleEnum | '')}
            >
              <option value="">All roles</option>
              {(['startup', ...PROVISIONABLE] as RoleEnum[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </DocSelect>
          </div>
          <div className="w-64">
            <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Search
            </label>
            <DocInput
              lineStyle={false}
              placeholder="Name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {usersQuery.loading && <LoadingBlock label="Loading accounts…" />}
        {usersQuery.error && <ApiErrorState error={usersQuery.error} onRetry={usersQuery.refetch} />}

        {usersQuery.data && visible.length === 0 && (
          <EmptyState title="No accounts match" hint="Try clearing the role filter or the search box." />
        )}

        {visible.length > 0 && (
          <DocumentForm
            title="Account Register"
            subtitle="GET /admin/users"
            refNumber="USR-REG"
            role="admin"
          >
            <div className="pt-2 divide-y divide-[#F0F0EA]">
              {visible.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#18181B] truncate">{u.name}</div>
                    <div className="text-[11px] text-[#6B7280] truncate">{u.email}</div>
                    <div className="text-[10px] text-[#9CA3AF] font-mono">
                      #{u.id} · joined {fmtDateTime(u.created_at)}
                    </div>
                  </div>
                  <RoleBadge role={roleToSlug(u.role)} />
                </div>
              ))}
            </div>
          </DocumentForm>
        )}
      </div>
    </AppLayout>
  );
}
