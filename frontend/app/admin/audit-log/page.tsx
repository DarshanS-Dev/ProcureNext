'use client';

/**
 * Audit trail.
 *
 * There is genuinely nothing to call here. AuditLog rows are written as a
 * side effect of other endpoints (audit_log_service.write_audit_log), and
 * AuditLogRead exists in core_schemas.py — but no router anywhere in
 * backend/app/routers exposes a read route for them. Not an unmounted router
 * like the Layer 5 ones: the endpoint does not exist at all.
 *
 * Rather than fake a table, this page says so and states exactly what the
 * backend would need. The compliance record is the closest thing that *is*
 * reachable, so it points there.
 */

import React from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { AlertStrip, DataCard, DocLinkButton } from '@/components/shared/DesignSystem';
import {
  HeroCard,
  PageHeader as Header,
  StatPill,
} from '@/components/shared/design-system';
import { ScrollText } from 'lucide-react';
import { PanelHeading } from '@/components/panels/ApplicationPanels';

const FIELDS = [
  ['id', 'Row id'],
  ['actor_id', 'Who did it (nullable for system actions)'],
  ['action', 'What happened'],
  ['entity_type', 'Which table it happened to'],
  ['entity_id', 'Which row'],
  ['timestamp', 'When'],
  ['log_metadata', 'Free-form JSON context'],
];

export default function AdminAuditLogPage() {
  return (
    <AppLayout allow="admin">
      <div className="space-y-6 max-w-4xl">
        <Header
          line1="Audit"
          glyph={<ScrollText className="w-5 h-5 text-[#18181B]" />}
          line1Tail="Trail"
          subtitle="Every write on the platform is logged — but the log has no read endpoint yet."
        />

        <HeroCard
          icon={<ScrollText className="w-4 h-4" />}
          label="Status"
          aside={<StatPill tone="warn">No read route</StatPill>}
          title="Logged, but not readable yet"
          body="Rows are written on every change. A single admin-only GET route is all this page needs to become a live feed."
        />

        <AlertStrip type="warning" title="No endpoint to call">
          <div className="space-y-1.5 leading-relaxed">
            <p>
              Audit rows are written server-side by{' '}
              <code className="font-mono">audit_log_service.write_audit_log</code> as a
              side effect of the endpoints that change data, and the response schema{' '}
              <code className="font-mono">AuditLogRead</code> already exists. What is
              missing is a route that returns them — nothing under{' '}
              <code className="font-mono">backend/app/routers/</code> serves the audit
              log, so unlike the Layer 5 screens this one cannot be switched on by
              mounting a router.
            </p>
            <p>
              A read route (admin-only, filterable by{' '}
              <code className="font-mono">entity_type</code>,{' '}
              <code className="font-mono">entity_id</code> and{' '}
              <code className="font-mono">actor_id</code>) is all this page needs; the
              client and types are already in place for it.
            </p>
          </div>
        </AlertStrip>

        <DataCard>
          <PanelHeading title="What a row holds" endpoint="AuditLogRead — core_schemas.py" />
          <div className="divide-y divide-[#F0F0EA]">
            {FIELDS.map(([field, description]) => (
              <div key={field} className="py-2.5 flex gap-3">
                <span className="font-mono text-[11px] text-[#C81E4A] w-32 shrink-0 pt-0.5">
                  {field}
                </span>
                <span className="text-xs text-[#6B7280]">{description}</span>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard>
          <PanelHeading
            title="What you can see today"
            endpoint="GET /admin/applications/{id}/compliance-records"
          />
          <p className="text-xs text-[#6B7280] mb-3">
            A compliance record is the audit-grade artefact that <em>is</em> reachable:
            a sealed snapshot of everything on record for one application at the moment
            it was compiled — eligibility, checklist, scores, QCBS, risk, containment
            and the pilot trail.
          </p>
          <DocLinkButton href="/admin/applications" role="admin" size="sm">
            Go to applications
          </DocLinkButton>
        </DataCard>
      </div>
    </AppLayout>
  );
}
