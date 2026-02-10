import type { Database } from "bun:sqlite";
import type { ParsedMessage, SessionMetadata } from "@claude-share/shared";

export function createQueries(db: Database) {
  const insertSession = db.prepare(`
    INSERT INTO sessions (share_id, title, project_name, user_name, branch, model, session_date, message_count, total_input_tokens, total_output_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO messages (share_id, sequence, type, role, content_json, model, input_tokens, output_tokens, timestamp, has_thinking, has_tool_use)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const getSession = db.prepare(`SELECT * FROM sessions WHERE share_id = ?`);

  const listSessions = db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC`);

  const deleteSession = db.prepare(`DELETE FROM sessions WHERE share_id = ?`);

  const getMessages = db.prepare(`
    SELECT * FROM messages WHERE share_id = ? ORDER BY sequence ASC LIMIT ? OFFSET ?
  `);

  const countMessages = db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE share_id = ?
  `);

  const validateApiKey = db.prepare(`
    SELECT id FROM api_keys WHERE key_hash = ? AND is_active = 1
  `);

  const insertApiKey = db.prepare(`
    INSERT INTO api_keys (key_hash, name) VALUES (?, ?)
  `);

  return {
    createSession(shareId: string, metadata: SessionMetadata, messages: ParsedMessage[]) {
      const insertAll = db.transaction(() => {
        insertSession.run(
          shareId,
          metadata.title,
          metadata.projectName,
          metadata.userName ?? null,
          metadata.branch ?? null,
          metadata.model ?? null,
          metadata.sessionDate,
          metadata.messageCount,
          metadata.totalInputTokens,
          metadata.totalOutputTokens
        );

        for (const msg of messages) {
          insertMessage.run(
            shareId,
            msg.sequence,
            msg.type,
            msg.role,
            JSON.stringify(msg.content),
            msg.model ?? null,
            msg.inputTokens ?? null,
            msg.outputTokens ?? null,
            msg.timestamp ?? null,
            msg.hasThinking ? 1 : 0,
            msg.hasToolUse ? 1 : 0
          );
        }
      });

      insertAll();
    },

    getSession(shareId: string) {
      return getSession.get(shareId) as Record<string, unknown> | null;
    },

    listSessions() {
      return listSessions.all() as Record<string, unknown>[];
    },

    deleteSession(shareId: string): boolean {
      const result = deleteSession.run(shareId);
      return result.changes > 0;
    },

    getMessages(shareId: string, limit: number, offset: number) {
      return getMessages.all(shareId, limit, offset) as Record<string, unknown>[];
    },

    countMessages(shareId: string): number {
      const row = countMessages.get(shareId) as { count: number } | null;
      return row?.count ?? 0;
    },

    validateApiKey(keyHash: string): boolean {
      return validateApiKey.get(keyHash) != null;
    },

    insertApiKey(keyHash: string, name: string) {
      insertApiKey.run(keyHash, name);
    },
  };
}
