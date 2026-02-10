import { useState } from "react";

interface Props {
  content: string;
}

export function ThinkingBlock({ content }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--accent-warm-dim)',
        border: '1px solid rgba(201, 149, 107, 0.15)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors"
        style={{ color: 'var(--accent-warm)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 149, 107, 0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span className={`collapse-arrow text-xs ${expanded ? 'expanded' : ''}`}>&#9656;</span>
        <span>Thinking</span>
        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
          {content.length.toLocaleString()} chars
        </span>
      </button>
      {expanded && (
        <div
          className="px-4 pb-4 text-sm whitespace-pre-wrap break-words leading-relaxed"
          style={{
            color: 'var(--text-secondary)',
            borderTop: '1px solid rgba(201, 149, 107, 0.1)',
            paddingTop: '0.75rem',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
