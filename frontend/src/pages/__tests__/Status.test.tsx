import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Status from "../Status";

vi.mock("../../api/agent", () => ({
  fetchIntegrations: vi.fn(),
  fetchIntegrationHealth: vi.fn(),
}));

import { fetchIntegrationHealth, fetchIntegrations } from "../../api/agent";

const mockIntegrations = [
  {
    name: "slack",
    description: "Slack bot for task creation",
    active: true,
    missing_env_vars: [],
  },
  {
    name: "jira",
    description: "Jira integration",
    active: false,
    missing_env_vars: ["JIRA_API_TOKEN"],
  },
];

describe("Status", () => {
  it("shows loading state initially", () => {
    vi.mocked(fetchIntegrations).mockReturnValue(new Promise(() => {}));
    render(<Status />);
    expect(screen.getByText("Loading integrations...")).toBeInTheDocument();
  });

  it("renders integrations after loading", async () => {
    vi.mocked(fetchIntegrations).mockResolvedValueOnce(mockIntegrations);
    render(<Status />);
    await waitFor(() => {
      expect(screen.getByText("Integration Status")).toBeInTheDocument();
      expect(screen.getByText("slack")).toBeInTheDocument();
      expect(screen.getByText("jira")).toBeInTheDocument();
      expect(screen.getByText("Configured")).toBeInTheDocument();
      expect(screen.getByText("Not Configured")).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    vi.mocked(fetchIntegrations).mockRejectedValueOnce(
      new Error("Server error"),
    );
    render(<Status />);
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("runs health checks on button click", async () => {
    vi.mocked(fetchIntegrations).mockResolvedValueOnce(mockIntegrations);
    vi.mocked(fetchIntegrationHealth).mockResolvedValueOnce([
      {
        name: "slack",
        description: "Slack bot",
        configured: true,
        healthy: true,
        error: null,
      },
      {
        name: "jira",
        description: "Jira",
        configured: false,
        healthy: null,
        error: null,
      },
    ]);
    render(<Status />);
    await waitFor(() => {
      expect(screen.getByText("Run Health Checks")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Run Health Checks"));
    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
      expect(screen.getByText("Skipped")).toBeInTheDocument();
    });
  });

  it("shows unhealthy status with error", async () => {
    vi.mocked(fetchIntegrations).mockResolvedValueOnce(mockIntegrations);
    vi.mocked(fetchIntegrationHealth).mockResolvedValueOnce([
      {
        name: "slack",
        description: "Slack bot",
        configured: true,
        healthy: false,
        error: "Connection refused",
      },
      {
        name: "jira",
        description: "Jira",
        configured: false,
        healthy: null,
        error: null,
      },
    ]);
    render(<Status />);
    await waitFor(() => {
      expect(screen.getByText("Run Health Checks")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Run Health Checks"));
    await waitFor(() => {
      expect(screen.getByText("Unhealthy")).toBeInTheDocument();
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
    });
  });
});
