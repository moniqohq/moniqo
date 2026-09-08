import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Runs `fn` whenever `deps` change, tracking independent loading/error state
 * per call site. Return `null` from `fn` (instead of a promise) to signal
 * "not ready to fetch yet" — the hook stays in the loading state rather than
 * resolving as successfully-empty.
 */
export function useAsync<T>(fn: () => Promise<T> | null, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const fnRef = useRef(fn);

  // Keeps the latest fetcher without adding it to the effect's dependency
  // array (it's a fresh arrow function every render in useHomeDashboard).
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    const promise = fnRef.current();
    if (!promise) {
      setState({ data: null, loading: true, error: null });
      return;
    }
    // No query-library cache layer yet; this hook owns the fetch lifecycle directly.
    setState((prev) => ({ ...prev, loading: true, error: null }));
    promise
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, refetch };
}
