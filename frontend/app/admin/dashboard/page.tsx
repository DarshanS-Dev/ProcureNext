'use client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/shared/AppLayout';
import { MainDashboardView } from '@/components/dashboard/MainDashboardView';
import { UserRole } from '@/lib/types/api';

export default function AdminDashboardPage() {
  const router = useRouter();
  return (
    <AppLayout defaultRole="admin">
      <MainDashboardView role="admin" onNavigateToApp={() => router.push('/admin/applications/1/compliance-record')} />
    </AppLayout>
  );
}
