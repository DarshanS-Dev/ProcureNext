'use client';

/**
 * Tab strip whose selection lives in the URL (?tab=…), so a tab is linkable,
 * survives a reload, and works with the back button.
 */

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserRole } from '@/lib/types/api';
import { ROLE_PALETTE } from '@/components/shared/DesignSystem';

export interface TabDef {
  id: string;
  label: string;
}

export function useTabParam(tabs: TabDef[], paramName = 'tab') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get(paramName);
  const active = tabs.some((t) => t.id === requested) ? requested! : tabs[0]?.id;

  const setActive = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(paramName, id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return { active, setActive };
}

export const TabStrip: React.FC<{
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  role: UserRole;
}> = ({ tabs, active, onChange, role }) => {
  const palette = ROLE_PALETTE[role];

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto pb-px"
      role="tablist"
      style={{ borderBottom: '1px solid #E8E2D5' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-t-lg whitespace-nowrap transition-colors cursor-pointer"
            style={
              isActive
                ? {
                    backgroundColor: palette.tintBg,
                    color: palette.accentText,
                    borderBottom: `2px solid ${palette.accentText}`,
                  }
                : { color: '#6B6560', borderBottom: '2px solid transparent' }
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
