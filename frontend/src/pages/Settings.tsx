import { useRepositories } from "../hooks/useRepositories";
import { useBasePrompt } from "../hooks/useSettings";

export default function Settings() {
  const { value, setValue, loading, saving, error, lastSaved, save } =
    useBasePrompt();
  const {
    repos,
    loading: reposLoading,
    syncing,
    error: reposError,
    sync,
    toggle,
  } = useRepositories();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-mist">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      {error && (
        <div className="text-coral text-sm mb-4">{error}</div>
      )}

      <div className="bg-abyss border border-foam/8 rounded-lg p-4">
        <label className="block text-white text-sm font-medium mb-2">
          Base Prompt
        </label>
        <p className="text-mist text-xs mb-3">
          This text is prepended to every agent call (plan, work, review). Use
          it for project-specific instructions, coding conventions, or
          guardrails.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={12}
          className="w-full bg-deep border border-foam/20 rounded-lg px-4 py-3 text-white text-sm font-mono resize-y focus:outline-none focus:border-foam/50"
          placeholder="Enter base prompt text that will be prepended to all agent calls..."
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-mist text-xs">
            {lastSaved
              ? `Last saved: ${new Date(lastSaved).toLocaleString()}`
              : "Not saved yet"}
          </div>
          <button
            onClick={() => save(value)}
            disabled={saving}
            className="px-4 py-2 bg-foam/10 border border-foam/20 rounded-lg text-foam text-sm hover:bg-foam/20 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Repositories */}
      <div className="bg-abyss border border-foam/8 rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-white text-sm font-medium">
            Repositories
          </label>
          <button
            onClick={sync}
            disabled={syncing}
            className="px-4 py-2 bg-foam/10 border border-foam/20 rounded-lg text-foam text-sm hover:bg-foam/20 disabled:opacity-50 cursor-pointer"
          >
            {syncing ? "Syncing..." : "Sync from GitHub"}
          </button>
        </div>
        <p className="text-mist text-xs mb-3">
          Control which repositories the agent can operate on. Sync from GitHub
          to discover repos, then enable the ones you want.
        </p>

        {reposError && (
          <div className="text-coral text-sm mb-3">{reposError}</div>
        )}

        {reposLoading ? (
          <div className="text-mist text-sm py-4">Loading repositories...</div>
        ) : repos.length === 0 ? (
          <div className="text-mist text-sm py-4">
            No repositories found. Click &quot;Sync from GitHub&quot; to get
            started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-mist text-xs border-b border-foam/8">
                  <th className="text-left py-2 pr-4">Enabled</th>
                  <th className="text-left py-2 pr-4">Repository</th>
                  <th className="text-left py-2 pr-4">Description</th>
                  <th className="text-left py-2 pr-4">Visibility</th>
                  <th className="text-left py-2">Branch</th>
                </tr>
              </thead>
              <tbody>
                {repos.map((repo) => (
                  <tr
                    key={repo.id}
                    className="border-b border-foam/5 last:border-0"
                  >
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => toggle(repo.id, !repo.enabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                          repo.enabled ? "bg-foam/60" : "bg-foam/20"
                        }`}
                        role="switch"
                        aria-checked={repo.enabled}
                      >
                        <span
                          className={`block w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            repo.enabled
                              ? "translate-x-5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-2 pr-4">
                      <a
                        href={repo.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foam hover:underline"
                      >
                        {repo.full_name}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-mist truncate max-w-xs">
                      {repo.description || "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          repo.private
                            ? "bg-coral/20 text-coral"
                            : "bg-foam/20 text-foam"
                        }`}
                      >
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </td>
                    <td className="py-2 text-mist">{repo.default_branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
