"use client";
import { useCallback, useState } from "react";
import { toApiError } from "@/lib/api-error";
export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (job: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const value = await job();
      setData(value);
      return value;
    } catch (err) {
      setError(toApiError(err).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { data, loading, error, run };
}
