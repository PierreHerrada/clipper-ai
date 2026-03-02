import { useCallback, useEffect, useState } from "react";
import {
  fetchRepositories,
  syncRepositories,
  toggleRepository,
} from "../api/repositories";
import type { Repository } from "../types";

export function useRepositories() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRepositories();
      setRepos(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sync = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);
      await syncRepositories();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        setError(null);
        const updated = await toggleRepository(id, enabled);
        setRepos((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    },
    [],
  );

  return { repos, loading, syncing, error, sync, toggle, reload: load };
}
