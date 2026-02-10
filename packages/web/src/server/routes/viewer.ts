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
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Libre+Franklin:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-deep: #08080a;
      --bg-surface: #0e0e11;
      --bg-card: #121216;
      --bg-code: #0c0c0f;
      --border: #1e1e24;
      --border-subtle: #16161b;
      --text-primary: #e8e6e1;
      --text-secondary: #9e9d97;
      --text-muted: #78776f;
      --accent: #d4a574;
      --accent-dim: rgba(212, 165, 116, 0.08);
      --accent-glow: rgba(212, 165, 116, 0.04);
      --purple: #a896d3;
      --purple-dim: rgba(168, 150, 211, 0.08);
      --green: #8fb886;
      --red: #c97070;
    }

    body {
      font-family: 'Libre Franklin', system-ui, sans-serif;
      background: var(--bg-deep);
      color: var(--text-primary);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }

    /* ── Grain overlay ─────────────────────────────── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      opacity: 0.025;
      pointer-events: none;
      z-index: 100;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-repeat: repeat;
      background-size: 180px;
    }

    /* ── Hero ───────────────────────────────────────── */
    .hero {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      padding: 4rem 2rem 1.5rem;
      text-align: center;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -20%;
      left: 50%;
      transform: translateX(-50%);
      width: 900px;
      height: 600px;
      background: radial-gradient(ellipse at center, rgba(168, 150, 211, 0.045) 0%, rgba(212, 165, 116, 0.02) 40%, transparent 70%);
      pointer-events: none;
    }
    .hero::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, var(--border) 20%, var(--border) 80%, transparent 100%);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--purple-dim);
      color: var(--purple);
      padding: 0.4em 1.1em;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: 1px solid rgba(168, 150, 211, 0.1);
      margin-bottom: 2.25rem;
      animation: fadeUp 0.7s ease-out 0.3s both;
    }
    .hero-badge::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--purple);
      opacity: 0.6;
    }

    h1 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      font-weight: 400;
      color: #fff;
      letter-spacing: -0.025em;
      line-height: 1.1;
      margin-bottom: 1.5rem;
      animation: fadeUp 0.7s ease-out 0.4s both;
    }
    h1 em {
      font-style: italic;
      color: var(--accent);
    }

    .hero-desc {
      max-width: 460px;
      color: var(--text-secondary);
      line-height: 1.8;
      font-size: 1rem;
      font-weight: 300;
      animation: fadeUp 0.7s ease-out 0.55s both;
    }

    .hero-prompt {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 2.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: var(--text-secondary);
      animation: fadeUp 0.7s ease-out 0.7s both;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .hero-prompt:hover {
      border-color: rgba(212, 165, 116, 0.2);
      box-shadow: 0 0 30px rgba(212, 165, 116, 0.03);
    }
    .hero-prompt .prompt-caret {
      color: var(--accent);
      opacity: 0.6;
    }
    .hero-prompt .prompt-tool {
      color: var(--accent);
      font-weight: 500;
    }

    .scroll-hint {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      animation: fadeUp 0.7s ease-out 0.9s both;
    }
    .scroll-hint svg {
      width: 16px;
      height: 16px;
      opacity: 0.4;
      animation: bobDown 2s ease-in-out infinite;
    }

    /* ── Setup section ─────────────────────────────── */
    .setup-wrapper {
      position: relative;
      background: var(--bg-surface);
    }
    .setup-wrapper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 120px;
      background: linear-gradient(to bottom, var(--bg-deep), var(--bg-surface));
      pointer-events: none;
    }

    .setup {
      position: relative;
      max-width: 660px;
      margin: 0 auto;
      padding: 3.5rem 2rem 3rem;
    }

    .setup-header {
      margin-bottom: 2rem;
    }
    .setup-header h2 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.75rem;
      font-weight: 400;
      color: #fff;
      letter-spacing: -0.01em;
      margin-bottom: 0.6rem;
    }
    .setup-header p {
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 300;
      line-height: 1.7;
    }

    /* ── Step cards ─────────────────────────────────── */
    .step-card {
      position: relative;
      padding: 1.75rem 0;
    }
    .step-card + .step-card {
      border-top: 1px solid var(--border-subtle);
    }

    .step-label {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 6px;
      background: var(--accent-dim);
      color: var(--accent);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 500;
      border: 1px solid rgba(212, 165, 116, 0.1);
    }
    .step-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }

    .step-card p {
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.75;
      margin-bottom: 0.75rem;
      font-weight: 300;
    }
    .step-card .note {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      padding-left: 1rem;
      border-left: 2px solid var(--border);
    }

    /* ── Code blocks ───────────────────────────────── */
    pre.config {
      position: relative;
      background: var(--bg-code);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      line-height: 1.8;
      color: var(--text-secondary);
      margin: 0.75rem 0 1rem;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02);
    }
    pre.config::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
    }
    pre.config .k { color: var(--accent); }
    pre.config .s { color: var(--green); }
    pre.config .c { color: var(--text-muted); font-style: italic; }
    pre.config .p { color: #6e6d68; }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: var(--bg-card);
      padding: 0.2em 0.55em;
      border-radius: 5px;
      font-size: 0.82em;
      color: var(--accent);
      border: 1px solid var(--border);
    }

    /* ── Footer ─────────────────────────────────────── */
    .footer {
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .footer p {
      color: var(--text-muted);
      font-size: 0.78rem;
      letter-spacing: 0.02em;
    }
    .footer a {
      color: var(--text-secondary);
      text-decoration: none;
      border-bottom: 1px solid var(--border);
      transition: color 0.2s, border-color 0.2s;
    }
    .footer a:hover {
      color: var(--accent);
      border-color: var(--accent);
    }

    /* ── Animations ─────────────────────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bobDown {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(4px); }
    }

    /* ── Responsive ─────────────────────────────────── */
    @media (max-width: 640px) {
      .hero { height: 100vh; height: 100dvh; padding: 3rem 1.5rem 1.5rem; }
      h1 { font-size: 2rem; }
      .setup { padding: 3rem 1.5rem 4rem; }
      .hero-prompt { font-size: 0.75rem; padding: 0.6rem 1rem; }
    }
  </style>
</head>
<body>

  <!-- ── Hero ──────────────────────────────────────── -->
  <section class="hero">
    <div class="hero-badge">MCP Tool &middot; v0.1.0</div>

    <h1>Share your <em>Claude Code</em><br>sessions</h1>

    <p class="hero-desc">
      Turn any Claude Code conversation into a shareable URL.
      Sessions are automatically sanitized&mdash;secrets redacted,
      paths anonymized&mdash;before publishing.
    </p>

    <div class="hero-prompt">
      <span class="prompt-caret">&#9656;</span>
      <span><span class="prompt-tool">share_session</span></span>
    </div>

    <div class="scroll-hint">
      setup
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M4 9l4 4 4-4"/></svg>
    </div>
  </section>

  <!-- ── Setup ─────────────────────────────────────── -->
  <section class="setup-wrapper">
    <div class="setup">
      <div class="setup-header">
        <h2>Getting started</h2>
        <p>Configure the MCP server so Claude Code can share sessions directly from any conversation.</p>
      </div>

      <div class="step-card">
        <div class="step-label">
          <span class="step-num">1</span>
          <span class="step-title">Add the MCP server</span>
        </div>
        <p>Add this block to your Claude Code settings (<code>~/.claude.json</code>):</p>
        <pre class="config"><span class="p">{</span>
  <span class="k">"mcpServers"</span><span class="p">:</span> <span class="p">{</span>
    <span class="k">"share-session"</span><span class="p">:</span> <span class="p">{</span>
      <span class="k">"command"</span><span class="p">:</span> <span class="s">"npx"</span><span class="p">,</span>
      <span class="k">"args"</span><span class="p">:</span> <span class="p">[</span><span class="s">"claude-share-session-mcp"</span><span class="p">],</span>
      <span class="k">"env"</span><span class="p">:</span> <span class="p">{</span>
        <span class="k">"SHARE_SERVER_URL"</span><span class="p">:</span> <span class="s">"${escapeHtml(baseUrl)}"</span><span class="p">,</span>
        <span class="k">"SHARE_API_KEY"</span><span class="p">:</span> <span class="s">"your-api-key"</span>
      <span class="p">}</span>
    <span class="p">}</span>
  <span class="p">}</span>
<span class="p">}</span></pre>
        <p class="note">For a local clone, use <code>"command": "bun"</code> with <code>"args": ["run", "packages/mcp-server/src/index.ts"]</code> instead.</p>
      </div>

      <div class="step-card">
        <div class="step-label">
          <span class="step-num">2</span>
          <span class="step-title">Generate an API key</span>
        </div>
        <p>If running the server locally:</p>
        <pre class="config"><span class="c"># generates a key and stores its hash in the database</span>
make generate-api-key</pre>
        <p>Copy the output key into your MCP config's <code>SHARE_API_KEY</code> field.</p>
        <p class="note">The server also auto-registers the <code>SHARE_API_KEY</code> from <code>.env</code> on startup&mdash;useful for Docker deployments where you can't run scripts.</p>
      </div>

      <div class="step-card">
        <div class="step-label">
          <span class="step-num">3</span>
          <span class="step-title">Share a session</span>
        </div>
        <p>From any Claude Code conversation, ask Claude to share the session, or invoke the tools directly:</p>
        <pre class="config"><span class="c"># Available MCP tools</span>
share_session    <span class="c"># Share your current session</span>
list_shared      <span class="c"># List all shared sessions</span>
unshare_session  <span class="c"># Delete a shared session</span></pre>
      </div>
    </div>
  </section>

  <!-- ── Footer ────────────────────────────────────── -->
  <footer class="footer">
    <p>Claude Share Session &middot; <a href="https://github.com/anthropics" target="_blank" rel="noopener">GitHub</a></p>
  </footer>

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
