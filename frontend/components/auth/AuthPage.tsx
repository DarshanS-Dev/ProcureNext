'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '@/lib/types/api';
import {
  Rocket,
  ShieldCheck,
  Award,
  FlaskConical,
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  ChevronRight,
  Layers,
  Sparkle,
  Zap,
  Globe
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess?: (user: { email: string; role: UserRole; name: string }) => void;
}

// Pale Tint Background + Clear Saturated Text/Icon Color Palette
const ROLES: {
  id: UserRole;
  title: string;
  badge: string;
  desc: string;
  icon: React.ElementType;
  tintBg: string;      // Barely-there background tint
  darkText: string;    // Clear, rich saturated text & icon color
  borderCol: string;   // Matching subtle border color
  stats: string;
}[] = [
  {
    id: 'startup',
    title: 'Startup Founder',
    badge: 'Innovator',
    desc: 'Submit proposals, track eligibility, access sandbox trials.',
    icon: Rocket,
    tintBg: 'bg-[#EAF7ED]',      // Barely-there mint
    darkText: 'text-[#1E9E5A]',    // Clear emerald
    borderCol: 'border-[#B8E6C4]', // Soft mint border
    stats: '1,420+ Active Startups'
  },
  {
    id: 'officer',
    title: 'Nodal Officer',
    badge: 'Procurement Lead',
    desc: 'Draft problem statements, manage compliance & review applications.',
    icon: ShieldCheck,
    tintBg: 'bg-[#FDF3DC]',      // Barely-there cream
    darkText: 'text-[#B8860B]',    // Rich amber/gold
    borderCol: 'border-[#F7E1B5]', // Soft cream border
    stats: '$42M Allocated Pool'
  },
  {
    id: 'evaluator',
    title: 'Evaluator',
    badge: 'Expert Panelist',
    desc: 'Score technical & commercial bids with COI compliance.',
    icon: Award,
    tintBg: 'bg-[#E9F1FB]',      // Barely-there sky
    darkText: 'text-[#2563EB]',    // Clear blue
    borderCol: 'border-[#BFD7F8]', // Soft sky border
    stats: '85 Panel Members'
  },
  {
    id: 'independent-evaluator',
    title: 'Sandbox Evaluator',
    badge: 'Verification Lead',
    desc: 'Validate technical sandbox outcomes & KPI verdicts.',
    icon: FlaskConical,
    tintBg: 'bg-[#FBEFE6]',      // Barely-there peach
    darkText: 'text-[#D2691E]',    // Clear burnt orange
    borderCol: 'border-[#F5CFB8]', // Soft peach border
    stats: '99.4% KPI Accuracy'
  },
  {
    id: 'admin',
    title: 'Platform Admin',
    badge: 'Governance',
    desc: 'System governance, audit trail oversight, and user management.',
    icon: Lock,
    tintBg: 'bg-[#FBEAEC]',      // Barely-there pink
    darkText: 'text-[#C81E4A]',    // Clear rose/crimson
    borderCol: 'border-[#F5C2C9]', // Soft pink border
    stats: 'Full Audit Trail Enabled'
  }
];

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('startup');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');

  const currentRoleConfig = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      if (mode === 'login') {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: 'Authentication failed' }));
          alert(`Login Error: ${errData.detail || 'Invalid credentials'}`);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
        }

        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess({
            email,
            role: selectedRole,
            name: fullName || email.split('@')[0],
          });
        }
      } else {
        // Register Startup Account
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: fullName || 'New Startup User',
            role: 'startup',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: 'Registration failed' }));
          alert(`Registration Error: ${errData.detail || 'Could not create account'}`);
          setIsLoading(false);
          return;
        }

        const registeredUser = await res.json();
        
        // Auto-login after registration
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData.access_token) {
            localStorage.setItem('token', loginData.access_token);
          }
        }

        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess({
            email: registeredUser.email,
            role: registeredUser.role || 'startup',
            name: registeredUser.name || fullName,
          });
        }
      }
    } catch (err: any) {
      alert(`Network Error: Ensure FastAPI server is running at ${API_BASE}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F6F2] text-black font-sans relative overflow-x-hidden flex flex-col justify-between p-4 md:p-8">
      {/* Decorative Canvas Badges */}

      {/* Top Left Wavy Doodle & Geometric Star */}
      <motion.div
        animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-8 left-8 hidden lg:block pointer-events-none z-0"
      >
        <div className="w-12 h-12 bg-[#FDF3DC] rounded-xl border border-black/20 shadow-sm flex items-center justify-center rotate-12">
          <Sparkles className="w-6 h-6 text-[#B8860B]" />
        </div>
      </motion.div>

      {/* Top Right Big Starburst */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-10 -right-10 hidden md:block pointer-events-none z-0 opacity-80"
      >
        <div className="w-44 h-44 bg-[#FBEFE6] border border-black/20 clip-path-star shadow-sm flex items-center justify-center">
          <span className="text-[#D2691E] font-black text-xs uppercase tracking-widest rotate-45">SETU 2024</span>
        </div>
      </motion.div>

      {/* Bottom Left Badge */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], rotate: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-6 left-6 hidden md:block pointer-events-none z-0"
      >
        <div className="w-20 h-20 bg-[#E9F1FB] border border-black/20 shadow-sm rounded-xl flex items-center justify-center -rotate-12">
          <Zap className="w-10 h-10 text-[#2563EB]" />
        </div>
      </motion.div>

      {/* Bottom Right Spark Badge */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-10 right-12 hidden lg:block pointer-events-none z-0"
      >
        <div className="w-16 h-16 bg-[#EAF7ED] border border-black/20 shadow-sm rounded-full flex items-center justify-center">
          <Globe className="w-8 h-8 text-[#1E9E5A]" />
        </div>
      </motion.div>

      {/* TOP HEADER NAVIGATION BAR */}
      <header className="relative z-20 max-w-7xl mx-auto w-full flex items-center justify-between py-2 px-2 md:px-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/procurenext-logo.svg"
            alt="ProcureNext Logo"
            className="h-10 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-[#1B365D] leading-none">
              procure<span className="text-[#1B365D]">next</span>
            </span>
            <span className="text-[10px] text-[#6B6560] font-semibold tracking-wider uppercase mt-0.5">
              Government Procurement Portal
            </span>
          </div>
        </div>

        {/* Center Pill Nav Bar */}
        <div className="hidden md:flex items-center gap-1 bg-white border border-black/20 shadow-sm rounded-full px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
          <span className="bg-[#EAF7ED] text-[#1E9E5A] px-3 py-1 rounded-full font-black border border-[#B8E6C4]">BENEFITS</span>
          <span className="px-3 py-1 text-gray-600 hover:text-black cursor-pointer">HOW IT WORKS</span>
          <span className="px-3 py-1 text-gray-600 hover:text-black cursor-pointer">PLANS</span>
          <span className="px-3 py-1 text-gray-600 hover:text-black cursor-pointer">FAQ</span>
        </div>

        {/* Top Right Action Button */}
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none text-black font-black text-xs uppercase px-5 py-2.5 rounded-full transition-all cursor-pointer"
        >
          {mode === 'login' ? 'SIGN UP' : 'SIGN IN'}
        </button>
      </header>

      {/* MAIN HERO CONTENT */}
      <main className="relative z-10 max-w-7xl mx-auto w-full my-6 flex flex-col items-center">
        {/* Headline with Vivid Emerald Anchor Pill */}
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#EAF7ED] text-[#1E9E5A] border border-[#B8E6C4] px-4 py-1 rounded-full font-extrabold text-xs uppercase tracking-widest">
            <Sparkle className="w-3.5 h-3.5 text-[#1E9E5A]" /> Next-Gen Govt Procurement
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black leading-tight">
            Master public procurement with <span className="inline-block bg-[#00E699] border-2 border-black shadow-[2px_2px_0px_#000] px-4 py-0.5 rounded-full text-black">ease</span>
          </h1>

          <p className="text-xs md:text-sm font-bold text-gray-600 max-w-xl mx-auto leading-relaxed">
            Multi-role governance portal for Startups, Nodal Officers, Evaluators, and Sandbox Leads.
          </p>
        </div>

        {/* MAIN AUTH CONTAINER CARD (HERO CARD: 2px border, 4px 4px 0 black shadow) */}
        <div className="w-full max-w-5xl bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 5 COLS: Role Selector */}
          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-200 pb-6 lg:pb-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#B8860B]" /> Select Account Role
              </span>
              <span className="text-[10px] font-black uppercase bg-black text-white px-2.5 py-0.5 rounded-full">5 Roles</span>
            </div>

            <div className="space-y-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;

                return (
                  <motion.div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    className={`cursor-pointer p-3 rounded-2xl transition-all flex items-start gap-3 relative border ${
                      isSelected
                        ? `${r.tintBg} ${r.borderCol} shadow-[1.5px_1.5px_0px_#000]`
                        : 'bg-white border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {/* Unified Pale Tint Icon Box with Saturated Icon */}
                    <div
                      className={`p-2 rounded-xl border ${r.tintBg} ${r.borderCol} ${r.darkText} font-black shrink-0`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black truncate ${isSelected ? r.darkText : 'text-black'}`}>{r.title}</span>
                        {/* Pale Tint Background + Rich Saturated Text */}
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${r.tintBg} ${r.borderCol} ${r.darkText}`}>
                          {r.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">{r.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Metric Badge */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${currentRoleConfig.tintBg} ${currentRoleConfig.borderCol} ${currentRoleConfig.darkText}`}>
              <span className="font-black uppercase">ACTIVE ROLE METRIC</span>
              <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[10px] font-black">{currentRoleConfig.stats}</span>
            </div>
          </div>

          {/* RIGHT 7 COLS: Form & Auth Action */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Mode Switcher Buttons */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex bg-[#F7F6F2] p-1 rounded-2xl border border-black/20">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    mode === 'login'
                      ? 'bg-[#00E699] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    mode === 'signup'
                      ? 'bg-[#00E699] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Selected Persona:</span>
                <span className={`text-xs font-black uppercase ${currentRoleConfig.darkText}`}>{currentRoleConfig.title}</span>
              </div>
            </div>

            {/* Dynamic Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-700">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Malhotra"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#F7F6F2] border border-gray-300 focus:border-black rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-black outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-700">
                      {selectedRole === 'startup' ? 'DPIIT Registered Entity Name' : 'Ministry / Organization'}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        required
                        placeholder={selectedRole === 'startup' ? 'AeroTech Defense Labs' : 'Ministry of Defence'}
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full bg-[#F7F6F2] border border-gray-300 focus:border-black rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-black outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-700">Official Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    placeholder={`${selectedRole}@setu.gov.in`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F7F6F2] border border-gray-300 focus:border-black rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-black outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-gray-700">Password</label>
                  {mode === 'login' && (
                    <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] text-[#1E9E5A] font-bold hover:underline">
                      Forgot?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F7F6F2] border border-gray-300 focus:border-black rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold text-black outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* STRONG ANCHOR CTA BUTTON */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full mt-4 py-3.5 px-6 rounded-full bg-[#00E699] text-black font-black uppercase tracking-wider text-xs border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-[#00D68D] active:shadow-none"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating {selectedRole}...</span>
                  </div>
                ) : (
                  <>
                    <span>TRY FOR FREE / {mode === 'login' ? `AUTHENTICATE AS ${currentRoleConfig.title}` : `REGISTER AS ${currentRoleConfig.title}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Quick Demo Credentials Bar */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2 flex justify-between">
                <span>Quick Test Credentials</span>
                <span className="text-[#1E9E5A]">Click to Auto-fill</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('startup');
                    setEmail('startup@setu.gov.in');
                    setPassword('demo1234');
                    setFullName('Aarav Sharma');
                  }}
                  className="p-2.5 bg-[#EAF7ED] border border-[#B8E6C4] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer hover:border-black"
                >
                  <span className="text-[11px] font-black text-[#1E9E5A]">Startup Account</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#1E9E5A]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('officer');
                    setEmail('officer@setu.gov.in');
                    setPassword('demo1234');
                    setFullName('Officer Vikram Malhotra');
                  }}
                  className="p-2.5 bg-[#FDF3DC] border border-[#F7E1B5] rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer hover:border-black"
                >
                  <span className="text-[11px] font-black text-[#B8860B]">Officer Account</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#B8860B]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CAROUSEL CARDS */}
        <div className="w-full max-w-5xl mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:border-black transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#EAF7ED] border border-[#B8E6C4] text-[#1E9E5A] flex items-center justify-center font-black">
              1
            </div>
            <div className="mt-4">
              <div className="text-xs font-black uppercase text-black">Startup Portal</div>
              <div className="text-[11px] font-bold text-gray-500">DPIIT Verification</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:border-black transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#FDF3DC] border border-[#F7E1B5] text-[#B8860B] flex items-center justify-center font-black">
              2
            </div>
            <div className="mt-4">
              <div className="text-xs font-black uppercase text-black">Nodal Officer</div>
              <div className="text-[11px] font-bold text-gray-500">Problem Statement Builder</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:border-black transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#E9F1FB] border border-[#BFD7F8] text-[#2563EB] flex items-center justify-center font-black">
              3
            </div>
            <div className="mt-4">
              <div className="text-xs font-black uppercase text-black">Rubric Evaluator</div>
              <div className="text-[11px] font-bold text-gray-500">7-Criterion Scoring</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between hover:border-black transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#FBEFE6] border border-[#F5CFB8] text-[#D2691E] flex items-center justify-center font-black">
              4
            </div>
            <div className="mt-4">
              <div className="text-xs font-black uppercase text-black">Sandbox Evaluator</div>
              <div className="text-[11px] font-bold text-gray-500">KPI Performance Verdict</div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full text-center py-4 text-[11px] font-bold uppercase text-gray-500 border-t border-gray-200 mt-6">
        SETU ProcureNext • Public Innovation & Procurement Governance Platform
      </footer>
    </div>
  );
};
