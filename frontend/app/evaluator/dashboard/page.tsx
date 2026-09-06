'use client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { MainDashboardView } from '@/components/dashboard/MainDashboardView';

export default function EvaluatorDashboardPage() {
  const router = useRouter();
  return (
    <AppLayout defaultRole="evaluator">
      <MainDashboardView role="evaluator" onNavigateToApp={() => router.push('/evaluator/applications/1/score')} />
    </AppLayout>
  );
}
