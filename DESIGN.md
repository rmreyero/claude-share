# Claude Share Session — Design Document

## Overview

**claude-share-session** is a tool to share Claude Code sessions via a shareable URL. It consists of three packages in a Bun monorepo:

1. **MCP Server** — A Claude Code plugin that reads local sessions, sanitizes them, and uploads to the web server
2. **Web Server** — A Hono-based API + React viewer served from a single Bun process
3. **Shared** — Common types, parser, and sanitizer used by both packages

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

### Data Flow

```
Session .jsonl ──► Parser ──► Sanitizer ──► POST /api/sessions ──► SQLite
                                                                      │
Browser ◄── GET /s/:shareId ◄── React Viewer ◄── GET /api/messages ◄──┘
```

---

## Monorepo Structure

```
claude-share-session/
├── package.json                # Bun workspaces
├── tsconfig.base.json          # Strict TS config (shared)
├── bunfig.toml
├── docker-compose.yml
├── Dockerfile
├── Makefile
├── .env.example
├── README.md
└── packages/
    ├── shared/                 # Types + parser + sanitizer
    │   └── src/
    │       ├── types/session.ts
    │       ├── types/api.ts
    │       ├── parser.ts
    │       └── sanitizer.ts
    ├── mcp-server/             # MCP plugin for Claude Code
    │   └── src/
    │       ├── index.ts        # McpServer + StdioServerTransport
    │       └── tools/
    │           ├── share-session.ts
    │           ├── unshare-session.ts
    │           └── list-shared.ts
    └── web/                    # API server + viewer
        └── src/
            ├── server/
            │   ├── index.ts
            │   ├── routes/api.ts
            │   ├── routes/viewer.ts
            │   ├── db/schema.ts
            │   └── db/queries.ts
            ├── client/
            │   ├── index.tsx
            │   └── components/
            │       ├── SessionViewer.tsx
            │       ├── MessageBubble.tsx
            │       ├── ToolCallBlock.tsx
            │       ├── ThinkingBlock.tsx
            │       ├── CodeBlock.tsx
            │       └── SessionHeader.tsx
            └── public/
```

---

## Claude Code Session Format (JSONL)

Each line in a session `.jsonl` file has a `type` field:

| type | Content | Display? |
|------|---------|----------|
| `user` | User message or tool_result | Yes |
| `assistant` | Response with content blocks | Yes |
| `system` | Events: `turn_duration`, `compact_boundary` | No |
| `progress` | Tool progress updates | No |
| `file-history-snapshot` | File backups | No |

### Assistant Content Blocks

```typescript
// Text block
{ type: "text", text: "..." }

// Thinking block (extended thinking / reasoning)
{ type: "thinking", thinking: "..." }

// Tool use block
{ type: "tool_use", id: string, name: string, input: object }
```

### Tool Results (inside user messages)

```typescript
{
  type: "user",
  message: {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: string, content: string }
    ]
  }
}
```

---

## MCP Server — Tools

### 1. `share_session`

**Purpose**: Share the current Claude Code session via a URL.

**Flow**:
1. Read current session from `~/.claude/projects/.../<sessionId>.jsonl`
2. Parse with `shared/parser.ts` — filter non-displayable types, build conversation tree
3. Sanitize with `shared/sanitizer.ts` — clean paths, redact secrets, truncate large outputs
4. Generate `shareId` (nanoid, 12 chars)
5. `POST` to `SHARE_SERVER_URL/api/sessions` with parsed + sanitized data
6. Return `{ url: "https://host/s/<shareId>" }`

### 2. `unshare_session`

**Purpose**: Delete a previously shared session.

- Input: `shareId`
- `DELETE` to `SHARE_SERVER_URL/api/sessions/<shareId>`
- Confirms deletion

### 3. `list_shared`

**Purpose**: List all sessions shared by this user.

- `GET` to `SHARE_SERVER_URL/api/sessions`
- Returns list of shared sessions with URLs, dates, titles

### Claude Code Configuration

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "share-session": {
      "command": "bunx",
      "args": ["claude-share-session-mcp"],
      "env": {
        "SHARE_SERVER_URL": "http://localhost:3000",
        "SHARE_API_KEY": "sk-..."
      }
    }
  }
}
```

---

## Web Server — API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/sessions` | Upload session | API key |
| `GET` | `/api/sessions` | List shared sessions | API key |
| `GET` | `/api/sessions/:shareId` | Session metadata | Public |
| `GET` | `/api/sessions/:shareId/messages` | Paginated messages (`?offset&limit`) | Public |
| `DELETE` | `/api/sessions/:shareId` | Delete session | API key |
| `GET` | `/s/:shareId` | Viewer HTML | Public |
| `GET` | `/` | Landing page | Public |

### Authentication

API key sent via `Authorization: Bearer sk-...` header. Keys are hashed (SHA-256) and stored in the `api_keys` table.

---

## Database Schema (SQLite via bun:sqlite)

