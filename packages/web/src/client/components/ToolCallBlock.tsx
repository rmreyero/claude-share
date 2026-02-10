import { useState } from "react";

interface Props {
  name: string;
  input: Record<string, unknown>;
}

export function ToolCallBlock({ name, input }: Props) {
  const [expanded, setExpanded] = useState(false);

  const inputStr = JSON.stringify(input, null, 2);

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-800 transition-colors flex items-center gap-2"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>&#9656;</span>
        <span className="bg-violet-900/60 text-violet-300 px-2 py-0.5 rounded text-xs font-mono">
          {name}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-neutral-800">
          <pre className="text-xs text-neutral-400 overflow-x-auto mt-2 whitespace-pre-wrap">
            {inputStr}
          </pre>
        </div>
      )}
    </div>
  );
}
