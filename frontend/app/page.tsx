'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeRouteFor, readSession } from '@/lib/auth/session';

/** Sends signed-in users to their own dashboard, everyone else to /login. */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    router.replace(session ? homeRouteFor(session.role) : '/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F4EF' }}>
      <div className="w-8 h-8 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
