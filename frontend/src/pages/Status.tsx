import { useState } from "react";
import { triggerJiraSync } from "../api/agent";
import { useIntegrationHealth } from "../hooks/useIntegrationHealth";
import {
  TASK_STATUSES,
  useJiraStatusMapping,
} from "../hooks/useSettings";

export default function Status() {
  const { integrations, health, loading, checking, error, checkHealth } =
    useIntegrationHealth();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const statusMapping = useJiraStatusMapping();

  const updateEntry = (index: number, field: "key" | "value", val: string) => {
    statusMapping.setEntries((prev) => {
      const next = [...prev];
      next[index] = field === "key"
        ? [val, next[index][1]]
        : [next[index][0], val];
      return next;
    });
  };

  const removeEntry = (index: number) => {
    statusMapping.setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    statusMapping.setEntries((prev) => [...prev, ["", "backlog"]]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-mist">Loading integrations...</span>
      </div>
    );
  }

  if (error && integrations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-coral">{error}</span>
      </div>
    );
  }

  // Build a lookup from health results keyed by name
  const healthMap = new Map(health?.map((h) => [h.name, h]));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Integration Status</h1>
        <button
          onClick={checkHealth}
          disabled={checking}
          className="px-4 py-2 bg-foam/10 border border-foam/20 rounded-lg text-foam text-sm hover:bg-foam/20 disabled:opacity-50"
        >
          {checking ? "Checking..." : "Run Health Checks"}
        </button>
      </div>

      {error && <div className="text-coral text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const h = healthMap.get(integration.name);
          return (
            <div
              key={integration.name}
              className="bg-abyss border border-foam/8 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">
                  {integration.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    integration.active
                      ? "bg-teal/20 text-teal"
                      : "bg-coral/20 text-coral"
                  }`}
                >
                  {integration.active ? "Configured" : "Not Configured"}
                </span>
              </div>
              <div className="text-mist text-sm mb-3">
                {integration.description}
              </div>

              {!integration.active && integration.missing_env_vars.length > 0 && (
                <div className="text-xs text-coral/80">
                  Missing: {integration.missing_env_vars.join(", ")}
                </div>
              )}

              {h && (
                <div className="mt-2 pt-2 border-t border-foam/8">
                  {h.healthy === true && (
                    <span className="text-teal text-sm">Healthy</span>
                  )}
                  {h.healthy === false && (
                    <div>
                      <span className="text-coral text-sm">Unhealthy</span>
                      {h.error && (
                        <div className="text-coral/70 text-xs mt-1">
                          {h.error}
                        </div>
                      )}
                    </div>
                  )}
                  {h.healthy === null && (
                    <span className="text-mist text-sm">Skipped</span>
                  )}
                </div>
              )}

              {integration.name === "jira" && integration.active && (
                <div className="mt-3 pt-3 border-t border-foam/8">
                  <button
                    onClick={async () => {
                      setSyncing(true);
                      setSyncResult(null);
                      try {
                        const result = await triggerJiraSync();
                        setSyncResult(
                          `Imported ${result.imported}, pushed ${result.pushed}`,
                        );
                        setTimeout(() => setSyncResult(null), 5000);
                      } catch {
                        setSyncResult("Sync failed");
                        setTimeout(() => setSyncResult(null), 5000);
                      } finally {
                        setSyncing(false);
                      }
                    }}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-foam/10 border border-foam/20 rounded text-foam text-xs hover:bg-foam/20 disabled:opacity-50 cursor-pointer"
                  >
                    {syncing ? "Syncing..." : "Sync Now"}
                  </button>
                  {syncResult && (
                    <span className="ml-2 text-xs text-mist">{syncResult}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {integrations.some((i) => i.name === "jira") && (
        <div className="mt-6 bg-abyss border border-foam/8 rounded-lg p-4">
          <button
            onClick={() => setMappingOpen(!mappingOpen)}
            className="text-sm text-white hover:text-foam flex items-center gap-2 cursor-pointer w-full"
          >
            <span
              className="inline-block transition-transform text-xs"
              style={{
                transform: mappingOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              &#9654;
            </span>
            Jira Status Mapping
          </button>

          {mappingOpen && (
            <div className="mt-4 space-y-2">
              {statusMapping.loading ? (
                <span className="text-xs text-mist">Loading...</span>
              ) : (
                <>
                  <p className="text-xs text-mist mb-3">
                    Map Jira status names to Corsair task statuses. These are
                    matched case-insensitively during sync.
                  </p>
                  {statusMapping.entries.map(([jiraStatus, taskStatus], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={jiraStatus}
                        onChange={(e) => updateEntry(i, "key", e.target.value)}
                        placeholder="Jira status name"
                        className="flex-1 max-w-xs px-2 py-1 bg-depth border border-foam/10 rounded text-xs text-white placeholder-mist/50"
                      />
                      <span className="text-mist text-xs">&#8594;</span>
                      <select
                        value={taskStatus}
                        onChange={(e) =>
                          updateEntry(i, "value", e.target.value)
                        }
                        className="px-2 py-1 bg-depth border border-foam/10 rounded text-xs text-white"
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeEntry(i)}
                        className="text-coral/70 hover:text-coral text-xs px-1 cursor-pointer"
                        title="Remove row"
                      >
                        &#10005;
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={addEntry}
                      className="px-3 py-1.5 bg-foam/10 border border-foam/20 rounded text-foam text-xs hover:bg-foam/20 cursor-pointer"
                    >
                      Add Row
                    </button>
                    <button
                      onClick={statusMapping.resetToDefaults}
                      className="px-3 py-1.5 bg-foam/10 border border-foam/20 rounded text-mist text-xs hover:bg-foam/20 cursor-pointer"
                    >
                      Reset Defaults
                    </button>
                    <button
                      onClick={statusMapping.save}
                      disabled={statusMapping.saving}
                      className="px-3 py-1.5 bg-foam/20 border border-foam/30 rounded text-foam text-xs hover:bg-foam/30 disabled:opacity-50 cursor-pointer"
                    >
                      {statusMapping.saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {statusMapping.error && (
                    <div className="text-coral text-xs mt-2">
                      {statusMapping.error}
                    </div>
                  )}
                  {statusMapping.lastSaved && (
                    <div className="text-mist/60 text-xs mt-2">
                      Last saved:{" "}
                      {new Date(statusMapping.lastSaved).toLocaleString()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
