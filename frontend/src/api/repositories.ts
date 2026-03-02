import type { Repository, SyncResult } from "../types";
import { apiFetch } from "./client";

const BASE = "/api/v1";

export async function fetchRepositories(): Promise<Repository[]> {
  const resp = await apiFetch(`${BASE}/repositories`);
  if (!resp.ok) throw new Error("Failed to fetch repositories");
  return resp.json();
}

export async function syncRepositories(): Promise<SyncResult> {
  const resp = await apiFetch(`${BASE}/repositories/sync`, { method: "POST" });
  if (!resp.ok) throw new Error("Failed to sync repositories");
  return resp.json();
}

export async function toggleRepository(
  id: string,
  enabled: boolean,
): Promise<Repository> {
  const resp = await apiFetch(`${BASE}/repositories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!resp.ok) throw new Error("Failed to update repository");
  return resp.json();
}
