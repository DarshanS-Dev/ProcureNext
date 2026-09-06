'use client';

/**
 * Evaluator panels — admin only.
 *
 * POST /problem-statements/{id}/evaluators          (assign)
 * POST /problem-statements/{id}/evaluators/replace  (recuse + replace)
 *
 * Officers can see a panel but cannot change it, so this is the only place
 * assignment happens. Replace is the recusal path: the outgoing evaluator is
 * marked recused on one specific application and the incoming one is added to
 * the problem statement; the old assignment row is deliberately left in place.
 */

import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  AlertStrip,
  DataCard,
  DocButton,
  DocSelect,
  FormField,
  PageHeader,
  SectionDivider,
  StatusBadge,
} from '@/components/shared/DesignSystem';
import { PanelHeading } from '@/components/panels/ApplicationPanels';
import {
  ApiErrorState,
  EmptyState,
  LoadingBlock,
  fmtDateTime,
  humanize,
} from '@/components/shared/States';
import { api } from '@/lib/api/client';
import { useMutation, useQuery } from '@/lib/hooks/useApi';
import { UserPlus2 } from 'lucide-react';

export default function AdminEvaluatorsPage() {
  const psQuery = useQuery(() => api.getProblemStatements(), []);
  const usersQuery = useQuery(() => api.getUsers(), []);

  const [psId, setPsId] = useState('');
  const selectedPsId = psId ? Number(psId) : null;

  const assignments = useQuery(
    () => api.getEvaluatorAssignments(selectedPsId!),
    [selectedPsId],
    { enabled: Boolean(selectedPsId) },
  );

  const applications = useQuery(
    () => api.getApplicationsForPS(selectedPsId!),
    [selectedPsId],
    { enabled: Boolean(selectedPsId) },
  );

  const assign = useMutation();
  const replace = useMutation();

  const [newEvaluator, setNewEvaluator] = useState('');
  const [replaceOld, setReplaceOld] = useState('');
  const [replaceNew, setReplaceNew] = useState('');
  const [recusedApp, setRecusedApp] = useState('');

  const evaluatorUsers = (usersQuery.data ?? []).filter((u) => u.role === 'evaluator');
  const userById = new Map((usersQuery.data ?? []).map((u) => [u.id, u]));
  const assignedIds = new Set((assignments.data ?? []).map((a) => a.evaluator_id));
  const unassigned = evaluatorUsers.filter((u) => !assignedIds.has(u.id));

  const selectedPs = (psQuery.data ?? []).find((p) => p.id === selectedPsId);

  return (
    <AppLayout allow="admin">
      <div className="space-y-6">
        <PageHeader
          title="Evaluator Panels"
          subtitle="Assign evaluators to a problem statement, and handle recusals by replacement."
          phase="Layer 4 · Evaluation"
          role="admin"
          breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Evaluators' }]}
        />

        {psQuery.loading && <LoadingBlock label="Loading problem statements…" rows={2} />}
        {psQuery.error && <ApiErrorState error={psQuery.error} onRetry={psQuery.refetch} />}

        <DataCard>
          <FormField label="Problem statement" required>
            <DocSelect value={psId} onChange={(e) => setPsId(e.target.value)}>
              <option value="">Select a problem statement…</option>
              {(psQuery.data ?? []).map((ps) => (
                <option key={ps.id} value={ps.id}>
                  PS #{ps.id} — {ps.title} ({ps.status})
                </option>
              ))}
            </DocSelect>
          </FormField>

          {selectedPs && (
            <p className="text-[11px] text-[#6B6560] mt-2">
              {humanize(selectedPs.category)} · owned by officer #{selectedPs.officer_id} ·{' '}
              {selectedPs.status}
            </p>
          )}
        </DataCard>

        {!selectedPsId && (
          <EmptyState
            title="Pick a problem statement"
            hint="Panels are per problem statement. Choose one above to see and change its evaluators."
          />
        )}

        {selectedPsId && (
          <>
            <DataCard>
              <PanelHeading
                title="Current panel"
                endpoint={`GET /problem-statements/${selectedPsId}/evaluators`}
                right={
                  assignments.data ? (
                    <StatusBadge status="info" label={`${assignments.data.length} assigned`} />
                  ) : undefined
                }
              />

              {assignments.loading && <LoadingBlock label="Loading panel…" rows={2} />}
              {assignments.error && (
                <ApiErrorState error={assignments.error} onRetry={assignments.refetch} />
              )}

              {assignments.data && assignments.data.length === 0 && (
                <EmptyState
                  title="No evaluators assigned"
                  hint="Publishing with an empty panel is allowed, but nothing can be scored until someone is assigned."
                />
              )}

              <div className="divide-y divide-[#F1EDE4]">
                {(assignments.data ?? []).map((a) => {
                  const user = userById.get(a.evaluator_id);
                  return (
                    <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-[#1A1A1A]">
                          {user ? user.name : `Evaluator #${a.evaluator_id}`}
                        </div>
                        <div className="text-[11px] text-[#6B6560]">
                          {user?.email ?? `user #${a.evaluator_id}`} · assigned{' '}
                          {fmtDateTime(a.assigned_at)} by user #{a.assigned_by}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#A89F94]">#{a.evaluator_id}</span>
                    </div>
                  );
                })}
              </div>

              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  assign.run(
                    () =>
                      api.assignEvaluator(selectedPsId, { evaluator_id: Number(newEvaluator) }),
                    {
                      successMessage: 'Evaluator assigned.',
                      onSuccess: () => {
                        setNewEvaluator('');
                        assignments.refetch();
                      },
                    },
                  );
                }}
              >
                <SectionDivider label="Assign an evaluator" />

                {usersQuery.error && (
                  <ApiErrorState error={usersQuery.error} onRetry={usersQuery.refetch} />
                )}

                {unassigned.length === 0 && evaluatorUsers.length > 0 && (
                  <AlertStrip
                    type="info"
                    message="Every evaluator account is already on this panel."
                  />
                )}
                {evaluatorUsers.length === 0 && !usersQuery.loading && (
                  <AlertStrip
                    type="warning"
                    title="No evaluator accounts exist"
                    message="Create one from User Management before assigning a panel."
                  />
                )}

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <DocSelect
                      aria-label="Evaluator to assign"
                      value={newEvaluator}
                      onChange={(e) => setNewEvaluator(e.target.value)}
                    >
                      <option value="">Select an evaluator…</option>
                      {unassigned.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email}
                        </option>
                      ))}
                    </DocSelect>
                  </div>
                  <DocButton
                    type="submit"
                    size="sm"
                    variant="primary"
                    role="admin"
                    loading={assign.pending}
                    disabled={!newEvaluator}
                    icon={<UserPlus2 className="w-3 h-3" />}
                  >
                    Assign
                  </DocButton>
                </div>

                {assign.error && (
                  <AlertStrip
                    type="error"
                    title={assign.error.status === 409 ? 'Already assigned' : 'Assignment failed'}
                    message={assign.error.detail}
                  />
                )}
                {assign.success && <AlertStrip type="success" message={assign.success} />}
              </form>
            </DataCard>

            <DataCard>
              <PanelHeading
                title="Replace on recusal"
                endpoint={`POST /problem-statements/${selectedPsId}/evaluators/replace`}
              />

              <p className="text-xs text-[#6B6560] mb-4">
                Use this when an evaluator has a conflict on one application. The
                outgoing evaluator is marked recused on that application only — they
                stay on the panel for everything else — and the incoming evaluator is
                added to the problem statement.
              </p>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  replace.run(
                    () =>
                      api.replaceEvaluator(selectedPsId, {
                        old_evaluator_id: Number(replaceOld),
                        new_evaluator_id: Number(replaceNew),
                        recused_application_id: Number(recusedApp),
                      }),
                    {
                      successMessage: 'Replacement recorded.',
                      onSuccess: () => {
                        setReplaceOld('');
                        setReplaceNew('');
                        setRecusedApp('');
                        assignments.refetch();
                      },
                    },
                  );
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Evaluator to recuse" required>
                    <DocSelect
                      required
                      value={replaceOld}
                      onChange={(e) => setReplaceOld(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(assignments.data ?? []).map((a) => (
                        <option key={a.evaluator_id} value={a.evaluator_id}>
                          {userById.get(a.evaluator_id)?.name ?? `Evaluator #${a.evaluator_id}`}
                        </option>
                      ))}
                    </DocSelect>
                  </FormField>

                  <FormField label="Replacement evaluator" required>
                    <DocSelect
                      required
                      value={replaceNew}
                      onChange={(e) => setReplaceNew(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {evaluatorUsers
                        .filter((u) => String(u.id) !== replaceOld)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.email}
                          </option>
                        ))}
                    </DocSelect>
                  </FormField>

                  <FormField label="Application they are recused from" required>
                    <DocSelect
                      required
                      value={recusedApp}
                      onChange={(e) => setRecusedApp(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(applications.data ?? []).map((app) => (
                        <option key={app.id} value={app.id}>
                          APP #{app.id} — startup #{app.startup_id}
                        </option>
                      ))}
                    </DocSelect>
                  </FormField>
                </div>

                {applications.error && (
                  <AlertStrip
                    type="warning"
                    title="Could not list applications"
                    message={applications.error.detail}
                  />
                )}
                {applications.data && applications.data.length === 0 && (
                  <AlertStrip
                    type="info"
                    message="No applications exist on this problem statement yet, so there is nothing to recuse anyone from."
                  />
                )}

                {replace.error && (
                  <AlertStrip type="error" title="Replacement failed" message={replace.error.detail} />
                )}
                {replace.success && <AlertStrip type="success" message={replace.success} />}

                <DocButton
                  type="submit"
                  size="sm"
                  variant="primary"
                  role="admin"
                  loading={replace.pending}
                  disabled={!replaceOld || !replaceNew || !recusedApp}
                >
                  Record replacement
                </DocButton>
              </form>
            </DataCard>
          </>
        )}
      </div>
    </AppLayout>
  );
}