```sql
CREATE TABLE sessions (
    share_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project_name TEXT NOT NULL,
    branch TEXT,
    model TEXT,
    session_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    message_count INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_id TEXT NOT NULL REFERENCES sessions(share_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    type TEXT NOT NULL,          -- 'user' | 'assistant'
    role TEXT,
    content_json TEXT NOT NULL,  -- JSON stringified content blocks
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    timestamp TEXT,
    has_thinking INTEGER DEFAULT 0,
    has_tool_use INTEGER DEFAULT 0,
    UNIQUE(share_id, sequence)
);

CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1
);
```

---

## Sanitization Pipeline

Before uploading, sessions go through these sanitization steps:

### 1. Path Cleaning
- `/Users/<username>/...` → `~/...`
- Absolute project paths → `./`

### 2. Secret Redaction
Detect and redact patterns:
- `sk-*` (API keys)
- `ghp_*` (GitHub tokens)
- `xoxb-*` (Slack tokens)
- Environment variables containing `KEY`, `TOKEN`, `SECRET`, `PASSWORD`

### 3. Type Filtering
Remove non-displayable line types:
- `progress`
- `file-history-snapshot`
- `queue-operation`

### 4. Output Truncation
Tool results exceeding 10KB:
- Keep first 500 chars + last 500 chars
- Insert `[truncated: X bytes removed]` marker

---

## Viewer — React Components

### Component Hierarchy

```
SessionViewer
├── SessionHeader          # Title, date, branch, model, token stats
├── MessageList
│   ├── MessageBubble      # User (right, blue) / Assistant (left, gray)
│   │   ├── ThinkingBlock  # Collapsible, amber border
│   │   ├── CodeBlock      # Shiki syntax highlighting, copy button, line numbers
│   │   └── ToolCallBlock  # Collapsible, tool name badge, input/output
│   └── ... (more messages)
└── InfiniteScrollLoader   # Loads 50 messages initially, fetches more on scroll
```

### Styling
- Tailwind CSS v4
- Dark/light mode support
- Responsive layout
- OpenGraph meta tags for Slack/Teams link previews

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server SDK |
| `zod` | Schema validation |
| `hono` | Web framework (Bun-native) |
| `bun:sqlite` | Database (Bun built-in) |
| `nanoid` | Share link ID generation |
| `react` + `react-dom` | Viewer UI |
| `shiki` | Code syntax highlighting |
| `react-markdown` + `remark-gfm` | Markdown rendering |
| `tailwindcss` v4 | Styling |

---

## Docker Deployment

```dockerfile
FROM oven/bun:1.2 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1.2-slim
WORKDIR /app
COPY --from=build /app/packages/web/dist ./dist
VOLUME /app/data
ENV DATABASE_PATH=/app/data/sessions.db
EXPOSE 3000
CMD ["bun", "run", "./dist/server/index.js"]
```

**Note**: Only the web server runs in Docker. The MCP server runs locally as a Claude Code subprocess.

### docker-compose.yml

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    restart: unless-stopped
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Web server port | `3000` |
| `DATABASE_PATH` | SQLite file path | `./data/sessions.db` |
| `SHARE_SERVER_URL` | URL of the web server (used by MCP) | `http://localhost:3000` |
| `SHARE_API_KEY` | API key for MCP → Web auth | _(generated via `make generate-api-key`)_ |
| `SESSION_EXPIRY_DAYS` | Auto-expire sessions after N days | `30` |

---

## Implementation Order

### Phase 1: Scaffold
- Root `package.json` with Bun workspaces
- `tsconfig.base.json` (strict mode)
- `bunfig.toml`
- `.env.example`
- `Makefile` + `README.md`

### Phase 2: `packages/shared`
- TypeScript types mapping the JSONL format
- API request/response types
- JSONL parser (read, filter, build conversation)
- Sanitizer (paths, secrets, truncation)

### Phase 3: `packages/mcp-server`
- MCP server with StdioServerTransport
- `share_session` tool
- `unshare_session` tool
- `list_shared` tool

### Phase 4: `packages/web` — API
- SQLite schema + migrations
- Prepared queries
- REST endpoints (Hono)
- API key middleware

### Phase 5: `packages/web` — Viewer
- React components (SessionViewer, MessageBubble, ToolCallBlock, ThinkingBlock, CodeBlock)
- Tailwind v4 styling
- Pagination with infinite scroll
- OpenGraph meta tags

### Phase 6: Docker + Integration
- Dockerfile + docker-compose.yml
- End-to-end test: Claude Code → MCP → Web Server → Browser
- API key generation script

---

## Verification Checklist

- [ ] `make help` shows all available commands
- [ ] `make setup` initializes the project from scratch
- [ ] `make dev-all` starts both servers
- [ ] MCP tools work in Claude Code
- [ ] Sessions render correctly in the viewer
- [ ] Sanitizer catches paths and secrets
- [ ] Docker build and deploy works
- [ ] Shared links work (OpenGraph previews)
- [ ] README renders correctly on GitHub
