import { useCallback, useEffect, useState } from "react";
import { fetchCosts, fetchStats } from "../api/dashboard";
import type { CostBreakdown, DashboardStats } from "../types";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [costs, setCosts] = useState<CostBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, costsData] = await Promise.all([
        fetchStats(),
        fetchCosts(),
      ]);
      setStats(statsData);
      setCosts(costsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, costs, loading, error, refresh };
}
