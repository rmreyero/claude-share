import { resolve } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { BASE_URL, PORT } from "./config.js";
import { createQueries } from "./db/queries.js";
import { createDatabase } from "./db/schema.js";
import { createApiRoutes } from "./routes/api.js";
import { createViewerRoutes } from "./routes/viewer.js";
import { hashKey } from "./utils/hash.js";

// Initialize database
const db = createDatabase();
const queries = createQueries(db);

// Auto-register API key from environment
const envKey = process.env.SHARE_API_KEY;
if (!envKey || envKey === "sk-change-me") {
	console.warn(
		"WARNING: SHARE_API_KEY not configured. Protected endpoints will reject all requests.",
	);
	console.warn("Run 'make generate-api-key' or set SHARE_API_KEY in .env");
} else {
	const keyHash = hashKey(envKey);
	if (!queries.validateApiKey(keyHash)) {
		queries.insertApiKey(keyHash, "env-auto");
		console.log(
			"Auto-registered API key from SHARE_API_KEY environment variable",
		);
	}
}

// Create app
const app = new Hono();

// Middleware
app.use("/api/*", cors());

// Static files — resolve relative to this file, not CWD
app.use(
	"/public/*",
	serveStatic({ root: resolve(import.meta.dir, "../../dist") }),
);

// Routes
app.route("/api", createApiRoutes(queries, BASE_URL));
app.route("/", createViewerRoutes(queries, BASE_URL));

console.log(`Claude Share Session server running on ${BASE_URL}`);

export default {
	port: PORT,
	fetch: app.fetch,
};
