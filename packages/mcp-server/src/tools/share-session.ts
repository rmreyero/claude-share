import { z } from "zod";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { userInfo } from "node:os";
import { nanoid } from "nanoid";
import { parseSession, sanitizeSession } from "@claude-share/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CreateSessionRequest, CreateSessionResponse } from "@claude-share/shared";

function getServerUrl() {
  return process.env.SHARE_SERVER_URL ?? "https://claude-share-session.vercel.app";
}
function getApiKey() {
  return process.env.SHARE_API_KEY ?? "";
}

/** Encode a project path to the directory name format used by Claude Code */
function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

/** Find the most recent .jsonl in a single project directory */
function findLatestInDir(
  projectDir: string,
  dirName: string,
): { path: string; projectName: string; mtime: number } | null {
  if (!existsSync(projectDir)) return null;

  let latestFile: string | null = null;
  let latestTime = 0;

  const files = readdirSync(projectDir, { withFileTypes: true });
  for (const file of files) {
    if (!file.name.endsWith(".jsonl")) continue;
    const filePath = join(projectDir, file.name);
    const stat = Bun.file(filePath);
    const mtime = stat.lastModified;
    if (mtime > latestTime) {
      latestTime = mtime;
      latestFile = filePath;
    }
  }

  if (!latestFile) return null;
  const projectName = dirName.replace(/-/g, "/").replace(/^\//, "");
  return { path: latestFile, projectName, mtime: latestTime };
}

/** Find the current session JSONL file, optionally scoped to a project path */
function findCurrentSession(projectPath?: string): { path: string; projectName: string } | null {
  const claudeDir = join(process.env.HOME ?? "~", ".claude");
  const projectsDir = join(claudeDir, "projects");

  if (!existsSync(projectsDir)) return null;

  // If projectPath is given, only search within that project's directory
  if (projectPath) {
    const encodedDir = encodeProjectPath(projectPath);
    const projectDir = join(projectsDir, encodedDir);
    return findLatestInDir(projectDir, encodedDir);
  }

  // Otherwise, scan all project directories
  let best: { path: string; projectName: string; mtime: number } | null = null;
  const projectDirs = readdirSync(projectsDir, { withFileTypes: true });
  for (const dir of projectDirs) {
    if (!dir.isDirectory()) continue;
    const result = findLatestInDir(join(projectsDir, dir.name), dir.name);
    if (result && (!best || result.mtime > best.mtime)) {
      best = result;
    }
  }

  return best;
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
          projectName = projectPath
            ? basename(projectPath)
            : basename(sessionPath, ".jsonl");
        } else {
          const found = findCurrentSession(projectPath);
          if (!found) {
            return {
              content: [{ type: "text", text: "No session found. Make sure you have an active Claude Code session." }],
            };
          }
          path = found.path;
          projectName = projectPath
            ? basename(projectPath)
            : found.projectName;
        }

        const jsonl = readFileSync(path, "utf-8");
        const parsed = parseSession(jsonl, projectName);
        parsed.metadata.userName = userInfo().username;
        const sanitized = sanitizeSession(parsed, projectPath);
        const shareId = nanoid(12);

        const body: CreateSessionRequest = {
          shareId,
          metadata: sanitized.metadata,
          messages: sanitized.messages,
        };

        const serverUrl = getServerUrl();
        const targetUrl = `${serverUrl}/api/sessions`;
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
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
        const err = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
        return {
          content: [{ type: "text", text: `Error sharing session: ${err}` }],
        };
      }
    }
  );
}
