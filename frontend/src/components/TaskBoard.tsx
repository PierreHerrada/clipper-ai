import type { Task, TaskStatus } from "../types";
import TaskCard from "./TaskCard";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "planned", label: "Planned" },
  { status: "working", label: "Working" },
  { status: "reviewing", label: "Reviewing" },
  { status: "done", label: "Done" },
  { status: "failed", label: "Failed" },
];

interface TaskBoardProps {
  tasks: Task[];
  onRefresh: () => void;
}

export default function TaskBoard({ tasks, onRefresh }: TaskBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="min-w-[280px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-mist uppercase tracking-wide">
                {col.label}
              </h2>
              <span className="text-xs bg-navy px-1.5 py-0.5 rounded text-foam">
                {columnTasks.length}
              </span>
            </div>
            <div>
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} onRefresh={onRefresh} />
              ))}
              {columnTasks.length === 0 && (
                <div className="text-xs text-mist/50 text-center py-8 border border-dashed border-horizon/30 rounded-lg">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
