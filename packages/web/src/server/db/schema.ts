import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveDatabasePath } from "../config.js";

function ensureDir(path: string) {
	mkdirSync(dirname(path), { recursive: true });
}

function isServerless(): boolean {
	return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function buildDatabaseUrl(): string {
	if (process.env.TURSO_DATABASE_URL) {
		return process.env.TURSO_DATABASE_URL;
	}
	if (isServerless()) {
		throw new Error(
			"TURSO_DATABASE_URL is required in serverless environments. " +
				"Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your environment variables.",
		);
	}
	const filePath = resolveDatabasePath();
	ensureDir(filePath);
	return `file:${filePath}`;
}

export type DatabaseClient = ReturnType<typeof createClient>;

export async function createDatabase(): Promise<DatabaseClient> {
	const url = buildDatabaseUrl();
	const client = createClient({
		url,
		authToken: process.env.TURSO_AUTH_TOKEN,
	});

	const ddl = [
		`CREATE TABLE IF NOT EXISTS sessions (
      share_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_name TEXT NOT NULL,
      user_name TEXT,
      branch TEXT,
      model TEXT,
      session_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      message_count INTEGER DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0
    )`,
		`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      share_id TEXT NOT NULL REFERENCES sessions(share_id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      type TEXT NOT NULL,
      role TEXT,
      content_json TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      timestamp TEXT,
      has_thinking INTEGER DEFAULT 0,
      has_tool_use INTEGER DEFAULT 0,
      UNIQUE(share_id, sequence)
    )`,
		`CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )`,
	];

	if (url.startsWith("file:")) {
		await client.execute("PRAGMA journal_mode = WAL");
		await client.execute("PRAGMA foreign_keys = ON");
		for (const sql of ddl) {
			await client.execute(sql);
		}
	} else {
		await client.batch(ddl, "write");
	}

	return client;
}
