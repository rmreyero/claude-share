#!/usr/bin/env bun
import { loadEnv } from "@claude-share/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListShared } from "./tools/list-shared.js";
import { registerShareSession } from "./tools/share-session.js";
import { registerUnshareSession } from "./tools/unshare-session.js";

// Load .env from monorepo root so SHARE_SERVER_URL and SHARE_API_KEY are available
loadEnv(import.meta.dir);

const server = new McpServer({
	name: "claude-share-session",
	version: "0.1.0",
});

registerShareSession(server);
registerUnshareSession(server);
registerListShared(server);

const transport = new StdioServerTransport();
await server.connect(transport);
