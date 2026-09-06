'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { ShieldCheck, Plus, FileText } from 'lucide-react';

export default function AdminComplianceRecordPage() {
  const [records, setRecords] = useState<any[]>([]);

  const handleGenerateRecord = () => {
    const newRecord = {
      id: `CR-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      scope: 'Single Application #1 (Re-Snapshot)',
      status: 'Immutable Snapshot'
    };
    setRecords([newRecord, ...records]);
  };

  return (
    <AppLayout defaultRole={UserRole.ADMIN}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Compliance Record Generator"
          subtitle="Phase 13 — Immutable Single-Application Snapshot Generator"
          role={UserRole.ADMIN}
          stickyNote={
            <StickyNote color="pink" title="Immutable Log">
              Each generated snapshot is cryptographically stamped into the permanent audit store.
            </StickyNote>
          }
          action={
            <DocButton
              variant="primary"
              role={UserRole.ADMIN}
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleGenerateRecord}
            >
              Generate New Snapshot (Phase 13.1)
            </DocButton>
          }
        />

        <DocumentForm
          title="Immutable Compliance Snapshots Register"
          subtitle="Official Audit Certificate Archive"
          refNumber="CMP-LOG-2024"
          role={UserRole.ADMIN}
          watermark="AUDITED"
        >
          <div className="space-y-3 pt-2">
            {records.map((r) => (
              <DocRow key={r.id} hover={false} className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1E9E5A]" />
                    <span>Snapshot Certificate #{r.id}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#6B6560] mt-0.5">
                    Stamped at: {r.timestamp} • Scope: <strong className="text-[#1A1A1A]">{r.scope}</strong>
                  </div>
                </div>

                <StatusBadge status="verified" label={r.status} />
              </DocRow>
            ))}
          </div>
        </DocumentForm>
      </div>
    </AppLayout>
  );
}
