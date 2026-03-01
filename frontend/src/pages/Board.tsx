import TaskBoard from "../components/TaskBoard";
import { useTasks } from "../hooks/useTasks";

export default function Board() {
  const { tasks, loading, error, refresh } = useTasks();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-mist">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-coral">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Task Board</h1>
        <button
          onClick={refresh}
          className="px-4 py-1.5 rounded text-sm text-white bg-navy border border-horizon hover:bg-ocean"
        >
          Refresh
        </button>
      </div>
      <TaskBoard tasks={tasks} onRefresh={refresh} />
    </div>
  );
}
