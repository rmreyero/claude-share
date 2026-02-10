import { useEffect, useState } from "react";
import { codeToHtml } from "shiki/bundle/web";

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (language) {
      codeToHtml(code, {
        lang: language,
        theme: "vitesse-dark",
      })
        .then(setHtml)
        .catch(() => setHtml(null));
    }
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div
      className="rounded-lg overflow-hidden my-3"
      style={{
        background: "var(--code-bg)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          className="font-mono text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {language || "text"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2.5 py-1 rounded transition-colors"
          style={{
            color: copied ? "var(--accent-warm)" : "var(--text-muted)",
            background: copied ? "var(--accent-warm-dim)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!copied)
              (e.target as HTMLElement).style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            if (!copied)
              (e.target as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code content */}
      {html ? (
        <div
          className="p-4 overflow-x-auto text-sm leading-relaxed shiki-wrapper"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span
                  className="select-none text-right shrink-0 font-mono pr-4"
                  style={{
                    color: "var(--text-muted)",
                    opacity: 0.5,
                    width: lines.length >= 100 ? "3.5rem" : "2.5rem",
                    fontSize: "0.8em",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  {line || " "}
                </span>
              </div>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}
