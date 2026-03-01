import type { CostBreakdown, DashboardStats } from "../types";

const BASE = "/api/v1";

export async function fetchStats(): Promise<DashboardStats> {
  const resp = await fetch(`${BASE}/dashboard/stats`);
  if (!resp.ok) throw new Error("Failed to fetch stats");
  return resp.json();
}

export async function fetchCosts(): Promise<CostBreakdown[]> {
  const resp = await fetch(`${BASE}/dashboard/costs`);
  if (!resp.ok) throw new Error("Failed to fetch costs");
  return resp.json();
}
