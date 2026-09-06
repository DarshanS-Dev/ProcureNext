'use client';
import React from 'react';
import { UserRole } from '@/lib/types/api';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Emblem */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center font-black text-[#8FA888] text-xl tracking-tighter shadow-md">
          S
        </div>
        <div>
          <div className="text-xl font-black tracking-tight text-black flex items-center gap-2">
            SETU <span className="text-[10px] bg-[#8FA888] text-white px-2 py-0.5 rounded-full font-bold uppercase">ProcureNext</span>
          </div>
          <div className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">
            Public Procurement & Innovation Platform
          </div>
        </div>
      </div>

      {/* Center Cycle Badge */}
      <div className="hidden md:flex items-center gap-2 bg-[#8FA888] text-white px-4 py-1.5 rounded-md font-black text-xs uppercase tracking-wide border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
        <span>CURRENT CYCLE: 2024 Q3</span>
        <span className="text-[10px] font-medium text-white/90">(July 1 – Sept 30)</span>
      </div>

      {/* Role Switcher Badge */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold text-black uppercase">Role View:</div>
          <div className="text-[11px] text-gray-500 font-semibold uppercase">{currentRole.replace('-', ' ')}</div>
        </div>
        <select
          value={currentRole}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          className="bg-black text-[#8FA888] font-black text-xs uppercase px-3 py-2 rounded-lg border-2 border-black focus:outline-none cursor-pointer shadow-[2px_2px_0px_#6B8265]"
        >
          <option value="startup">Startup View</option>
          <option value="officer">Nodal Officer View</option>
          <option value="evaluator">Evaluator View</option>
          <option value="independent-evaluator">Independent Evaluator</option>
          <option value="admin">Platform Admin View</option>
        </select>
        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center font-bold text-xs text-black">
          👤
        </div>
      </div>
    </header>
  );
};
