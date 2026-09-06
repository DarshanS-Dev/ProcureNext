'use client';
import { useRouter } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthPage';
import { homeRouteFor } from '@/lib/auth/session';

export default function LoginPage() {
  const router = useRouter();
  return (
    <AuthPage
      initialMode="login"
      onAuthenticated={(role) => router.replace(homeRouteFor(role))}
    />
  );
}
