#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerShareSession } from "./tools/share-session.js";
import { registerUnshareSession } from "./tools/unshare-session.js";
import { registerListShared } from "./tools/list-shared.js";

const server = new McpServer({
  name: "claude-share-session",
  version: "0.1.0",
});

registerShareSession(server);
registerUnshareSession(server);
registerListShared(server);

const transport = new StdioServerTransport();
await server.connect(transport);
