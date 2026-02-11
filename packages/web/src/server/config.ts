import { isAbsolute, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let MONOREPO_ROOT: string | null = null;

// loadEnv reads .env from monorepo root — only needed for local/Docker dev.
// Use sync-compatible approach to avoid top-level await that blocks Vercel cold start.
try {
	// @claude-share/shared is always available (workspace dep)
	const { loadEnv } = require("@claude-share/shared");
	const currentDir = dirname(fileURLToPath(import.meta.url));
	MONOREPO_ROOT = loadEnv(currentDir);
} catch {
	// Expected on Vercel — env vars come from the dashboard instead
}

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
