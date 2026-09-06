'use client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { MainDashboardView } from '@/components/dashboard/MainDashboardView';

export default function OfficerDashboardPage() {
  const router = useRouter();
  return (
    <AppLayout defaultRole="officer">
      <MainDashboardView role="officer" onNavigateToApp={() => router.push('/officer/applications/1')} />
    </AppLayout>
  );
}
