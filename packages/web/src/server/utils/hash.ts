import { createHash } from "node:crypto";

/** Hash a key using SHA-256 */
export function hashKey(key: string): string {
	return createHash("sha256").update(key).digest("hex");
}
