# Claude Share Session

Share your Claude Code sessions via a simple URL.

Sessions are automatically sanitized — secrets, absolute paths, and large outputs are cleaned before sharing.

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

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.2
- [Docker](https://docker.com) (optional, for deployment)

### Install & Run

```bash
# Clone and setup
git clone https://github.com/your-org/claude-share-session.git
cd claude-share-session
make setup

# Start the web server
make dev
```

`make setup` will install dependencies, create `.env` from the example, and generate an initial API key.

### Configure MCP Server in Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "share-session": {
      "command": "bunx",
      "args": ["claude-share-session-mcp"],
      "env": {
        "SHARE_SERVER_URL": "http://localhost:3000",
        "SHARE_API_KEY": "sk-your-generated-key"
      }
    }
  }
}
```

Then restart Claude Code to load the MCP server.

> **Local development:** If you haven't published the package, use a direct path instead:
> ```json
> "command": "bun",
> "args": ["run", "/path/to/claude-share-session/packages/mcp-server/src/index.ts"]
> ```

## Usage

### Share a session

From any Claude Code conversation, ask Claude to share the session:

```
> Share this session
```

Claude will call the `share_session` tool, which:
1. Reads the current `.jsonl` session from `~/.claude/projects/`
2. Sanitizes it (removes secrets, absolute paths, truncates large outputs)
3. Uploads it to the web server
4. Returns a shareable URL like `http://localhost:3000/s/abc123def456`

Share that URL with anyone — no authentication needed to view.

### List shared sessions

```
> List my shared sessions
```

Returns all sessions you've shared, with their URLs and metadata.

### Delete a shared session

```
> Unshare session abc123def456
```

Permanently removes the session. The URL will stop working immediately.

### View a session

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
