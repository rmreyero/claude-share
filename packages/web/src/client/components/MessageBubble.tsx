import type { ParsedMessage, ContentBlock } from "@claude-share/shared";
import { ThinkingBlock } from "./ThinkingBlock.js";
import { ToolCallBlock } from "./ToolCallBlock.js";
import { CodeBlock } from "./CodeBlock.js";

interface Props {
  message: ParsedMessage;
}

/** Split text into segments of plain text and fenced code blocks */
function splitTextAndCode(text: string): Array<{ type: "text" | "code"; content: string; lang?: string }> {
  const segments: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", content: match[2], lang: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

function renderTextContent(text: string) {
  const segments = splitTextAndCode(text);
  return segments.map((seg, i) => {
    if (seg.type === "code") {
      return <CodeBlock key={i} code={seg.content} language={seg.lang} />;
    }
    return (
      <div key={i} className="whitespace-pre-wrap break-words leading-relaxed">
        {seg.content}
      </div>
    );
  });
}

function renderBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case "text":
      return <div key={index}>{renderTextContent(block.text)}</div>;
    case "thinking":
      return <ThinkingBlock key={index} content={block.thinking} />;
    case "tool_use":
      return <ToolCallBlock key={index} name={block.name} input={block.input} />;
    case "tool_result": {
      const content = typeof block.content === "string"
        ? block.content
        : block.content.map((c) => c.text ?? "").join("\n");
      const isError = block.is_error;
      return (
        <div
          key={index}
          className="text-sm rounded-lg overflow-hidden"
          style={{
            background: isError ? 'var(--error-accent-dim)' : 'var(--bg-surface)',
            border: `1px solid ${isError ? 'rgba(209, 109, 109, 0.2)' : 'var(--border-subtle)'}`,
          }}
        >
          <div
            className="px-4 py-2 text-xs font-medium"
            style={{
              color: isError ? 'var(--error-accent)' : 'var(--text-muted)',
              borderBottom: `1px solid ${isError ? 'rgba(209, 109, 109, 0.12)' : 'var(--border-subtle)'}`,
              background: isError ? 'rgba(209, 109, 109, 0.05)' : 'var(--bg-elevated)',
            }}
          >
            {isError ? 'Error Result' : 'Tool Result'}
          </div>
          <pre
            className="whitespace-pre-wrap overflow-x-auto font-mono text-sm px-4 py-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {content}
          </pre>
        </div>
      );
    }
    default:
      return null;
  }
}

export function MessageBubble({ message }: Props) {
  const isUser = message.type === "user";

  return (
    <div className="message-card rounded-xl px-6 py-5" style={{
      borderLeft: isUser ? '3px solid var(--user-accent)' : '3px solid transparent',
      background: isUser ? 'var(--user-accent-dim)' : 'transparent',
    }}>
      {/* Role label */}
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: isUser ? 'var(--user-accent)' : 'var(--accent-warm)' }}
        >
          {isUser ? "User" : "Assistant"}
        </span>
        {message.model && !isUser && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
            }}
          >
            {message.model}
          </span>
        )}
      </div>

      {/* Content blocks */}
      <div className="space-y-3">
        {message.content.map((block, i) => renderBlock(block, i))}
      </div>
    </div>
  );
}
