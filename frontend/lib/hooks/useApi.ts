'use client';

/**
 * Small data-fetching primitives shared by every page.
 *
 * There is no react-query in this project, so these cover the three things
 * every screen needs: fetch-on-mount with loading/error state, refetch after a
 * mutation, and a mutation runner that surfaces the server's error message
 * instead of swallowing it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  /** Re-runs the fetcher; safe to call from event handlers. */
  refetch: () => void;
  setData: (value: T) => void;
}

/**
 * Runs `fetcher` on mount and whenever `deps` change.
 *
 * Pass `enabled: false` to hold off (e.g. while an id is still unknown) — the
 * hook then reports loading:false with no data rather than firing a request
 * against `undefined`.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
): QueryState<T> {
  const enabled = options.enabled !== false;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);

  // Keeps a stale in-flight response from overwriting a newer one.
  const runIdRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (runIdRef.current !== runId) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (runIdRef.current !== runId) return;
        setData(undefined);
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, err instanceof Error ? err.message : String(err), ''),
        );
      })
      .finally(() => {
        if (runIdRef.current !== runId) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, refetch, setData };
}

export interface MutationState {
  /** True while the mutation is in flight. */
  pending: boolean;
  /** Server-side failure from the last run, if any. */
  error: ApiError | null;
  /** Success message from the last run, if any. */
  success: string | null;
  run: <T>(
    action: () => Promise<T>,
    options?: { successMessage?: string; onSuccess?: (result: T) => void },
  ) => Promise<T | undefined>;
  reset: () => void;
}

export function useMutation(): MutationState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: { successMessage?: string; onSuccess?: (result: T) => void } = {},
    ): Promise<T | undefined> => {
      setPending(true);
      setError(null);
      setSuccess(null);
      try {
        const result = await action();
        setSuccess(options.successMessage ?? 'Saved.');
        options.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, err instanceof Error ? err.message : String(err), ''),
        );
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { pending, error, success, run, reset };
}
