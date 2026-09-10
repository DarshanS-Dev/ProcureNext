'use client';

/**
 * Sign-in / sign-up screen.
 *
 * Behaviour corrections vs. the mock version:
 * - The role is no longer chosen in the UI. POST /auth/login returns a JWT
 *   carrying the account's real role, and that is what the app routes on;
 *   picking "Platform Admin" in a dropdown never made anyone an admin, it just
 *   sent them to a dashboard where every request 403'd.
 * - Self-registration creates a startup account only. auth_service.
 *   register_startup forces role='startup', and there is no public route for
 *   the other four roles — an admin provisions those via POST /admin/users.
 *   The role cards below say so rather than offering a sign-up that cannot work.
 * - Errors render inline with the server's `detail`, instead of alert().
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  Eye,
  EyeOff,
  FlaskConical,
  Lock,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkle,
  User,
} from 'lucide-react';
import { ApiError, api, setToken } from '@/lib/api/client';
import { RoleEnum } from '@/lib/types/api';

interface AuthPageProps {
  /** Called with the authenticated account's real role, read from the JWT. */
  onAuthenticated: (role: RoleEnum) => void;
  initialMode?: 'login' | 'signup';
}

const ROLE_CARDS: {
  id: RoleEnum;
  title: string;
  desc: string;
  icon: React.ElementType;
  tintBg: string;
  darkText: string;
  borderCol: string;
  selfServe: boolean;
}[] = [
  {
    id: 'startup',
    title: 'Startup Founder',
    desc: 'Submit proposals, track eligibility, run sandbox trials.',
    icon: Rocket,
    tintBg: 'bg-[#F3F3EE]',
    darkText: 'text-[#18181B]',
    borderCol: 'border-[#E5E5E0]',
    selfServe: true,
  },
  {
    id: 'officer',
    title: 'Nodal Officer',
    desc: 'Draft problem statements, review applications, award pilots.',
    icon: ShieldCheck,
    tintBg: 'bg-[#F3F3EE]',
    darkText: 'text-[#18181B]',
    borderCol: 'border-[#E5E5E0]',
    selfServe: false,
  },
  {
    id: 'evaluator',
    title: 'Evaluator',
    desc: 'Score technical proposals against the rubric, declare conflicts.',
    icon: Award,
    tintBg: 'bg-[#F3F3EE]',
    darkText: 'text-[#18181B]',
    borderCol: 'border-[#E5E5E0]',
    selfServe: false,
  },
  {
    id: 'independent_evaluator',
    title: 'Independent Evaluator',
    desc: 'Verify sandbox trials, milestones and KPI verdicts.',
    icon: FlaskConical,
    tintBg: 'bg-[#F3F3EE]',
    darkText: 'text-[#18181B]',
    borderCol: 'border-[#E5E5E0]',
    selfServe: false,
  },
  {
    id: 'admin',
    title: 'Platform Admin',
    desc: 'Provision accounts, verify compliance, compile records.',
    icon: Lock,
    tintBg: 'bg-[#F3F3EE]',
    darkText: 'text-[#18181B]',
    borderCol: 'border-[#E5E5E0]',
    selfServe: false,
  },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthenticated,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  /** Logs in and hands the caller the role the *server* says this account has. */
  const authenticate = async () => {
    const token = await api.login({ email, password });
    setToken(token.access_token);

    // Read the role straight back out of the token we were just issued.
    const payload = JSON.parse(
      atob(token.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { role?: string };

    onAuthenticated((payload.role as RoleEnum) ?? 'startup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // role is forced to 'startup' server-side; we do not send one.
        await api.register({ email, password, name: fullName });
      }
      await authenticate();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.isNetworkFailure
            ? 'Cannot reach the API. Start the backend with: uvicorn app.main:app --reload'
            : err.detail,
        );
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F4EF] text-black font-sans flex flex-col justify-between p-4 md:p-8">
      <header className="relative z-20 max-w-7xl mx-auto w-full flex items-center justify-between py-2 px-2 md:px-4">
        <div className="flex items-center gap-2.5">
          <img src="/procurenext-logo.svg" alt="" className="h-10 w-auto" />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-[#18181B] leading-none">
              procurenext
            </span>
            <span className="text-[10px] text-[#6B7280] font-semibold tracking-wider uppercase mt-0.5">
              Government Procurement Portal
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
          className="bg-white border border-[#E5E5E0] hover:border-[#18181B] text-black font-black text-xs uppercase px-5 py-2.5 rounded-full transition-all cursor-pointer"
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto w-full my-6 flex flex-col items-center">
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#D7FD44] text-[#18181B] px-4 py-1 rounded-full font-extrabold text-xs uppercase tracking-widest">
            <Sparkle className="w-3.5 h-3.5" /> Outcome-based public procurement
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black leading-tight">
            Run startup pilots with{' '}
            <span className="inline-block bg-[#D7FD44] border border-[#E5E5E0] px-4 py-0.5 rounded-full">
              evidence
            </span>
          </h1>

          <p className="text-xs md:text-sm font-bold text-gray-600 max-w-xl mx-auto leading-relaxed">
            One pipeline from problem statement to verified pilot outcome — for
            startups, nodal officers, evaluators and auditors.
          </p>
        </div>

        <div className="w-full max-w-5xl bg-white border border-[#E5E5E0] rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Roles — informational. The account's role comes from the server. */}
          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-200 pb-6 lg:pb-0 lg:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Roles on the platform
              </span>
              <span className="text-[10px] font-black uppercase bg-black text-white px-2.5 py-0.5 rounded-full">
                5 Roles
              </span>
            </div>

            <div className="space-y-2">
              {ROLE_CARDS.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-2xl flex items-start gap-3 border ${r.tintBg} ${r.borderCol}`}
                  >
                    <div
                      className={`p-2 rounded-xl border bg-white ${r.borderCol} ${r.darkText} shrink-0`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-black ${r.darkText}`}>
                          {r.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-white ${r.borderCol} ${r.darkText} shrink-0`}
                        >
                          {r.selfServe ? 'Self sign-up' : 'Admin-issued'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] font-semibold text-gray-500 leading-relaxed">
              Only startup accounts can be created here. Officer, evaluator,
              independent-evaluator and admin accounts are provisioned by a
              platform admin, then signed in with the same form.
            </p>
          </div>

          {/* Credentials */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex bg-[#F4F4EF] p-1 rounded-2xl border border-[#E5E5E0]">
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      mode === m
                        ? 'bg-[#D7FD44] text-black border border-black'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    {m === 'login' ? 'Sign In' : 'Create Startup Account'}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1">
                  <label
                    htmlFor="auth-name"
                    className="text-xs font-bold uppercase text-gray-700"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. Vikram Malhotra"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#F4F4EF] border border-[#E5E5E0] focus:border-[#18181B] rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-black outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="auth-email"
                  className="text-xs font-bold uppercase text-gray-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@department.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F4F4EF] border border-[#E5E5E0] focus:border-[#18181B] rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-black outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="auth-password"
                  className="text-xs font-bold uppercase text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F4F4EF] border border-[#E5E5E0] focus:border-[#18181B] rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold text-black outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#F5C2C9] bg-[#FBEAEC] px-4 py-3 text-[11px] font-bold text-[#C81E4A] leading-relaxed"
                >
                  {error}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#D7FD44] text-black font-black uppercase tracking-wider text-xs border border-[#E5E5E0] flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-[#C3EB30] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border border-[#E5E5E0] border-t-transparent rounded-full animate-spin" />
                    <span>{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login' ? 'Sign in' : 'Create account & sign in'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto w-full text-center py-4 text-[11px] font-bold uppercase text-gray-500 border-t border-gray-200 mt-6">
        ProcureNext • Public Innovation & Procurement Governance Platform
      </footer>
    </div>
  );
};
