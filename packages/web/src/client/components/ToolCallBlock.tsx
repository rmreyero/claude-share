import { useState } from "react";

interface Props {
  name: string;
  input: Record<string, unknown>;
}

export function ToolCallBlock({ name, input }: Props) {
  const [expanded, setExpanded] = useState(false);

  const inputStr = JSON.stringify(input, null, 2);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--tool-accent-dim)',
        border: '1px solid rgba(155, 142, 196, 0.15)',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(155, 142, 196, 0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          className={`collapse-arrow text-xs ${expanded ? 'expanded' : ''}`}
          style={{ color: 'var(--tool-accent)' }}
        >
          &#9656;
        </span>
        <span
          className="font-mono text-xs font-medium px-2.5 py-0.5 rounded"
          style={{
            background: 'rgba(155, 142, 196, 0.12)',
            color: 'var(--tool-accent)',
          }}
        >
          {name}
        </span>
      </button>
      {expanded && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: '1px solid rgba(155, 142, 196, 0.1)' }}
        >
          <pre
            className="text-xs font-mono overflow-x-auto mt-3 whitespace-pre-wrap leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {inputStr}
          </pre>
        </div>
      )}
    </div>
  );
}
