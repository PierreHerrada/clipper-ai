import CostWidget from "../components/CostWidget";
import { useDashboard } from "../hooks/useDashboard";
import type { TaskStatus } from "../types";

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "text-foam",
  planned: "text-mist",
  working: "text-gold",
  reviewing: "text-sky",
  done: "text-teal",
  failed: "text-coral",
};

export default function Dashboard() {
  const { stats, costs, loading, error } = useDashboard();

  if (loading) {
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
          <div className="text-mist text-sm">Tasks by Status</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {(Object.entries(stats.tasks_by_status) as [TaskStatus, number][]).map(
              ([status, count]) => (
                <span key={status} className={`text-sm ${STATUS_COLORS[status]}`}>
                  {status}: {count}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <CostWidget costs={costs} costByStage={stats.cost_by_stage} />
    </div>
  );
}
