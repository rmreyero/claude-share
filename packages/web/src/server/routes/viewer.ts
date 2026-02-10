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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/public/style.css">
</head>
<body class="grain">
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600&family=Fira+Code:wght@400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #0c0c0b;
      color: #eae9e6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 540px;
      text-align: center;
      padding: 3rem 2rem;
      animation: fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      font-family: 'Instrument Serif', Georgia, serif;
      font-size: 2.75rem;
      font-weight: 400;
      margin-bottom: 1.5rem;
      color: #fff;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    p {
      color: #b5b4ad;
      line-height: 1.75;
      margin-bottom: 1.5rem;
      font-size: 1.05rem;
    }
    code {
      font-family: 'Fira Code', monospace;
      background: #1c1c1a;
      padding: 0.25em 0.6em;
      border-radius: 6px;
      font-size: 0.85em;
      color: #c9956b;
      border: 1px solid #2a2a27;
    }
    .badge {
      display: inline-block;
      background: rgba(155, 142, 196, 0.1);
      color: #9b8ec4;
      padding: 0.35em 1em;
      border-radius: 9999px;
      font-size: 0.8rem;
      margin-bottom: 2.5rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      border: 1px solid rgba(155, 142, 196, 0.15);
    }
    .divider {
      width: 48px;
      height: 1px;
      background: #2a2a27;
      margin: 0 auto 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">v0.1.0</div>
    <h1>Claude Share Session</h1>
    <div class="divider"></div>
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
