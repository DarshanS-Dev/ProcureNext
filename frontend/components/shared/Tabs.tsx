'use client';

/**
 * Tab selection that lives in the URL (?tab=…), so a tab is linkable, survives
 * a reload, and works with the back button.
 *
 * The strip itself is now `PillTabs` from the design system — the old
 * underlined, role-tinted, uppercase strip is gone. `TabStrip` is kept as a
 * thin alias so existing call sites (which still pass a `role`) keep working.
 */

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserRole } from '@/lib/types/api';
import { PillTabs } from '@/components/shared/design-system';

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
  /** Ignored — tabs no longer take a role colour. */
  role?: UserRole;
}> = ({ tabs, active, onChange }) => (
  <PillTabs tabs={tabs} active={active} onChange={onChange} />
);
