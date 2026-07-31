import { toast } from "sonner";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import type { StatsOverview } from "./types";

export function useStatistics() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await api.get<StatsOverview>(`/stats/overview?year=${year}&month=${month}`);
        if (!cancelled) setOverview(res.data);
      } catch {
        if (!cancelled) toast.error("Failed to load statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return { overview, loading, monthOffset, setMonthOffset, targetDate };
}
