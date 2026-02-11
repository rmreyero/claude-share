import { Hono } from "hono";
import { cors } from "hono/cors";
import { BASE_URL } from "./config.js";
import { createQueries } from "./db/queries.js";
import { createDatabase } from "./db/schema.js";
import { createApiRoutes } from "./routes/api.js";
import { createViewerRoutes } from "./routes/viewer.js";
import { hashKey } from "./utils/hash.js";

interface CreateAppOptions {
	baseUrl?: string;
}

export async function createApp(options?: CreateAppOptions) {
	const baseUrl = options?.baseUrl ?? BASE_URL;

	// Initialize database
	const client = await createDatabase();
	const queries = createQueries(client);

	// Auto-register API key from environment
	const envKey = process.env.SHARE_API_KEY;
	if (!envKey || envKey === "sk-change-me") {
		console.warn(
			"WARNING: SHARE_API_KEY not configured. Protected endpoints will reject all requests.",
		);
		console.warn("Run 'make generate-api-key' or set SHARE_API_KEY in .env");
	} else {
		const keyHash = hashKey(envKey);
		if (!(await queries.validateApiKey(keyHash))) {
			await queries.insertApiKey(keyHash, "env-auto");
			console.log(
				"Auto-registered API key from SHARE_API_KEY environment variable",
			);
		}
	}

	// Create app
	const app = new Hono();

	// Middleware
	app.use("/api/*", cors());

	// Routes
	app.route("/api", createApiRoutes(queries, baseUrl));
	app.route("/", createViewerRoutes(queries, baseUrl));

	return app;
}
