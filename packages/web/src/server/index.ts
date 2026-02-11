import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "hono/bun";
import { PORT, BASE_URL } from "./config.js";
import { createApp } from "./app.js";

const app = await createApp();

// Static files — resolve relative to this file, not CWD
const currentDir = dirname(fileURLToPath(import.meta.url));

app.use("/client/*", serveStatic({ root: resolve(currentDir, "../../dist") }));

console.log(`Claude Share Session server running on ${BASE_URL}`);

export default {
	port: PORT,
	fetch: app.fetch,
};
