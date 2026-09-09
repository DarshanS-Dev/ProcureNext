'use client';

/**
 * Loading / empty / error presentation shared by every data-backed screen.
 *
 * The point of ApiErrorState is that the three failure modes a user actually
 * hits look different and need different words: the API being down, the row not
 * existing yet, and the caller's role not being allowed to see it.
 */

import React from 'react';
import { ApiError } from '@/lib/api/client';
import { AlertStrip, DocButton } from '@/components/shared/DesignSystem';
import { FileX2, RefreshCw } from 'lucide-react';

export const LoadingBlock: React.FC<{ label?: string; rows?: number }> = ({
  label = 'Loading…',
  rows = 3,
}) => (
  <div className="space-y-3" role="status" aria-live="polite">
    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-14 rounded-3xl bg-[#F0F0EA] animate-pulse"
        style={{ animationDelay: `${i * 90}ms` }}
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ title, hint, action }) => (
  <div className="p-10 text-center flex flex-col items-center gap-3 bg-white border border-[#E5E5E0] rounded-3xl">
    <span className="w-11 h-11 rounded-full bg-[#F3F3EE] text-[#18181B] flex items-center justify-center">
      <FileX2 className="w-5 h-5" />
    </span>
    <div className="space-y-1">
      <div className="font-bold text-sm text-[#18181B]">{title}</div>
      {hint && (
        <div className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">{hint}</div>
      )}
    </div>
    {action}
  </div>
);

export const ApiErrorState: React.FC<{
  error: ApiError;
  onRetry?: () => void;
  /** Shown instead of the raw detail when the resource simply does not exist. */
  notFoundLabel?: string;
}> = ({ error, onRetry, notFoundLabel }) => {
  if (error.isNotFound && notFoundLabel) {
    return <EmptyState title={notFoundLabel} hint={error.detail} />;
  }

  const title = error.isNetworkFailure
    ? 'Backend unreachable'
    : error.isForbidden
      ? 'Not permitted for your role'
      : error.isNotFound
        ? 'Not found'
        : `Request failed (${error.status})`;

  return (
    <AlertStrip type={error.isForbidden ? 'warning' : 'error'} title={title}>
      <div className="space-y-2">
        <div className="leading-relaxed">{error.detail}</div>
        {error.endpoint && (
          <div className="font-mono text-[10px] opacity-70">{error.endpoint}</div>
        )}
        {onRetry && (
          <DocButton
            size="sm"
            variant="secondary"
            onClick={onRetry}
            icon={<RefreshCw className="w-3 h-3" />}
          >
            Retry
          </DocButton>
        )}
      </div>
    </AlertStrip>
  );
};

/**
 * Renders the standard loading -> error -> empty -> content ladder so pages do
 * not each re-invent it (and quietly skip a branch).
 */
export function QueryBoundary<T>({
  state,
  children,
  loadingLabel,
  emptyWhen,
  empty,
  notFoundLabel,
}: {
  state: {
    data: T | undefined;
    error: ApiError | null;
    loading: boolean;
    refetch: () => void;
  };
  children: (data: T) => React.ReactNode;
  loadingLabel?: string;
  emptyWhen?: (data: T) => boolean;
  empty?: React.ReactNode;
  notFoundLabel?: string;
}) {
  if (state.loading) return <LoadingBlock label={loadingLabel} />;
  if (state.error) {
    return (
      <ApiErrorState
        error={state.error}
        onRetry={state.refetch}
        notFoundLabel={notFoundLabel}
      />
    );
  }
  if (state.data === undefined) return <LoadingBlock label={loadingLabel} />;
  if (emptyWhen?.(state.data) && empty) return <>{empty}</>;
  return <>{children(state.data)}</>;
}

/** Formats an ISO timestamp for display, tolerating null/undefined. */
export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** `iot_hardware` -> `Iot hardware`; used for every enum shown to a human. */
export const humanize = (value?: string | null): string => {
  if (!value) return '—';
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
