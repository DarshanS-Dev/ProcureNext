'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppNavbar, AppSidebar } from '@/components/shared/AppNavigation';
import { UserRole } from '@/lib/types/api';

interface AppLayoutProps {
  children: React.ReactNode;
  defaultRole?: UserRole;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, defaultRole = 'officer' }) => {
  const [role, setRole] = useState<UserRole>(defaultRole);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F1' }}>
      <AppNavbar currentRole={role} onRoleChange={setRole} />
      <div className="flex">
        <AppSidebar role={role} />
        <motion.main
          key={role}
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
