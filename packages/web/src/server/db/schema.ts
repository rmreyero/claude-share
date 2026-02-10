import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveDatabasePath } from "../config.js";

const DATABASE_PATH = resolveDatabasePath();

function ensureDir(path: string) {
	mkdirSync(dirname(path), { recursive: true });
}

export function createDatabase(): Database {
	ensureDir(DATABASE_PATH);
	const db = new Database(DATABASE_PATH, { create: true });

	// Enable WAL mode for better concurrent read performance
	db.run("PRAGMA journal_mode = WAL");
	db.run("PRAGMA foreign_keys = ON");

	db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
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
    )
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS messages (
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
    )
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )
  `);

	return db;
}
