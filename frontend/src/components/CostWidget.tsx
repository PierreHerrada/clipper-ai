import type { CostBreakdown, RunStage } from "../types";

interface CostWidgetProps {
  costs: CostBreakdown[];
  costByStage: Record<RunStage, number>;
}

export default function CostWidget({ costs, costByStage }: CostWidgetProps) {
  return (
    <div>
      <div className="bg-abyss border border-foam/8 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-mist mb-3">Cost by Stage</h2>
        <div className="flex gap-6">
          {(Object.entries(costByStage) as [RunStage, number][]).map(
            ([stage, cost]) => (
              <div key={stage}>
                <div className="text-xs text-mist uppercase">{stage}</div>
                <div className="text-lg font-semibold text-foam">
                  ${cost.toFixed(2)}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {costs.length > 0 && (
        <div className="bg-abyss border border-foam/8 rounded-lg p-4">
          <h2 className="text-sm font-medium text-mist mb-3">Cost per Task</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-mist text-xs uppercase">
                <th className="text-left py-1">Task</th>
                <th className="text-right py-1">Plan</th>
                <th className="text-right py-1">Work</th>
                <th className="text-right py-1">Review</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.task_id} className="border-t border-horizon/20">
                  <td className="py-2 text-white">{c.task_title}</td>
                  <td className="py-2 text-right text-mist">
                    ${(c.cost_by_stage.plan || 0).toFixed(4)}
                  </td>
                  <td className="py-2 text-right text-mist">
                    ${(c.cost_by_stage.work || 0).toFixed(4)}
                  </td>
                  <td className="py-2 text-right text-mist">
                    ${(c.cost_by_stage.review || 0).toFixed(4)}
                  </td>
                  <td className="py-2 text-right text-foam font-medium">
                    ${c.total_cost_usd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
