'use client';
import React, { useState } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocButton, DocRow, AlertStrip
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { ShieldCheck, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';

export default function AdminCompliancePage() {
  const [queue, setQueue] = useState([
    { id: 1, name: 'AeroTech Defense Labs Pvt Ltd', dpiit: 'DPIIT-98234-IN', panGst: '✓ PAN & GST Present', entityValid: '✓ Entity Active', status: 'unverified' },
    { id: 2, name: 'CyberShield Systems Pvt Ltd', dpiit: 'DPIIT-44102-IN', panGst: '✓ PAN & GST Present', entityValid: '✓ Entity Active', status: 'unverified' }
  ]);

  const [verifiedList, setVerifiedList] = useState<string[]>([]);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);

  const handleVerify = (id: number, name: string) => {
    setQueue(queue.filter(s => s.id !== id));
    setVerifiedList([...verifiedList, name]);
  };

  return (
    <AppLayout defaultRole={UserRole.ADMIN}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Startup Compliance Queue"
          subtitle='Phase 2 — Admin Single-Pass Verification & "Once-Only" Rule Test'
          role={UserRole.ADMIN}
          stickyNote={
            <StickyNote color="pink" title="Once-Only Rule">
              Rule 2.3: Verification applies globally across all problem statements. No per-application re-verification is allowed.
            </StickyNote>
          }
        />

        {ruleMessage && (
          <AlertStrip
            type="info"
            title="Rule 2.3 Enforced"
            message={ruleMessage}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentForm
            title="Unverified Compliance Queue"
            subtitle="Single-Pass Check Register"
            refNumber={`QUE-${queue.length}`}
            role={UserRole.ADMIN}
            watermark="VERIFY"
          >
            {queue.length === 0 ? (
              <AlertStrip type="success" title="Queue Cleared" message="All startups in queue verified!" />
            ) : (
              <div className="space-y-3 pt-2">
                {queue.map((s) => (
                  <DocRow key={s.id} hover={false} className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-[#1A1A1A]">{s.name}</div>
                        <div className="text-[11px] font-mono text-[#6B6560]">{s.dpiit}</div>
                      </div>
                      <StatusBadge status="pending" label="UNVERIFIED" />
                    </div>

                    <div className="flex gap-3 text-[11px] text-[#1E9E5A] font-medium">
                      <span>{s.panGst}</span>
                      <span>•</span>
                      <span>{s.entityValid}</span>
                    </div>

                    <DocButton
                      variant="primary"
                      role={UserRole.ADMIN}
                      size="sm"
                      className="w-full"
                      icon={<ShieldCheck className="w-3.5 h-3.5" />}
                      onClick={() => handleVerify(s.id, s.name)}
                    >
                      Verify Compliance (Single Pass 4-Field Check)
                    </DocButton>
                  </DocRow>
                ))}
              </div>
            )}
          </DocumentForm>

          <DocumentForm
            title="Verified Startups Directory"
            subtitle="Global Registration Compliance Register"
            role={UserRole.ADMIN}
          >
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] text-xs space-y-2">
                <div className="text-[#6B6560] font-bold uppercase tracking-wider text-[10px]">Rule 2.3 Verification Gate Check:</div>
                <p className="text-[#1A1A1A] leading-relaxed">
                  Confirm there is no per-application re-verification button. Once verified here at startup registration level, status applies globally across all problem statement applications.
                </p>
                <DocButton
                  variant="secondary"
                  role={UserRole.ADMIN}
                  size="sm"
                  icon={<Lock className="w-3.5 h-3.5" />}
                  onClick={() => setRuleMessage('Verified Rule 2.3: Per-application re-verification is disabled. Global status enforced.')}
                >
                  Test "Once Only" Rule Lock
                </DocButton>
              </div>

              {verifiedList.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#A89F94] uppercase tracking-wider">Recently Verified</div>
                  {verifiedList.map((name, i) => (
                    <DocRow key={i} hover={false} className="flex justify-between items-center py-2">
                      <span className="font-bold text-xs text-[#1A1A1A]">{name}</span>
                      <StatusBadge status="verified" label="Global Valid" />
                    </DocRow>
                  ))}
                </div>
              )}
            </div>
          </DocumentForm>
        </div>
      </div>
    </AppLayout>
  );
}
