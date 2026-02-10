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
    // Render plain text with basic line breaks
    return (
      <div key={i} className="whitespace-pre-wrap break-words">
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
      return (
        <div key={index} className={`text-sm p-3 rounded-lg ${block.is_error ? "bg-red-950/50 border border-red-800" : "bg-neutral-900"}`}>
          <div className="text-xs text-neutral-500 mb-1">Tool Result</div>
          <pre className="whitespace-pre-wrap text-neutral-300 overflow-x-auto">{content}</pre>
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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 space-y-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-neutral-900 text-neutral-100 border border-neutral-800"
        }`}
      >
        <div className="text-xs font-medium opacity-60 mb-1">
          {isUser ? "User" : "Assistant"}
          {message.model && !isUser && <span className="ml-2">{message.model}</span>}
        </div>
        {message.content.map((block, i) => renderBlock(block, i))}
      </div>
    </div>
  );
}
