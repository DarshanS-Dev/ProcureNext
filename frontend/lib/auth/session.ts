/**
 * Session identity, derived from the JWT the backend issues.
 *
 * The backend has no /auth/me route, but auth_service.create_access_token puts
 * everything the UI needs into the token payload: `sub` (user id as a string),
 * `role`, `exp` and `iat`. So the signed-in user's identity is read from the
 * token rather than from a role dropdown — the previous build let the user pick
 * their own role at the login screen, which had nothing to do with the account
 * the server actually authenticated.
 *
 * The signature is NOT verified here, and it must not be trusted for access
 * control: every endpoint re-validates the token server-side via
 * app/auth/dependencies.py. This is purely for deciding what to render.
 */

'use client';

import { useEffect, useState } from 'react';

import { RoleEnum, RoleSlug, roleToSlug } from '@/lib/types/api';
import { clearToken, getToken } from '@/lib/api/client';

export interface Session {
  userId: number;
  role: RoleEnum;
  roleSlug: RoleSlug;
  /** Expiry as epoch milliseconds. */
  expiresAt: number;
}

interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

function decodePayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

const VALID_ROLES: RoleEnum[] = [
  'officer',
  'startup',
  'evaluator',
  'independent_evaluator',
  'admin',
];

/** Reads the current session, or null when signed out / expired / malformed. */
export function readSession(): Session | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodePayload(token);
  if (!payload?.sub || !payload.role) return null;

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return null;

  const role = payload.role as RoleEnum;
  if (!VALID_ROLES.includes(role)) return null;

  const expiresAt = (payload.exp ?? 0) * 1000;
  if (expiresAt && expiresAt <= Date.now()) {
    // Expired locally — drop it rather than firing a request guaranteed to 401.
    clearToken();
    return null;
  }

  return { userId, role, roleSlug: roleToSlug(role), expiresAt };
}

/** Landing route for a role, used after login and by the route guard. */
export function homeRouteFor(role: RoleEnum): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'officer':
      return '/officer/dashboard';
    case 'evaluator':
      return '/evaluator/dashboard';
    case 'independent_evaluator':
      return '/independent-evaluator/dashboard';
    case 'startup':
    default:
      return '/startup/dashboard';
  }
}

export const ROLE_LABELS: Record<RoleEnum, string> = {
  startup: 'Startup Founder',
  officer: 'Nodal Officer',
  evaluator: 'Evaluator',
  independent_evaluator: 'Independent Evaluator',
  admin: 'Platform Admin',
};

export function signOut() {
  clearToken();
}

/**
 * Session as React state. Null on the first render (localStorage is not
 * readable during SSR), then the real value after mount — so callers must gate
 * requests that need `userId` on it being non-null.
 */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  return session;
}
