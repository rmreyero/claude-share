/** Types mapping the Claude Code JSONL session format */

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string }>;
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

export interface UserMessage {
  role: "user";
  content: string | ContentBlock[];
}

export interface AssistantMessage {
  role: "assistant";
  content: ContentBlock[];
  model?: string;
}

/** A single line from the JSONL file */
export interface JournalEntry {
  type: "user" | "assistant" | "system" | "progress" | "file-history-snapshot" | "queue-operation";
  message?: UserMessage | AssistantMessage;
  // System event fields
  subtype?: string;
  duration?: number;
  // Token usage
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  // Metadata
  timestamp?: string;
  uuid?: string;
  sessionId?: string;
  model?: string;
}

/** Displayable types we keep after filtering */
export type DisplayableType = "user" | "assistant";

/** A parsed message ready for display */
export interface ParsedMessage {
  sequence: number;
  type: DisplayableType;
  role: string;
  content: ContentBlock[];
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  timestamp?: string;
  hasThinking: boolean;
  hasToolUse: boolean;
}

/** A fully parsed session */
export interface ParsedSession {
  messages: ParsedMessage[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  title: string;
  projectName: string;
  branch?: string;
  model?: string;
  sessionDate: string;
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}
