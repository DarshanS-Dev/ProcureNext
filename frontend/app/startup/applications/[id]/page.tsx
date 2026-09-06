'use client';
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/shared/AppLayout';
import { PipelineStepper } from '@/components/shared/PipelineStepper';
import {
  PageHeader, DocumentForm, DataCard, StatusBadge, StickyNote, DocButton, DocRow
} from '@/components/shared/DesignSystem';
import { UserRole } from '@/lib/types/api';
import { api } from '@/lib/api/client';
import { Upload, CheckCircle2, FileText } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ApplicationCasefilePage() {
  const params = useParams();
  const appId = Number(params?.id || 1);
  const [activeTab, setActiveTab] = useState<'checklist' | 'milestones'>('checklist');
  const [checklist, setChecklist] = useState<any[]>([]);

  useEffect(() => {
    api.getChecklist(appId).then((res) => {
      if (Array.isArray(res)) {
        setChecklist(res.map(c => ({
          id: c.id,
          title: c.title || `Checklist Item #${c.id}`,
          status: c.status || 'pending',
          file: c.file_url || null,
        })));
      }
    }).catch(() => {});
  }, [appId]);

  const handleUpload = (id: number) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, status: 'uploaded', file: `doc_upload_${id}.pdf` } : item));
  };

  return (
    <AppLayout defaultRole={UserRole.STARTUP}>
      <div className="space-y-6 max-w-5xl">
        <PageHeader
          title="Application Casefile #1"
          subtitle="Dynamic Checklist & Mandatory Document Uploads"
          role={UserRole.STARTUP}
          stickyNote={
            <StickyNote color="mint" title="Checklist Gate">
              Upload required technical and security compliance evidence to complete under_review stage.
            </StickyNote>
          }
          action={
            <StatusBadge status="under_review" label="STATUS: UNDER_REVIEW (Phase 5.3)" />
          }
        />

        {/* Stepper Pipeline */}
        <PipelineStepper currentStatus="under_review" />

        {/* Tab selector */}
        <div className="flex gap-2 border-b border-[#E8E2D5] pb-2">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-[#1E9E5A] text-white'
                : 'bg-[#F8F6F1] text-[#6B6560] hover:bg-[#EAF7ED]'
            }`}
          >
            Phase 5.4: Document Checklist
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
              activeTab === 'milestones'
                ? 'bg-[#1E9E5A] text-white'
                : 'bg-[#F8F6F1] text-[#6B6560] hover:bg-[#EAF7ED]'
            }`}
          >
            Phase 11.3: Contract Milestones
          </button>
        </div>

        {activeTab === 'checklist' ? (
          <DocumentForm
            title="Dynamic Category Checklist Documents"
            subtitle="Uploaded Verification Attachments"
            refNumber="DOC-CHK-01"
            role={UserRole.STARTUP}
            watermark="CHECKLIST"
          >
            <div className="space-y-3 pt-2">
              {checklist.map((item) => (
                <DocRow key={item.id} hover={false} className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1E9E5A]" />
                      {item.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#6B6560]">
                      {item.file || 'No document uploaded yet'}
                    </div>
                  </div>

                  {item.status === 'uploaded' ? (
                    <StatusBadge status="verified" label="✓ UPLOADED" />
                  ) : (
                    <DocButton
                      variant="primary"
                      role={UserRole.STARTUP}
                      size="sm"
                      icon={<Upload className="w-3.5 h-3.5" />}
                      onClick={() => handleUpload(item.id)}
                    >
                      Upload File (Phase 5.5)
                    </DocButton>
                  )}
                </DocRow>
              ))}
            </div>
          </DocumentForm>
        ) : (
          <DocumentForm
            title="Contract Milestone Submissions (Phase 11.3)"
            subtitle="Independent Evaluator Pilot Verification"
            role={UserRole.STARTUP}
          >
            <div className="p-4 bg-[#F8F6F1] rounded-lg border border-[#E8E2D5] text-xs text-[#6B6560] leading-relaxed">
              Once application transitions to <strong className="text-[#1A1A1A]">contracted</strong> state, upload evidence for Milestones 1 through 5 here for Independent Evaluator review.
            </div>
          </DocumentForm>
        )}
      </div>
    </AppLayout>
  );
}
