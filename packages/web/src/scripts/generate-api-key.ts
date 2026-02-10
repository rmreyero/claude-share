#!/usr/bin/env bun
/**
 * Generate a new API key and store its hash in the database.
 * Usage: bun run packages/web/src/scripts/generate-api-key.ts [name]
 */
import { createDatabase } from "../server/db/schema.js";
import { createQueries } from "../server/db/queries.js";
import { hashKey } from "../server/utils/hash.js";

const name = process.argv[2] ?? "default";

// Generate a random API key
const bytes = crypto.getRandomValues(new Uint8Array(32));
const key = `sk-${Buffer.from(bytes).toString("base64url")}`;

// Hash it
const keyHash = hashKey(key);

// Store in database
const db = createDatabase();
const queries = createQueries(db);
queries.insertApiKey(keyHash, name);

console.log("API key generated successfully!\n");
console.log(`  Name: ${name}`);
console.log(`  Key:  ${key}`);
console.log("\nAdd this to your .env file:");
console.log(`  SHARE_API_KEY=${key}`);
console.log("\nStore this key safely — it cannot be retrieved later.");
