import type { ChatMessagesResponse } from "../types";

const BASE = "/api/v1";

export async function fetchChatMessages(
  limit: number = 50,
  offset: number = 0,
  channelId?: string,
): Promise<ChatMessagesResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (channelId) params.set("channel_id", channelId);
  const resp = await fetch(`${BASE}/chat/messages?${params}`);
  if (!resp.ok) throw new Error("Failed to fetch chat messages");
  return resp.json();
}
