import { useCallback, useEffect, useState } from "react";
import { fetchIntegrationHealth, fetchIntegrations } from "../api/agent";
import type { IntegrationHealth, IntegrationStatus } from "../types";

export function useIntegrationHealth() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [health, setHealth] = useState<IntegrationHealth[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchIntegrations();
        setIntegrations(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      setChecking(true);
      const data = await fetchIntegrationHealth();
      setHealth(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setChecking(false);
    }
  }, []);

  return { integrations, health, loading, checking, error, checkHealth };
}
