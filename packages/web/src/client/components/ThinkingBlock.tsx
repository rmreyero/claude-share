import { useState } from "react";

interface Props {
  content: string;
}

export function ThinkingBlock({ content }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-l-2 border-amber-600/50 bg-amber-950/20 rounded-r-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-950/30 transition-colors flex items-center gap-2"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>&#9656;</span>
        Thinking
        <span className="text-amber-600">({content.length} chars)</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-sm text-amber-200/80 whitespace-pre-wrap break-words">
          {content}
        </div>
      )}
    </div>
  );
}
