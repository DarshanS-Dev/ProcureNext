'use client';

/**
 * The single persistent top bar. Replaces the navbar + sidebar pair.
 *
 * Logo lockup on the left (reusing the icon-in-circle motif from the H1
 * treatment), the role's pill-segment nav next to it, and that role's one
 * primary action as a filled pill on the right. Below the `md` breakpoint the
 * pill row simply scrolls horizontally — there is deliberately no drawer.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Plus } from 'lucide-react';
import { ROLE_LABELS, Session, signOut } from '@/lib/auth/session';
import { ROLE_NAV, activeHref } from './nav-config';
import { NotificationBell } from './NotificationBell';

export const TopNav: React.FC<{ session: Session }> = ({ session }) => {
  const pathname = usePathname();
  const router = useRouter();
  const nav = ROLE_NAV[session.role];
  const active = activeHref(pathname, nav.items);

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F4F4EF]/90 backdrop-blur border-b border-[#E5E5E0]">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-4">
        {/* Logo lockup */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="w-9 h-9 rounded-full bg-[#18181B] text-[#D7FD44] flex items-center justify-center font-black text-sm transition-transform group-hover:scale-105">
            PN
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-black tracking-tight text-[#18181B]">procurenext</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
              {ROLE_LABELS[session.role]}
            </span>
          </span>
        </Link>

        {/* Pill-segment nav */}
        <nav className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {nav.items.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#18181B] text-white shadow-xs'
                      : 'text-[#18181B] hover:bg-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Primary action + identity */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell session={session} />

          <Link href={nav.cta.href} className="hidden md:block">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-[#18181B] hover:bg-black text-white text-xs font-bold py-2.5 px-5 rounded-full flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{nav.cta.label}</span>
            </motion.span>
          </Link>

          <button
            onClick={handleSignOut}
            title={`Signed in as user #${session.userId}`}
            className="w-9 h-9 rounded-full bg-white border border-[#E5E5E0] text-[#6B7280] hover:text-[#18181B] hover:border-[#18181B] flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
