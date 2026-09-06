'use client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { MainDashboardView } from '@/components/dashboard/MainDashboardView';

export default function IndependentEvaluatorDashboardPage() {
  const router = useRouter();
  return (
    <AppLayout defaultRole="independent-evaluator">
      <MainDashboardView role="independent-evaluator" onNavigateToApp={() => router.push('/independent-evaluator/applications/1/sandbox')} />
    </AppLayout>
  );
}
