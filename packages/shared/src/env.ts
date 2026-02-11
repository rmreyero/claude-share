import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Walk up from `startDir` looking for a package.json with "workspaces".
 * Returns the directory containing it, or null if not found.
 */
function findMonorepoRoot(startDir: string): string | null {
	let dir = resolve(startDir);

	while (true) {
		const pkgPath = join(dir, "package.json");
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
				if (pkg.workspaces) {
					return dir;
				}
			} catch {
				// skip malformed package.json
			}
		}

		const parent = dirname(dir);
		if (parent === dir) break; // reached filesystem root
		dir = parent;
	}

	return null;
}

/**
 * Parse a .env file into key-value pairs.
 * Handles quoted values, comments, and empty lines.
 */
function parseEnvFile(content: string): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;

		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();

		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		vars[key] = value;
	}
	return vars;
}

/** Keys that must always be read from .env (parent process may inject stale values) */
const FORCE_OVERWRITE_KEYS = new Set(["SHARE_SERVER_URL", "SHARE_API_KEY"]);

/**
 * Find the monorepo root from `startDir` and load its `.env` file.
 * Most variables are only set if not already present in process.env.
 * SHARE_* variables are always overwritten — the parent process (e.g. Claude Code)
 * may inject stale values from cached .env.local files.
 * Returns the monorepo root path, or null if not found.
 */
export function loadEnv(startDir: string): string | null {
	const root = findMonorepoRoot(startDir);
	if (!root) return null;

	const envPath = join(root, ".env");
	if (!existsSync(envPath)) return root;

	try {
		const content = readFileSync(envPath, "utf-8");
		const vars = parseEnvFile(content);
		for (const [key, value] of Object.entries(vars)) {
			if (FORCE_OVERWRITE_KEYS.has(key) || process.env[key] === undefined) {
				process.env[key] = value;
			}
		}
	} catch {
		// .env is optional; silently skip if unreadable
	}

	return root;
}
