import { useCallback, useEffect, useState } from "react";
import { fetchChatMessages } from "../api/chat";
import type { ChatMessage } from "../types";

const PAGE_SIZE = 50;

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (newOffset: number) => {
    try {
      setLoading(true);
      const data = await fetchChatMessages(PAGE_SIZE, newOffset);
      setMessages(data.messages);
      setTotal(data.total);
      setOffset(newOffset);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const nextPage = useCallback(() => {
    const next = offset + PAGE_SIZE;
    if (next < total) load(next);
  }, [offset, total, load]);

  const prevPage = useCallback(() => {
    const prev = Math.max(0, offset - PAGE_SIZE);
    if (prev !== offset) load(prev);
  }, [offset, load]);

  return {
    messages,
    total,
    offset,
    loading,
    error,
    pageSize: PAGE_SIZE,
    nextPage,
    prevPage,
    refresh: () => load(offset),
  };
}
