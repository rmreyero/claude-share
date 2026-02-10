import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { createDatabase } from "./db/schema.js";
import { createQueries } from "./db/queries.js";
import { createApiRoutes } from "./routes/api.js";
import { createViewerRoutes } from "./routes/viewer.js";

const PORT = Number(process.env.PORT ?? "3000");
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

// Initialize database
const db = createDatabase();
const queries = createQueries(db);

// Create app
const app = new Hono();

// Middleware
app.use("/api/*", cors());

// Static files
app.use("/public/*", serveStatic({ root: "./dist" }));

// Routes
app.route("/api", createApiRoutes(queries, BASE_URL));
app.route("/", createViewerRoutes(queries, BASE_URL));

console.log(`Claude Share Session server running on ${BASE_URL}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
