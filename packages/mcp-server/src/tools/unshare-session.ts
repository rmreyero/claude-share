import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DeleteSessionResponse } from "@claude-share/shared";

const SHARE_SERVER_URL = process.env.SHARE_SERVER_URL ?? "http://localhost:3000";
const SHARE_API_KEY = process.env.SHARE_API_KEY ?? "";

export function registerUnshareSession(server: McpServer) {
  server.tool(
    "unshare_session",
    "Delete a previously shared session. The shared URL will no longer be accessible.",
    {
      shareId: z.string().describe("The share ID of the session to delete."),
    },
    async ({ shareId }) => {
      try {
        const response = await fetch(`${SHARE_SERVER_URL}/api/sessions/${shareId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${SHARE_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Failed to delete session: ${response.status} ${errorText}` }],
          };
        }

        const result = (await response.json()) as DeleteSessionResponse;

        if (result.deleted) {
          return {
            content: [{ type: "text", text: `Session ${shareId} has been deleted. The shared URL is no longer accessible.` }],
          };
        }

        return {
          content: [{ type: "text", text: `Session ${shareId} was not found or already deleted.` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error deleting session: ${error}` }],
        };
      }
    }
  );
}
