import type { ContentBlock, ParsedMessage, ParsedSession } from "./types/session.js";

const MAX_TOOL_RESULT_SIZE = 10_000; // 10KB
const TRUNCATE_KEEP = 500; // chars to keep at start/end

/** Patterns for secrets that should be redacted */
const SECRET_PATTERNS = [
  /\bsk-[a-zA-Z0-9_-]{20,}\b/g,           // OpenAI / generic API keys
  /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g,       // Anthropic API keys
  /\bghp_[a-zA-Z0-9]{36,}\b/g,            // GitHub personal access tokens
  /\bgho_[a-zA-Z0-9]{36,}\b/g,            // GitHub OAuth tokens
  /\bghs_[a-zA-Z0-9]{36,}\b/g,            // GitHub App tokens
  /\bghu_[a-zA-Z0-9]{36,}\b/g,            // GitHub user-to-server tokens
  /\bxoxb-[a-zA-Z0-9-]+\b/g,              // Slack bot tokens
  /\bxoxp-[a-zA-Z0-9-]+\b/g,              // Slack user tokens
  /\bAIza[a-zA-Z0-9_-]{35}\b/g,           // Google API keys
  /\b[A-Z_]*(SECRET|TOKEN|PASSWORD|API_KEY|APIKEY|PRIVATE_KEY)[A-Z_]*\s*[=:]\s*["']?[^\s"']{8,}["']?/gi,
];

/** Detect home directory from common env vars */
function getHomeDir(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? "/home/user";
}

/** Replace absolute paths with relative ones */
function sanitizePaths(text: string, projectPath?: string): string {
  const homeDir = getHomeDir();
  let result = text;

  // Replace home directory paths with ~/
  if (homeDir) {
    result = result.replaceAll(homeDir, "~");
  }

  // Replace project path with ./
  if (projectPath) {
    result = result.replaceAll(projectPath, ".");
  }

  // Generic /Users/<username>/ pattern
  result = result.replace(/\/Users\/[a-zA-Z0-9._-]+\//g, "~/");

  // Generic /home/<username>/ pattern
  result = result.replace(/\/home\/[a-zA-Z0-9._-]+\//g, "~/");

  return result;
}

/** Redact secrets from text */
function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

/** Truncate large text, keeping start and end */
function truncateText(text: string): string {
  if (text.length <= MAX_TOOL_RESULT_SIZE) return text;

  const removed = text.length - TRUNCATE_KEEP * 2;
  return (
    text.slice(0, TRUNCATE_KEEP) +
    `\n\n[truncated: ${removed} bytes removed]\n\n` +
    text.slice(-TRUNCATE_KEEP)
  );
}

/** Sanitize a single content block */
function sanitizeBlock(block: ContentBlock, projectPath?: string): ContentBlock {
  switch (block.type) {
    case "text":
      return {
        ...block,
        text: redactSecrets(sanitizePaths(block.text, projectPath)),
      };

    case "thinking":
      return {
        ...block,
        thinking: redactSecrets(sanitizePaths(block.thinking, projectPath)),
      };

    case "tool_use":
      return {
        ...block,
        input: JSON.parse(
          redactSecrets(sanitizePaths(JSON.stringify(block.input), projectPath))
        ),
      };

    case "tool_result": {
      let content = block.content;
      if (typeof content === "string") {
        content = truncateText(redactSecrets(sanitizePaths(content, projectPath)));
      } else if (Array.isArray(content)) {
        content = content.map((item) => {
          if (item.text) {
            return {
              ...item,
              text: truncateText(redactSecrets(sanitizePaths(item.text, projectPath))),
            };
          }
          return item;
        });
      }
      return { ...block, content };
    }

    default:
      return block;
  }
}

/** Sanitize a parsed message */
function sanitizeMessage(message: ParsedMessage, projectPath?: string): ParsedMessage {
  return {
    ...message,
    content: message.content.map((block) => sanitizeBlock(block, projectPath)),
  };
}

/** Sanitize an entire parsed session */
export function sanitizeSession(session: ParsedSession, projectPath?: string): ParsedSession {
  return {
    metadata: {
      ...session.metadata,
      projectName: sanitizePaths(session.metadata.projectName, projectPath),
    },
    messages: session.messages.map((msg) => sanitizeMessage(msg, projectPath)),
  };
}
