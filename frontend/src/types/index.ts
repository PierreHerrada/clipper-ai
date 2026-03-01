export type TaskStatus =
  | "backlog"
  | "planned"
  | "working"
  | "reviewing"
  | "done"
  | "failed";
export type RunStage = "plan" | "work" | "review";
export type RunStatus = "running" | "done" | "failed";
export type LogType = "text" | "tool_use" | "tool_result" | "error";

export interface Task {
  id: string;
  title: string;
  description: string;
  acceptance: string;
  status: TaskStatus;
  jira_key: string | null;
  jira_url: string | null;
  slack_thread_ts: string;
  pr_url: string | null;
  pr_number: number | null;
  repo: string | null;
  created_at: string;
  latest_run: AgentRun | null;
}

export interface AgentRun {
  id: string;
  task_id: string;
  stage: RunStage;
  status: RunStatus;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  started_at: string;
  finished_at: string | null;
}

export interface AgentLog {
  id: string;
  run_id: string;
  type: LogType;
  content: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  total_cost_usd: number;
  active_runs: number;
  tasks_by_status: Record<TaskStatus, number>;
  cost_by_stage: Record<RunStage, number>;
}

export interface CostBreakdown {
  task_id: string;
  task_title: string;
  total_cost_usd: number;
  cost_by_stage: Record<RunStage, number>;
}

export interface IntegrationStatus {
  name: string;
  description: string;
  active: boolean;
  missing_env_vars: string[];
}
