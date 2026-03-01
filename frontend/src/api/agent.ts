import type { IntegrationHealth, IntegrationStatus } from "../types";

const BASE = "/api/v1";

export async function fetchIntegrations(): Promise<IntegrationStatus[]> {
  const resp = await fetch(`${BASE}/integrations`);
  if (!resp.ok) throw new Error("Failed to fetch integrations");
  return resp.json();
}

export async function fetchIntegrationHealth(): Promise<IntegrationHealth[]> {
  const resp = await fetch(`${BASE}/integrations/health`);
  if (!resp.ok) throw new Error("Failed to fetch integration health");
  return resp.json();
}
