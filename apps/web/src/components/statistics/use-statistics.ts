import { toast } from "sonner";
import { api } from "@/lib/api";
import { isUnauthorizedError } from "@/lib/errors";
import { useCallback, useEffect, useState } from "react";
import type { StatsOverview } from "./types";

export function useStatistics() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setError(false);
      try {
        const res = await api.get<{ stats: StatsOverview }>(`/stats/overview?year=${year}&month=${month}`);
        if (!cancelled) setOverview(res.data.stats);
      } catch (error) {
        if (!cancelled && !isUnauthorizedError(error)) {
          setError(true);
          toast.error("Failed to load statistics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [year, month, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return { overview, loading, error, retry, monthOffset, setMonthOffset, targetDate };
}
