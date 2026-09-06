'use client';
import { useRouter } from 'next/navigation';
import { AuthPage } from '@/components/auth/AuthPage';

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthPage
      onLoginSuccess={(user) => {
        if (user.role === 'admin') router.push('/admin/users');
        else if (user.role === 'startup') router.push('/startup/dashboard');
        else if (user.role === 'officer') router.push('/officer/dashboard');
        else if (user.role === 'evaluator') router.push('/evaluator/dashboard');
        else if (user.role === 'independent-evaluator') router.push('/independent-evaluator/dashboard');
      }}
    />
  );
}
