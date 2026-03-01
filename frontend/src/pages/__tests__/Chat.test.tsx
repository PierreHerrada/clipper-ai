import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Chat from "../Chat";

vi.mock("../../api/chat", () => ({
  fetchChatMessages: vi.fn(),
}));

import { fetchChatMessages } from "../../api/chat";

describe("Chat", () => {
  it("shows loading state initially", () => {
    vi.mocked(fetchChatMessages).mockReturnValue(new Promise(() => {}));
    render(<Chat />);
    expect(screen.getByText("Loading messages...")).toBeInTheDocument();
  });

  it("shows empty state when no messages", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValueOnce({
      total: 0,
      offset: 0,
      limit: 50,
      messages: [],
    });
    render(<Chat />);
    await waitFor(() => {
      expect(
        screen.getByText(/No messages yet/),
      ).toBeInTheDocument();
    });
  });

  it("renders messages after loading", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValueOnce({
      total: 1,
      offset: 0,
      limit: 50,
      messages: [
        {
          id: "m1",
          channel_id: "C1",
          channel_name: "general",
          user_id: "U1",
          user_name: "Alice",
          message: "Hello world",
          slack_ts: "1.1",
          thread_ts: null,
          task_id: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
    });
    render(<Chat />);
    await waitFor(() => {
      expect(screen.getByText("Chat Messages")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Hello world")).toBeInTheDocument();
      expect(screen.getByText("#general")).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    vi.mocked(fetchChatMessages).mockRejectedValueOnce(
      new Error("Network error"),
    );
    render(<Chat />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows thread reply indicator", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValueOnce({
      total: 1,
      offset: 0,
      limit: 50,
      messages: [
        {
          id: "m2",
          channel_id: "C1",
          channel_name: "general",
          user_id: "U1",
          user_name: "Bob",
          message: "Thread reply here",
          slack_ts: "1.2",
          thread_ts: "1.1",
          task_id: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
    });
    render(<Chat />);
    await waitFor(() => {
      expect(screen.getByText("thread reply")).toBeInTheDocument();
    });
  });
});
