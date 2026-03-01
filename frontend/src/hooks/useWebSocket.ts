import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentLog } from "../types";

export function useWebSocket(runId: string | null) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!runId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/runs/${runId}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const log: AgentLog = JSON.parse(event.data);
      setLogs((prev) => [...prev, log]);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [runId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const clear = useCallback(() => setLogs([]), []);

  return { logs, connected, clear };
}
