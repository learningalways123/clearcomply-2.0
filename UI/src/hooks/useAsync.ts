// Reusable hook for async operations (data fetching, mutations).
// Replaces the boilerplate useEffect + loading/error state pattern.

import { useState, useCallback, useRef, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// useAsync: run an async function, track loading/error/data.
// Pass `immediate: true` to run it on mount automatically.
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate = false,
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  // Keep a ref to latest asyncFn so the execute callback is stable
  const fnRef = useRef(asyncFn);
  useEffect(() => { fnRef.current = asyncFn; });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await fnRef.current();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setState({ data: null, loading: false, error: message });
      throw err;
    }
  }, []);

  useEffect(() => {
    if (immediate) { execute(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, execute, setData: (data: T) => setState(s => ({ ...s, data })) };
}
