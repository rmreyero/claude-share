// Vercel entrypoint — zero-config Hono deployment
import { Hono } from "hono";
import { createApp } from "../packages/web/src/server/app.js";

const app = await createApp({
	baseUrl:
		process.env.BASE_URL ??
		(process.env.VERCEL_PROJECT_PRODUCTION_URL
			? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
			: process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: undefined),
});

export default app;

