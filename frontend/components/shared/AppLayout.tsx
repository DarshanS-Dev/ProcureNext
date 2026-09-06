'use client';

/**
 * Authenticated shell + route guard.
 *
 * Replaces the previous behaviour where the role came from a dropdown in the
 * navbar: the role now comes from the JWT, and a page declares which roles may
 * render it. Anyone signed out is sent to /login; anyone signed in with the
 * wrong role is sent to their own dashboard rather than shown a screen full of
 * 403s.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppNavbar, AppSidebar } from '@/components/shared/AppNavigation';
import { RoleEnum } from '@/lib/types/api';
import { Session, homeRouteFor, readSession } from '@/lib/auth/session';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Roles allowed to view this page. Omit to allow any signed-in user. */
  allow?: RoleEnum | RoleEnum[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, allow }) => {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  // 'checking' until the effect has run — the token lives in localStorage, so
  // nothing can be decided during SSR or the first paint.
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirecting'>('checking');

  useEffect(() => {
    const current = readSession();

    if (!current) {
      setStatus('redirecting');
      router.replace('/login');
      return;
    }

    const allowed = allow === undefined ? null : Array.isArray(allow) ? allow : [allow];
    if (allowed && !allowed.includes(current.role)) {
      setStatus('redirecting');
      router.replace(homeRouteFor(current.role));
      return;
    }

    setSession(current);
    setStatus('ok');
  }, [router, allow]);

  if (status !== 'ok' || !session) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F8F6F1' }}
      >
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#A89F94]">
            {status === 'redirecting' ? 'Redirecting…' : 'Verifying session…'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F1' }}>
      <AppNavbar session={session} />
      <div className="flex">
        <AppSidebar session={session} />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 px-7 py-6 max-w-6xl mx-auto w-full"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};
