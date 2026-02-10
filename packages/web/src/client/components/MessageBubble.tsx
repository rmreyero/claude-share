import type { ContentBlock, ParsedMessage } from "@claude-share/shared";
import { cleanUserText } from "@claude-share/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock.js";
import { ThinkingBlock } from "./ThinkingBlock.js";
import { ToolCallBlock } from "./ToolCallBlock.js";

interface Props {
  message: ParsedMessage;
}

function renderTextContent(text: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");
          const isInline = !className && !code.includes("\n");
          if (!isInline) {
            return <CodeBlock code={code} language={match?.[1]} />;
          }
          return (
            <code
              className="px-1.5 py-0.5 rounded text-sm font-mono"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--accent-warm)",
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--user-accent)",
                textDecoration: "underline",
              }}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function renderBlock(block: ContentBlock, index: number, isUser: boolean) {
  switch (block.type) {
    case "text": {
      const displayText = isUser
        ? cleanUserText(block.text)
        : block.text.trim();
      if (!displayText) return null;
      return <div key={index}>{renderTextContent(displayText)}</div>;
    }
    case "thinking":
      return <ThinkingBlock key={index} content={block.thinking} />;
    case "tool_use":
      return <ToolCallBlock key={index} name={block.name} input={block.input} />;
    case "tool_result": {
      const content =
        typeof block.content === "string"
          ? block.content
          : block.content.map((c) => c.text ?? "").join("\n");
      const isError = block.is_error;
      return (
        <div
          key={index}
          className="text-sm rounded-lg overflow-hidden"
          style={{
            background: isError
              ? "var(--error-accent-dim)"
              : "var(--bg-surface)",
            border: `1px solid ${isError ? "rgba(209, 109, 109, 0.2)" : "var(--border-subtle)"}`,
          }}
        >
          <div
            className="px-4 py-2 text-xs font-medium"
            style={{
              color: isError ? "var(--error-accent)" : "var(--text-muted)",
              borderBottom: `1px solid ${isError ? "rgba(209, 109, 109, 0.12)" : "var(--border-subtle)"}`,
              background: isError
                ? "rgba(209, 109, 109, 0.05)"
                : "var(--bg-elevated)",
            }}
          >
            {isError ? "Error Result" : "Tool Result"}
          </div>
          <pre
            className="whitespace-pre-wrap overflow-x-auto font-mono text-sm px-4 py-3"
            style={{ color: "var(--text-secondary)" }}
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

/** Check if a user message has any visible text (not just tool_results). */
function hasUserText(message: ParsedMessage): boolean {
  for (const block of message.content) {
    if (block.type === "text") {
      if (cleanUserText(block.text)) return true;
    }
  }
  return false;
}

/** Check if a message has any visible content at all. */
function hasVisibleContent(message: ParsedMessage): boolean {
  const isUser = message.type === "user";
  for (const block of message.content) {
    switch (block.type) {
      case "text": {
        const text = isUser ? cleanUserText(block.text) : block.text.trim();
        if (text) return true;
        break;
      }
      case "thinking":
      case "tool_use":
      case "tool_result":
        return true;
    }
  }
  return false;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.type === "user";

  if (!hasVisibleContent(message)) return null;

  // User messages with only tool_result blocks (no user text) — render
  // just the tool results without the "User" card wrapper.
  if (isUser && !hasUserText(message)) {
    return (
      <div className="space-y-3">
        {message.content.map((block, i) => renderBlock(block, i, isUser))}
      </div>
    );
  }

  return (
    <div
      className="message-card rounded-xl px-6 py-5"
      style={{
        borderLeft: isUser
          ? "3px solid var(--user-accent)"
          : "3px solid transparent",
        background: isUser ? "var(--user-accent-dim)" : "transparent",
      }}
    >
      {/* Role label */}
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{
            color: isUser ? "var(--user-accent)" : "var(--accent-warm)",
          }}
        >
          {isUser ? "User" : "Assistant"}
        </span>
        {message.model && !isUser && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              color: "var(--text-muted)",
              background: "var(--bg-elevated)",
            }}
          >
            {message.model}
          </span>
        )}
      </div>

      {/* Content blocks */}
      <div className="space-y-3">
        {message.content.map((block, i) => renderBlock(block, i, isUser))}
      </div>
    </div>
  );
}
