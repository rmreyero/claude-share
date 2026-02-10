import { z } from "zod";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { nanoid } from "nanoid";
import { parseSession, sanitizeSession } from "@claude-share/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CreateSessionRequest, CreateSessionResponse } from "@claude-share/shared";

const SHARE_SERVER_URL = process.env.SHARE_SERVER_URL ?? "http://localhost:3000";
const SHARE_API_KEY = process.env.SHARE_API_KEY ?? "";

/** Find the current session JSONL file */
function findCurrentSession(): { path: string; projectName: string } | null {
  const claudeDir = join(process.env.HOME ?? "~", ".claude");
  const projectsDir = join(claudeDir, "projects");

  if (!existsSync(projectsDir)) return null;

  let latestFile: string | null = null;
  let latestTime = 0;
  let projectName = "unknown";

  // Walk through project directories to find the most recent .jsonl
  const projectDirs = readdirSync(projectsDir, { withFileTypes: true });
  for (const dir of projectDirs) {
    if (!dir.isDirectory()) continue;
    const projectDir = join(projectsDir, dir.name);
    const files = readdirSync(projectDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.name.endsWith(".jsonl")) continue;
      const filePath = join(projectDir, file.name);
      const stat = Bun.file(filePath);
      // Use the file's lastModified
      const mtime = stat.lastModified;
      if (mtime > latestTime) {
        latestTime = mtime;
        latestFile = filePath;
        projectName = dir.name.replace(/-/g, "/").replace(/^\//, "");
      }
    }
  }

  if (!latestFile) return null;
  return { path: latestFile, projectName };
}

export function registerShareSession(server: McpServer) {
  server.tool(
    "share_session",
    "Share the current Claude Code session via a shareable URL. Reads the active session, sanitizes it (removes secrets, absolute paths), and uploads it to the share server.",
    {
      sessionPath: z
        .string()
        .optional()
        .describe("Path to a specific .jsonl session file. If omitted, uses the most recent session."),
      projectPath: z
        .string()
        .optional()
        .describe("Project root path for path sanitization."),
    },
    async ({ sessionPath, projectPath }) => {
      try {
        let path: string;
        let projectName: string;

        if (sessionPath) {
          path = sessionPath;
          projectName = basename(sessionPath, ".jsonl");
        } else {
          const found = findCurrentSession();
          if (!found) {
            return {
              content: [{ type: "text", text: "No session found. Make sure you have an active Claude Code session." }],
            };
          }
          path = found.path;
          projectName = found.projectName;
        }

        const jsonl = readFileSync(path, "utf-8");
        const parsed = parseSession(jsonl, projectName);
        const sanitized = sanitizeSession(parsed, projectPath);
        const shareId = nanoid(12);

        const body: CreateSessionRequest = {
          shareId,
          metadata: sanitized.metadata,
          messages: sanitized.messages,
        };

        const response = await fetch(`${SHARE_SERVER_URL}/api/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SHARE_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text", text: `Failed to share session: ${response.status} ${errorText}` }],
          };
        }

        const result = (await response.json()) as CreateSessionResponse;

        return {
          content: [
            {
              type: "text",
              text: `Session shared successfully!\n\nURL: ${result.url}\nShare ID: ${result.shareId}\n\nAnyone with this link can view the sanitized session.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error sharing session: ${error}` }],
        };
      }
    }
  );
}
