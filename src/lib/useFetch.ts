"use client";

import { useEffect, useState, useCallback } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Simple data-fetching hook with manual refetch. */
export function useFetch<T>(url: string | null, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Track the "fetch key" (url + nonce + deps) to reset state during render when it changes.
  const depsKey = JSON.stringify(deps);
  const fetchKey = `${url}::${nonce}::${depsKey}`;
  const [prevKey, setPrevKey] = useState(fetchKey);

  if (prevKey !== fetchKey) {
    setPrevKey(fetchKey);
    // Reset state synchronously during render (React-recommended pattern)
    setLoading(!!url);
    setError(null);
    if (!url) setData(null);
  }

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Fetch error");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  return { data, loading, error, refetch };
}

/** Build a query string from an object, skipping null/undefined/empty. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "" || v === "all") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
