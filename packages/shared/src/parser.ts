import type {
  JournalEntry,
  ContentBlock,
  ParsedMessage,
  ParsedSession,
  SessionMetadata,
  DisplayableType,
} from "./types/session.js";

const DISPLAYABLE_TYPES = new Set<string>(["user", "assistant"]);

/** Recursively ensure all strings in a value are valid for JSON serialization */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Remove invalid escape sequences that could break JSON.stringify later
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeValue(obj[key]);
    }
    return result;
  }
  return value;
}

/** Parse a JSONL string into journal entries, skipping invalid lines */
function parseLines(jsonl: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      entries.push(sanitizeValue(parsed) as JournalEntry);
    } catch {
      // Skip malformed lines (including incomplete lines from active sessions)
    }
  }
  return entries;
}

/** Extract content blocks from a journal entry */
function extractContent(entry: JournalEntry): ContentBlock[] {
  const msg = entry.message;
  if (!msg) return [];

  if (typeof msg.content === "string") {
    return [{ type: "text", text: msg.content }];
  }

  return (msg.content ?? []) as ContentBlock[];
}

/** Detect if content has thinking blocks */
function hasThinking(content: ContentBlock[]): boolean {
  return content.some((b) => b.type === "thinking");
}

/** Detect if content has tool_use blocks */
function hasToolUse(content: ContentBlock[]): boolean {
  return content.some((b) => b.type === "tool_use");
}

/** Derive a session title from the first user message */
function deriveTitle(messages: ParsedMessage[]): string {
  const firstUser = messages.find((m) => m.type === "user");
  if (!firstUser) return "Untitled Session";

  const textBlock = firstUser.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return "Untitled Session";

  const text = textBlock.text.trim();
  if (text.length <= 80) return text;
  return text.slice(0, 77) + "...";
}

/** Detect the primary model used in the session */
function detectModel(entries: JournalEntry[]): string | undefined {
  for (const entry of entries) {
    if (entry.type === "assistant" && entry.model) {
      return entry.model;
    }
  }
  return undefined;
}

/** Parse a full JSONL session string into a ParsedSession */
export function parseSession(jsonl: string, projectName = "unknown"): ParsedSession {
  const entries = parseLines(jsonl);

  let sequence = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let sessionDate = new Date().toISOString();

  const messages: ParsedMessage[] = [];

  for (const entry of entries) {
    // Grab earliest timestamp
    if (entry.timestamp && sequence === 0) {
      sessionDate = entry.timestamp;
    }

    // Skip non-displayable types
    if (!DISPLAYABLE_TYPES.has(entry.type)) continue;

    const content = extractContent(entry);
    if (content.length === 0) continue;

    // Accumulate token usage
    if (entry.usage) {
      totalInputTokens += entry.usage.input_tokens ?? 0;
      totalOutputTokens += entry.usage.output_tokens ?? 0;
    }

    messages.push({
      sequence: sequence++,
      type: entry.type as DisplayableType,
      role: entry.message?.role ?? entry.type,
      content,
      model: entry.model,
      inputTokens: entry.usage?.input_tokens,
      outputTokens: entry.usage?.output_tokens,
      timestamp: entry.timestamp,
      hasThinking: hasThinking(content),
      hasToolUse: hasToolUse(content),
    });
  }

  const model = detectModel(entries);

  const metadata: SessionMetadata = {
    title: deriveTitle(messages),
    projectName,
    model,
    sessionDate,
    messageCount: messages.length,
    totalInputTokens,
    totalOutputTokens,
  };

  return { messages, metadata };
}
