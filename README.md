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

Then from any Claude Code session, use the `share_session` tool to share it.

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
