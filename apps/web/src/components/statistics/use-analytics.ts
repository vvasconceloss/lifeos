import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { useCallback, useEffect, useState } from "react";
import type { AnalyticsResponse } from "@lifeos/shared";

export function useAnalytics(weeks = 12) {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setError(false);
      try {
        const res = await api.get<{ stats: AnalyticsResponse }>(
          `/stats/analytics?weeks=${weeks}`,
        );
        if (!cancelled) setAnalytics(res.data.stats);
      } catch (e) {
        if (!cancelled && !isUnauthorizedError(e)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, [weeks, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return { analytics, loading, error, retry };
}
