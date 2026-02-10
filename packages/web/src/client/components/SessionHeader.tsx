import type { SessionDetailResponse } from "@claude-share/shared";

interface Props {
  session: SessionDetailResponse;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function SessionHeader({ session }: Props) {
  return (
    <header className="border-b border-neutral-800 pb-6">
      <h1 className="text-2xl font-bold text-white mb-3">{session.title}</h1>
      <div className="flex flex-wrap gap-3 text-sm text-neutral-400">
        <span className="bg-neutral-900 px-3 py-1 rounded-full">{session.projectName}</span>
        {session.branch && (
          <span className="bg-neutral-900 px-3 py-1 rounded-full">{session.branch}</span>
        )}
        {session.model && (
          <span className="bg-indigo-950 text-indigo-300 px-3 py-1 rounded-full">{session.model}</span>
        )}
        <span className="bg-neutral-900 px-3 py-1 rounded-full">{formatDate(session.sessionDate)}</span>
        <span className="bg-neutral-900 px-3 py-1 rounded-full">{session.messageCount} messages</span>
        {(session.totalInputTokens > 0 || session.totalOutputTokens > 0) && (
          <span className="bg-neutral-900 px-3 py-1 rounded-full">
            {formatTokens(session.totalInputTokens)} in / {formatTokens(session.totalOutputTokens)} out
          </span>
        )}
      </div>
    </header>
  );
}
