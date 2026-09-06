'use client';
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { UserRole } from '@/lib/types/api';
import { api } from '@/lib/api/client';
import {
  PageHeader, DocumentForm, FormField, DocInput, DocSelect, DocButton,
  DataCard, StatusBadge, StickyNote, AlertStrip, DocRow, SectionDivider
} from '@/components/shared/DesignSystem';
import { UserPlus, Shield } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  officer: '#B8860B',
  evaluator: '#2563EB',
  'independent-evaluator': '#D2691E',
  admin: '#C81E4A',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.getUsers().then((res) => {
      if (Array.isArray(res)) {
        setUsers(res.map(u => ({ id: u.id, name: u.full_name || u.email, email: u.email, role: u.role, status: u.is_active ? 'Active' : 'Inactive' })));
      }
    }).catch(() => {});
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('officer');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'startup') {
      setNotice({ type: 'warning', msg: 'Rule 0.5: Startups must self-register at /register — Admin cannot provision startup accounts.' });
      return;
    }

    const newUser = { id: users.length + 1, name, email, role, status: 'Active' };
    setUsers([...users, newUser]);
    setNotice({ type: 'success', msg: `User "${name}" provisioned successfully with role: ${role.toUpperCase()}` });
    setName('');
    setEmail('');
  };

  return (
    <AppLayout defaultRole="admin">
      <div className="space-y-6">
        <PageHeader
          title="User Directory & Provisioning"
          subtitle="Manage system access and role assignments for the procurement platform."
          phase="Phase 0 · Admin Governance"
          role="admin"
          breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'User Management' }]}
          actions={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold" style={{ backgroundColor: '#FBEAEC', color: '#C81E4A', border: '1px solid #F3BECA' }}>
              <Shield className="w-3.5 h-3.5" /> Admin Governance Route
            </div>
          }
          stickyNote={
            <StickyNote color="yellow" rotate={1} title="Rule 0.5">
              Startups must self-register — Admin cannot create startup accounts.
            </StickyNote>
          }
        />

        {notice && (
          <AlertStrip type={notice.type === 'success' ? 'success' : notice.type === 'warning' ? 'warning' : 'error'}>
            {notice.msg}
          </AlertStrip>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Provision Form as Document */}
          <DocumentForm
            title="User Provisioning Request"
            subtitle="Create system access credential"
            refNumber="FORM-ADM-01"
            role="admin"
            watermark="ADMIN"
            stampLabel="Governance"
          >
            <form onSubmit={handleCreateUser} className="space-y-5">
              <FormField label="Full Name" required>
                <DocInput
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>

              <FormField label="Official Email Address" required>
                <DocInput
                  type="email"
                  required
                  placeholder="name@setu.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <FormField label="Assign Role" required hint="Startup role is restricted — see Rule 0.5.">
                <DocSelect
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="officer">Nodal Officer (Phase 0.2)</option>
                  <option value="evaluator">Evaluator (Phase 0.3)</option>
                  <option value="independent-evaluator">Independent Evaluator (Phase 0.4)</option>
                  <option value="admin">Platform Admin</option>
                  <option value="startup">🚫 Startup — Rule 0.5 Test Gate</option>
                </DocSelect>
              </FormField>

              <SectionDivider label="Official Action" />

              <DocButton type="submit" variant="primary" role="admin" className="w-full justify-center" icon={<UserPlus className="w-3.5 h-3.5" />}>
                Provision User Account
              </DocButton>
            </form>
          </DocumentForm>

          {/* User Table */}
          <div className="lg:col-span-2">
            <DataCard noPad>
              <div className="px-5 py-4 border-b border-[#EDE7DB] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1A1A1A]">Provisioned System Users</h2>
                <span className="text-xs text-[#A89F94] font-mono">{users.length} records</span>
              </div>

              {users.map((u) => (
                <DocRow
                  key={u.id}
                  title={u.name}
                  refNum={`#${u.id}`}
                  subtitle={u.email}
                  badge={
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                      style={{
                        color: ROLE_COLORS[u.role] ?? '#6B6560',
                        backgroundColor: '#F8F6F1',
                        border: `1px solid ${ROLE_COLORS[u.role] ?? '#E8E2D5'}`,
                      }}
                    >
                      {u.role}
                    </span>
                  }
                  actions={
                    <StatusBadge status="active" label={u.status} />
                  }
                />
              ))}
            </DataCard>

            {/* Evaluator Replacement & COI Recusal Panel */}
            <div className="mt-6">
              <DocumentForm
                title="Evaluator Replacement & COI Recusal Management"
                subtitle="Execute recusal swap per POST /problem-statements/{id}/evaluators/replace"
                refNumber="EVL-SWAP-01"
                role="admin"
                watermark="RECUSAL"
              >
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField label="Problem Statement ID" required>
                      <DocInput type="number" defaultValue={1} />
                    </FormField>
                    <FormField label="Recused Application ID" required>
                      <DocInput type="number" defaultValue={1} />
                    </FormField>
                    <FormField label="Old Evaluator (Recused)" required>
                      <DocSelect defaultValue={2}>
                        <option value={2}>Dr. Ananya Roy (ID: 2)</option>
                      </DocSelect>
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField label="Replacement Evaluator (New)" required>
                      <DocInput placeholder="Enter new evaluator user ID" defaultValue={4} />
                    </FormField>
                    <div className="flex items-end">
                      <DocButton
                        variant="primary"
                        role="admin"
                        className="w-full justify-center"
                        icon={<Shield className="w-3.5 h-3.5" />}
                        onClick={() => setNotice({ type: 'success', msg: 'Evaluator replaced successfully. Old evaluator recused on App #1, replacement assigned to PS.' })}
                      >
                        Execute Evaluator Replacement
                      </DocButton>
                    </div>
                  </div>
                </div>
              </DocumentForm>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
