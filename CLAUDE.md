# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Share Claude Code sessions via a URL. Sessions are automatically sanitized (secrets, paths, large outputs removed) before being stored in SQLite and rendered in a React viewer.

## Commands

```bash
make setup              # Install deps, create .env, generate API key (first-time)
make dev                # Start web server with watch mode (port 3000)
make dev-mcp            # Start MCP server with watch mode
make dev-all            # Start both in parallel
make build              # Build all packages
make typecheck          # TypeScript type checking across all packages
make lint               # bunx biome check .
make format             # bunx biome format --write .
make generate-api-key   # Create new API key in database
make db-reset           # Delete SQLite database (recreated on next start)
make docker-build       # Build Docker image
make docker-up          # Start containers
```

No test suite exists yet. There is no test runner configured.

## Architecture

Bun monorepo with three packages:

```
Session .jsonl → Parser → Sanitizer → POST /api/sessions → SQLite
                                                              ↓
                          Browser ← GET /s/:shareId ← React Viewer
```

### `packages/shared` — Core library
- **parser.ts** — Parses JSONL session files into `ParsedSession` (filters non-displayable types like `progress`, `file-history-snapshot`; calculates tokens; derives title)
- **sanitizer.ts** — Redacts secrets (`sk-*`, `ghp_*`, `xoxb-*`, env vars with KEY/TOKEN/SECRET/PASSWORD), converts absolute paths to `~/`, truncates tool results >10KB
- **types/** — Shared TypeScript types (`ContentBlock`, `ParsedMessage`, `SessionMetadata`, API request/response types)
- Consumed by both `mcp-server` and `web`

### `packages/mcp-server` — Claude Code MCP plugin (stdio transport)
- Registers three tools: `share_session`, `unshare_session`, `list_shared`
- `share_session` reads `.jsonl` from `~/.claude/projects/`, parses, sanitizes, uploads via HTTP to web server
- Uses `SHARE_SERVER_URL` and `SHARE_API_KEY` env vars
- Entry: `src/index.ts`, tools in `src/tools/`

### `packages/web` — Hono API server + React viewer
- **Server side** (`src/server/`):
  - Hono web framework with REST API routes (`routes/api.ts`) and HTML viewer routes (`routes/viewer.ts`)
  - SQLite via `bun:sqlite` with WAL mode (`db/schema.ts`, `db/queries.ts`)
  - API auth via SHA-256 hashed API keys in `Authorization: Bearer` header
  - Public endpoints: session metadata, paginated messages, viewer HTML
  - Protected endpoints: upload, list, delete sessions
- **Client side** (`src/client/`):
  - React 19 with `SessionViewer` as root component
  - Infinite scroll (IntersectionObserver, loads 50 messages at a time)
  - Shiki for code syntax highlighting, react-markdown for text rendering
  - Tailwind CSS v4 (built separately via `@tailwindcss/cli`)
  - Dark mode, responsive layout, OpenGraph meta tags

### Build
Each package builds with `bun build`. The web package has three build steps:
1. Server bundle: `bun build ./src/server/index.ts --outdir ./dist/server --target bun`
2. Client bundle: `bun build ./src/client/index.tsx --outdir ./dist/public --minify`
3. CSS: `bunx @tailwindcss/cli -i ./src/client/style.css -o ./dist/public/style.css --minify`

## Key Technical Details

- **Package manager**: Bun (>=1.2). All scripts use `bun`, not `npm`/`yarn`
- **Linter/formatter**: Biome (no config file, uses defaults)
- **TypeScript**: Strict mode, `tsconfig.base.json` at root, each package extends it
- **Database**: SQLite with three tables: `sessions`, `messages`, `api_keys`. Messages stored with `content_json` (JSON stringified `ContentBlock[]`). Cascade deletes on sessions
- **API key generation**: `bun run packages/web/src/scripts/generate-api-key.ts` — hashes with SHA-256 before storing
- **JSONL parsing**: Tolerant of malformed lines (supports active/incomplete sessions). Control characters (0x00-0x1F) are stripped before JSON serialization
- **Docker**: Only the web server runs in Docker. MCP server always runs locally as a Claude Code subprocess. Data persisted via `./data` volume mount
