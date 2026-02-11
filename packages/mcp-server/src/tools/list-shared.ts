import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionListItem } from "@claude-share/shared";

const SHARE_SERVER_URL = process.env.SHARE_SERVER_URL ?? "https://claude-share-session.vercel.app";
const SHARE_API_KEY = process.env.SHARE_API_KEY ?? "";

export function registerListShared(server: McpServer) {
  server.tool(
    "list_shared",
    "List all sessions you have shared. Shows titles, dates, and URLs.",
    {},
    async () => {
      try {
        const response = await fetch(`${SHARE_SERVER_URL}/api/sessions`, {
          headers: {
            Authorization: `Bearer ${SHARE_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Failed to list sessions: ${response.status} ${errorText}` }],
          };
        }

        const sessions = (await response.json()) as SessionListItem[];

        if (sessions.length === 0) {
          return {
            content: [{ type: "text", text: "No shared sessions found." }],
          };
        }

        const lines = sessions.map(
          (s) =>
            `- **${s.title}** (${s.projectName})\n  ${s.url}\n  ${s.messageCount} messages · ${s.sessionDate}`
        );

        return {
          content: [
            {
              type: "text",
              text: `Shared sessions (${sessions.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error listing sessions: ${error}` }],
        };
      }
    }
  );
}
