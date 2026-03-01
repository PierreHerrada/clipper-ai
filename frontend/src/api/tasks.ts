import type { AgentRun, Task, TaskStatus } from "../types";

const BASE = "/api/v1";

export async function fetchTasks(): Promise<Task[]> {
  const resp = await fetch(`${BASE}/tasks`);
  if (!resp.ok) throw new Error("Failed to fetch tasks");
  return resp.json();
}

export async function fetchTask(id: string): Promise<Task> {
  const resp = await fetch(`${BASE}/tasks/${id}`);
  if (!resp.ok) throw new Error("Failed to fetch task");
  return resp.json();
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<Task> {
  const resp = await fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!resp.ok) throw new Error("Failed to update task");
  return resp.json();
}

export async function triggerStage(
  id: string,
  stage: "plan" | "work" | "review"
): Promise<AgentRun> {
  const resp = await fetch(`${BASE}/tasks/${id}/${stage}`, {
    method: "POST",
  });
  if (!resp.ok) throw new Error(`Failed to trigger ${stage}`);
  return resp.json();
}
