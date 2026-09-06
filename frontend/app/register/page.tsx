'use client';
import { useRouter } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthPage';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <AuthPage
      onLoginSuccess={(user) => {
        router.push('/startup/profile');
      }}
    />
  );
}
