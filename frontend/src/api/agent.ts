import type { IntegrationStatus } from "../types";

const BASE = "/api/v1";

export async function fetchIntegrations(): Promise<IntegrationStatus[]> {
  const resp = await fetch(`${BASE}/integrations`);
  if (!resp.ok) throw new Error("Failed to fetch integrations");
  return resp.json();
}
