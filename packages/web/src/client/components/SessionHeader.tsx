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
      month: "long",
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
    <header className="animate-fade-up pb-8 mb-2">
      <h1
        className="font-display text-4xl text-white mb-5 leading-tight tracking-tight"
        style={{ fontWeight: 400 }}
      >
        {session.title}
      </h1>

      <div className="flex flex-wrap gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span
          className="px-3.5 py-1.5 rounded-full font-medium"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          {session.projectName}
        </span>

        {session.branch && (
          <span
            className="px-3.5 py-1.5 rounded-full font-mono text-xs"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {session.branch}
          </span>
        )}

        {session.model && (
          <span
            className="px-3.5 py-1.5 rounded-full font-medium"
            style={{
              background: 'var(--tool-accent-dim)',
              color: 'var(--tool-accent)',
              border: '1px solid rgba(155, 142, 196, 0.15)',
            }}
          >
            {session.model}
          </span>
        )}

        <span
          className="px-3.5 py-1.5 rounded-full"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          {formatDate(session.sessionDate)}
        </span>

        <span
          className="px-3.5 py-1.5 rounded-full"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          {session.messageCount} messages
        </span>

        {(session.totalInputTokens > 0 || session.totalOutputTokens > 0) && (
          <span
            className="px-3.5 py-1.5 rounded-full font-mono text-xs"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {formatTokens(session.totalInputTokens)} in &middot; {formatTokens(session.totalOutputTokens)} out
          </span>
        )}
      </div>

      {/* Decorative separator */}
      <div className="mt-8 flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accent-warm)', opacity: 0.6 }}
        />
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
    </header>
  );
}
