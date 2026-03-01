import { useChatMessages } from "../hooks/useChatMessages";

export default function Chat() {
  const { messages, total, offset, loading, error, pageSize, nextPage, prevPage } =
    useChatMessages();

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-mist">Loading messages...</span>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-coral">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Chat Messages</h1>
        <span className="text-mist text-sm">{total} total messages</span>
      </div>

      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-mist">
            No messages yet. Messages will appear here once the Slack listener is active.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-abyss border border-foam/8 rounded-lg p-4"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-foam font-medium text-sm">
                  {msg.user_name || msg.user_id}
                </span>
                <span className="text-mist/60 text-xs">
                  #{msg.channel_name || msg.channel_id}
                </span>
                <span className="text-mist/40 text-xs ml-auto">
                  {new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-white text-sm">{msg.message}</div>
              {msg.thread_ts && (
                <span className="text-mist/40 text-xs mt-1 inline-block">
                  thread reply
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={prevPage}
            disabled={offset === 0}
            className="px-4 py-2 bg-foam/10 border border-foam/20 rounded-lg text-foam text-sm hover:bg-foam/20 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-mist text-sm">
            {offset + 1}–{Math.min(offset + pageSize, total)} of {total}
          </span>
          <button
            onClick={nextPage}
            disabled={offset + pageSize >= total}
            className="px-4 py-2 bg-foam/10 border border-foam/20 rounded-lg text-foam text-sm hover:bg-foam/20 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
