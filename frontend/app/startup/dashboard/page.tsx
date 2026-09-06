'use client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { MainDashboardView } from '@/components/dashboard/MainDashboardView';

export default function StartupDashboardPage() {
  const router = useRouter();
  return (
    <AppLayout defaultRole="startup">
      <MainDashboardView role="startup" onNavigateToApp={() => router.push('/startup/applications/1')} />
    </AppLayout>
  );
}
