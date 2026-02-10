import { isAbsolute, resolve } from "node:path";
import { loadEnv } from "@claude-share/shared";

// Load .env from monorepo root (no-op if vars already set)
const MONOREPO_ROOT = loadEnv(import.meta.dir);

export const PORT = Number(process.env.PORT ?? "3000");
export const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Resolve the database path.
 * - Absolute paths (e.g. Docker's /data/sessions.db) are used as-is.
 * - Relative paths are resolved against the monorepo root, or CWD as fallback (Docker).
 */
export function resolveDatabasePath(): string {
	const raw = process.env.DATABASE_PATH ?? "./data/sessions.db";
	if (isAbsolute(raw)) return raw;
	return resolve(MONOREPO_ROOT ?? process.cwd(), raw);
}
