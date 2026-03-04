import { useEffect, useState, useCallback, useRef } from "react";
import ActiveAgentRow from "../components/ActiveAgentRow";
import CostWidget from "../components/CostWidget";
import { fetchTasks } from "../api/tasks";
import { useDashboard } from "../hooks/useDashboard";
import type { Task, TaskStatus } from "../types";

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "text-foam",
  planned: "text-mist",
  working: "text-gold",
  reviewing: "text-sky",
  done: "text-teal",
  failed: "text-coral",
};

const STATUS_HEX: Record<TaskStatus, string> = {
  backlog: "var(--color-foam)",
  planned: "var(--color-mist)",
  working: "var(--color-gold)",
  reviewing: "var(--color-sky)",
  done: "var(--color-teal)",
  failed: "var(--color-coral)",
};

function StatusDonut({
  tasksByStatus,
  completedToday,
}: {
  tasksByStatus: Record<TaskStatus, number>;
  completedToday: number;
}) {
  // Use completed_today for "done" instead of all-time count
  const entries = (Object.keys(tasksByStatus) as TaskStatus[])
    .map((s) => [s, s === "done" ? completedToday : tasksByStatus[s]] as const)
    .filter(([, count]) => count > 0);

  const total = entries.reduce((sum, [, c]) => sum + c, 0);

  if (total === 0) {
    return <div className="text-mist text-sm">No tasks</div>;
  }

  const radius = 40;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="110" height="110" viewBox="0 0 110 110">
        {entries.map(([status, count]) => {
          const pct = count / total;
          const dashLen = pct * circumference;
          const currentOffset = offset;
          offset += dashLen;
          return (
            <circle
              key={status}
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke={STATUS_HEX[status]}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          );
        })}
        <text x="55" y="52" textAnchor="middle" className="fill-white text-lg font-semibold" fontSize="18">
          {total}
        </text>
        <text x="55" y="68" textAnchor="middle" className="fill-mist" fontSize="10">
          tasks
        </text>
      </svg>
      <div className="flex flex-col gap-1">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_HEX[status] }}
            />
            <span className={STATUS_COLORS[status]}>
              {status === "done" ? "done today" : status}: {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 15_000;

export default function Dashboard() {
  const { stats, costs, loading: statsLoading, error, refresh: refreshDashboard } = useDashboard();
  const [tasks, setTasks] = useState<Task[]>([]);
  const initialTaskLoad = useRef(true);

  const refreshTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch {
      // task fetch errors are non-fatal; metrics still display
    } finally {
      initialTaskLoad.current = false;
    }
  }, []);

  // Combined refresh for polling
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshTasks(), refreshDashboard()]);
  }, [refreshTasks, refreshDashboard]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const activeAgents = tasks.filter(
    (t) => t.latest_run?.status === "running",
  );

  // Poll faster (5s) when agents are running, otherwise 15s
  useEffect(() => {
    const ms = activeAgents.length > 0 ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    const interval = setInterval(refreshAll, ms);
    return () => clearInterval(interval);
  }, [activeAgents.length, refreshAll]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-mist">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-coral">{error || "No data"}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-abyss border border-foam/8 rounded-lg p-4">
          <div className="text-mist text-sm">Total Cost</div>
          <div className="text-2xl font-semibold text-foam">
            ${stats.total_cost_usd.toFixed(2)}
          </div>
        </div>
        <div className="bg-abyss border border-foam/8 rounded-lg p-4">
          <div className="text-mist text-sm">Active Runs</div>
          <div className="text-2xl font-semibold text-gold">
            {stats.active_runs}
          </div>
        </div>
        <div className="bg-abyss border border-foam/8 rounded-lg p-4">
          <div className="text-mist text-sm mb-3">Tasks by Status</div>
          <StatusDonut
            tasksByStatus={stats.tasks_by_status}
            completedToday={stats.completed_today}
          />
        </div>
      </div>

      {activeAgents.length > 0 && (
        <div className="bg-abyss border border-foam/8 rounded-lg p-4 mb-8">
          <h2 className="text-sm font-medium text-mist mb-3">Active Agents</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-mist text-xs uppercase">
                <th className="text-left py-1">Task</th>
                <th className="text-center py-1">Stage</th>
                <th className="text-right py-1">Elapsed</th>
                <th className="text-right py-1">Cost</th>
                <th className="text-right py-1"></th>
              </tr>
            </thead>
            <tbody>
              {activeAgents.map((t) => (
                <ActiveAgentRow
                  key={t.id}
                  task={t}
                  onStopped={refreshTasks}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CostWidget costs={costs} costByStage={stats.cost_by_stage} />
    </div>
  );
}
