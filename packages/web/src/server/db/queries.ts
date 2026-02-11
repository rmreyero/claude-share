import type { ParsedMessage, SessionMetadata } from "@claude-share/shared";
import type { DatabaseClient } from "./schema.js";

export function createQueries(client: DatabaseClient) {
	return {
		async createSession(
			shareId: string,
			metadata: SessionMetadata,
			messages: ParsedMessage[],
		) {
			const statements = [
				{
					sql: `INSERT INTO sessions (share_id, title, project_name, user_name, branch, model, session_date, message_count, total_input_tokens, total_output_tokens)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					args: [
						shareId,
						metadata.title,
						metadata.projectName,
						metadata.userName ?? null,
						metadata.branch ?? null,
						metadata.model ?? null,
						metadata.sessionDate,
						metadata.messageCount,
						metadata.totalInputTokens,
						metadata.totalOutputTokens,
					],
				},
				...messages.map((msg) => ({
					sql: `INSERT INTO messages (share_id, sequence, type, role, content_json, model, input_tokens, output_tokens, timestamp, has_thinking, has_tool_use)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					args: [
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
						msg.hasToolUse ? 1 : 0,
					],
				})),
			];

			await client.batch(statements, "write");
		},

		async getSession(
			shareId: string,
		): Promise<Record<string, unknown> | null> {
			const result = await client.execute({
				sql: "SELECT * FROM sessions WHERE share_id = ?",
				args: [shareId],
			});
			return (result.rows[0] as Record<string, unknown>) ?? null;
		},

		async listSessions(): Promise<Record<string, unknown>[]> {
			const result = await client.execute(
				"SELECT * FROM sessions ORDER BY created_at DESC",
			);
			return result.rows as unknown as Record<string, unknown>[];
		},

		async deleteSession(shareId: string): Promise<boolean> {
			const result = await client.execute({
				sql: "DELETE FROM sessions WHERE share_id = ?",
				args: [shareId],
			});
			return result.rowsAffected > 0;
		},

		async getMessages(
			shareId: string,
			limit: number,
			offset: number,
		): Promise<Record<string, unknown>[]> {
			const result = await client.execute({
				sql: "SELECT * FROM messages WHERE share_id = ? ORDER BY sequence ASC LIMIT ? OFFSET ?",
				args: [shareId, limit, offset],
			});
			return result.rows as unknown as Record<string, unknown>[];
		},

		async countMessages(shareId: string): Promise<number> {
			const result = await client.execute({
				sql: "SELECT COUNT(*) as count FROM messages WHERE share_id = ?",
				args: [shareId],
			});
			const row = result.rows[0] as Record<string, unknown> | undefined;
			return (row?.count as number) ?? 0;
		},

		async validateApiKey(keyHash: string): Promise<boolean> {
			const result = await client.execute({
				sql: "SELECT id FROM api_keys WHERE key_hash = ? AND is_active = 1",
				args: [keyHash],
			});
			return result.rows.length > 0;
		},

		async insertApiKey(keyHash: string, name: string): Promise<void> {
			await client.execute({
				sql: "INSERT INTO api_keys (key_hash, name) VALUES (?, ?)",
				args: [keyHash, name],
			});
		},
	};
}
