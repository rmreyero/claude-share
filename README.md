# Claude Share Session

Share your Claude Code sessions via a simple URL.

Sessions are automatically sanitized — secrets, absolute paths, and large outputs are cleaned before sharing.

## Setup — Use the MCP Server in Claude Code

**Prerequisite:** [Bun](https://bun.sh) >= 1.2

### 1. Clone the repo

```bash
git clone https://github.com/your-org/claude-share-session.git
cd claude-share-session
make setup
```

### 2. Configure Claude Code

Add the MCP server to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "share-session": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/claude-share-session/packages/mcp-server/src/index.ts"],
      "env": {
        "SHARE_SERVER_URL": "https://claude-share-session.vercel.app",
        "SHARE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `/absolute/path/to/claude-share-session` with the actual path where you cloned the repo.

### 3. Restart Claude Code

Restart Claude Code (or run `/mcp`) so it picks up the new MCP server. You should see `share-session` listed.

### 4. Share a session

From any conversation, just ask:

```
> Share this session
```

Claude will parse, sanitize, and upload the session, then return a shareable URL like `https://claude-share-session.vercel.app/s/abc123def456`.

Other available commands:

| Command | What it does |
|---------|-------------|
| `Share this session` | Upload and get a shareable URL |
| `List my shared sessions` | Show all shared sessions with URLs |
| `Unshare session <id>` | Delete a shared session permanently |

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────────────────┐
│   Claude Code CLI   │         │         Web Server (Bun)        │
│                     │         │                                 │
│  ┌───────────────┐  │  HTTP   │  ┌──────────┐  ┌────────────┐  │
│  │  MCP Server   │──┼────────►│  │ Hono API │  │ React View │  │
│  │  (stdio)      │  │         │  └────┬─────┘  └──────┬─────┘  │
│  └───────┬───────┘  │         │       │               │         │
│          │          │         │  ┌────▼───────────────▼──────┐  │
│   reads .jsonl      │         │  │     SQLite (bun:sqlite)   │  │
│   from ~/.claude/   │         │  └───────────────────────────┘  │
└─────────────────────┘         └─────────────────────────────────┘
```

**Three packages in a Bun monorepo:**

| Package | Description |
|---------|-------------|
| `packages/shared` | Types, JSONL parser, session sanitizer |
| `packages/mcp-server` | Claude Code MCP plugin (runs locally via stdio) |
| `packages/web` | Hono API server + React session viewer |

## Session Viewer

Open the shared URL in any browser. The viewer shows:

- **Session header** — title, project, branch, model, token usage
- **Messages** — user messages (blue, right) and assistant responses (gray, left)
- **Thinking blocks** — collapsible, with amber border
- **Tool calls** — collapsible, with tool name badge
- **Code blocks** — syntax highlighted, with copy button and line numbers
- **Pagination** — loads 50 messages initially, infinite scroll for the rest

### What gets sanitized

Before uploading, sessions are cleaned automatically:

| What | Example | Result |
|------|---------|--------|
| Home paths | `/Users/john/projects/app` | `~/projects/app` |
| API keys | `sk-ant-abc123...` | `[REDACTED]` |
| GitHub tokens | `ghp_xxxx...` | `[REDACTED]` |
| Slack tokens | `xoxb-xxxx...` | `[REDACTED]` |
| Env secrets | `PASSWORD=hunter2` | `[REDACTED]` |
| Large outputs | Tool results > 10KB | First/last 500 chars + `[truncated]` |

## MCP Tools

| Tool | Description |
|------|-------------|
| `share_session` | Share the current session — parses, sanitizes, uploads, returns URL |
| `unshare_session` | Delete a shared session by its share ID |
| `list_shared` | List all your shared sessions with URLs |

## API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/sessions` | Upload session | API key |
| `GET` | `/api/sessions` | List sessions | API key |
| `GET` | `/api/sessions/:shareId` | Session metadata | Public |
| `GET` | `/api/sessions/:shareId/messages` | Paginated messages | Public |
| `DELETE` | `/api/sessions/:shareId` | Delete session | API key |
| `GET` | `/s/:shareId` | Session viewer | Public |
| `GET` | `/` | Landing page | Public |

## Docker Deployment

```bash
# Build and start
make docker-build
make docker-up

# View logs
make docker-logs

# Stop
make docker-down
```

Data is persisted in `./data/` via a Docker volume.

## Development

```bash
make help              # Show all commands
make install           # Install dependencies
make dev               # Start web server (dev mode, watch)
make dev-mcp           # Start MCP server (dev mode, watch)
make dev-all           # Start both in parallel
make build             # Build all packages
make typecheck         # Type check all packages
make generate-api-key  # Generate a new API key
make lint              # Run linter
make format            # Format code
make clean             # Remove dist/ and node_modules/
make db-reset          # Reset the database
```

## Project Structure

```
claude-share-session/
├── packages/
│   ├── shared/src/
│   │   ├── types/session.ts    # JSONL format types
│   │   ├── types/api.ts        # API request/response types
│   │   ├── parser.ts           # JSONL → structured conversation
│   │   └── sanitizer.ts        # Clean paths, secrets, truncate
│   ├── mcp-server/src/
│   │   ├── index.ts            # MCP server entry
│   │   └── tools/              # share, unshare, list
│   └── web/src/
│       ├── server/             # Hono API + routes
│       │   ├── db/             # SQLite schema + queries
│       │   └── routes/         # API + viewer routes
│       └── client/             # React viewer
│           └── components/     # SessionViewer, MessageBubble, etc.
├── Makefile
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Web server port | `3000` |
| `DATABASE_PATH` | SQLite database file | `./data/sessions.db` |
| `SHARE_SERVER_URL` | Web server URL (for MCP) | `http://localhost:3000` |
| `SHARE_API_KEY` | API key for authentication | — |
| `SESSION_EXPIRY_DAYS` | Auto-expire after N days | `30` |

## License

MIT
