'use client';
import { useRouter } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthPage';
import { homeRouteFor } from '@/lib/auth/session';

export default function RegisterPage() {
  const router = useRouter();
  return (
    <AuthPage
      initialMode="signup"
      // A fresh startup account has an empty profile, so send them to fill it
      // in; anything else (an admin-issued account signing in here) goes to
      // its own dashboard.
      onAuthenticated={(role) =>
        router.replace(role === 'startup' ? '/startup/profile' : homeRouteFor(role))
      }
    />
  );
}
