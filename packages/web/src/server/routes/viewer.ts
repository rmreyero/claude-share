import { Hono } from "hono";
import type { createQueries } from "../db/queries.js";

type Queries = ReturnType<typeof createQueries>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function viewerHtml(shareId: string, title: string, description: string, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Claude Share Session</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${baseUrl}/s/${shareId}">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="/public/style.css">
</head>
<body>
  <div id="root" data-share-id="${shareId}" data-api-base="${baseUrl}"></div>
  <script src="/public/index.js"></script>
</body>
</html>`;
}

function landingHtml(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Share Session</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; text-align: center; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 1rem; color: #fff; }
    p { color: #a3a3a3; line-height: 1.6; margin-bottom: 1.5rem; }
    code { background: #1a1a1a; padding: 0.2em 0.5em; border-radius: 4px; font-size: 0.9em; color: #d4a574; }
    .badge { display: inline-block; background: #1a1a2e; color: #7c93db; padding: 0.3em 0.8em; border-radius: 9999px; font-size: 0.85rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">v0.1.0</div>
    <h1>Claude Share Session</h1>
    <p>Share your Claude Code sessions with a simple URL. Sessions are sanitized to remove secrets and absolute paths before sharing.</p>
    <p>Use the MCP tool <code>share_session</code> from Claude Code to share your current session.</p>
  </div>
</body>
</html>`;
}

export function createViewerRoutes(queries: Queries, baseUrl: string) {
  const viewer = new Hono();

  // GET / — Landing page
  viewer.get("/", (c) => {
    return c.html(landingHtml(baseUrl));
  });

  // GET /s/:shareId — Session viewer
  viewer.get("/s/:shareId", (c) => {
    const shareId = c.req.param("shareId");
    const session = queries.getSession(shareId);

    if (!session) {
      return c.html("<h1>Session not found</h1>", 404);
    }

    const title = session.title as string;
    const description = `${session.message_count} messages · ${session.project_name}${session.model ? ` · ${session.model}` : ""}`;

    return c.html(viewerHtml(shareId, title, description, baseUrl));
  });

  return viewer;
}
