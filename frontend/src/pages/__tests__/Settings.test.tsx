import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Settings from "../Settings";

vi.mock("../../api/settings", () => ({
  fetchSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

vi.mock("../../api/repositories", () => ({
  fetchRepositories: vi.fn(),
  syncRepositories: vi.fn(),
  toggleRepository: vi.fn(),
}));

import { fetchSetting, updateSetting } from "../../api/settings";
import {
  fetchRepositories,
  syncRepositories,
  toggleRepository,
} from "../../api/repositories";

function mockDefaults() {
  vi.mocked(fetchSetting).mockResolvedValue({
    key: "base_prompt",
    value: "",
    updated_at: null,
  });
  vi.mocked(fetchRepositories).mockResolvedValue([]);
}

describe("Settings", () => {
  it("shows loading state initially", () => {
    vi.mocked(fetchSetting).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchRepositories).mockResolvedValue([]);
    render(<Settings />);
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();
  });

  it("renders settings page after loading", async () => {
    mockDefaults();
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Base Prompt")).toBeInTheDocument();
    });
  });

  it("displays fetched value in textarea", async () => {
    vi.mocked(fetchSetting).mockResolvedValueOnce({
      key: "base_prompt",
      value: "My custom prompt",
      updated_at: "2026-03-02T00:00:00Z",
    });
    vi.mocked(fetchRepositories).mockResolvedValue([]);
    render(<Settings />);
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("My custom prompt");
    });
  });

  it("saves setting on button click", async () => {
    mockDefaults();
    vi.mocked(updateSetting).mockResolvedValueOnce({
      key: "base_prompt",
      value: "",
      updated_at: "2026-03-02T12:00:00Z",
    });
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("Save")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(updateSetting).toHaveBeenCalledWith("base_prompt", "");
    });
  });

  it("shows error when fetch fails", async () => {
    vi.mocked(fetchSetting).mockRejectedValueOnce(
      new Error("Failed to fetch setting"),
    );
    vi.mocked(fetchRepositories).mockResolvedValue([]);
    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch setting"),
      ).toBeInTheDocument();
    });
  });

  it("shows last saved timestamp", async () => {
    vi.mocked(fetchSetting).mockResolvedValueOnce({
      key: "base_prompt",
      value: "prompt",
      updated_at: "2026-03-02T10:30:00Z",
    });
    vi.mocked(fetchRepositories).mockResolvedValue([]);
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
    });
  });

  it("renders repos table with data", async () => {
    mockDefaults();
    vi.mocked(fetchRepositories).mockResolvedValueOnce([
      {
        id: "repo-1",
        full_name: "org/repo-1",
        name: "repo-1",
        description: "First repo",
        private: false,
        enabled: true,
        default_branch: "main",
        github_url: "https://github.com/org/repo-1",
        last_synced_at: null,
        created_at: "2026-03-02T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
      },
    ]);
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("org/repo-1")).toBeInTheDocument();
      expect(screen.getByText("First repo")).toBeInTheDocument();
      expect(screen.getByText("Public")).toBeInTheDocument();
    });
  });

  it("shows empty state when no repos", async () => {
    mockDefaults();
    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByText(/No repositories found/),
      ).toBeInTheDocument();
    });
  });

  it("calls sync on button click", async () => {
    mockDefaults();
    vi.mocked(syncRepositories).mockResolvedValueOnce({
      created: 2,
      updated: 0,
      total: 2,
    });
    // After sync, reload returns repos
    vi.mocked(fetchRepositories)
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce([
        {
          id: "repo-1",
          full_name: "org/repo-1",
          name: "repo-1",
          description: "",
          private: false,
          enabled: false,
          default_branch: "main",
          github_url: "https://github.com/org/repo-1",
          last_synced_at: "2026-03-02T00:00:00Z",
          created_at: "2026-03-02T00:00:00Z",
          updated_at: "2026-03-02T00:00:00Z",
        },
      ]);
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("Sync from GitHub")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Sync from GitHub"));
    await waitFor(() => {
      expect(syncRepositories).toHaveBeenCalled();
    });
  });

  it("calls toggle on switch click", async () => {
    vi.mocked(fetchSetting).mockResolvedValue({
      key: "base_prompt",
      value: "",
      updated_at: null,
    });
    vi.mocked(fetchRepositories).mockResolvedValueOnce([
      {
        id: "repo-1",
        full_name: "org/repo-1",
        name: "repo-1",
        description: "",
        private: false,
        enabled: false,
        default_branch: "main",
        github_url: "https://github.com/org/repo-1",
        last_synced_at: null,
        created_at: "2026-03-02T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
      },
    ]);
    vi.mocked(toggleRepository).mockResolvedValueOnce({
      id: "repo-1",
      full_name: "org/repo-1",
      name: "repo-1",
      description: "",
      private: false,
      enabled: true,
      default_branch: "main",
      github_url: "https://github.com/org/repo-1",
      last_synced_at: null,
      created_at: "2026-03-02T00:00:00Z",
      updated_at: "2026-03-02T00:00:00Z",
    });
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("switch"));
    await waitFor(() => {
      expect(toggleRepository).toHaveBeenCalledWith("repo-1", true);
    });
  });
});
