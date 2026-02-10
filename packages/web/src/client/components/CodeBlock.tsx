import { useState } from "react";

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-xs">
        <span className="text-neutral-500 font-mono">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-neutral-700 text-right w-8 pr-3 shrink-0">
                {i + 1}
              </span>
              <span className="text-neutral-200">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
