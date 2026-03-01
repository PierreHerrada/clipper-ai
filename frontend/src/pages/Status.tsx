import { useIntegrationHealth } from "../hooks/useIntegrationHealth";

export default function Status() {
  const { integrations, health, loading, checking, error, checkHealth } =
    useIntegrationHealth();

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
