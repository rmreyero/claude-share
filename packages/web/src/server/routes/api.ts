import { Hono } from "hono";
import type { createQueries } from "../db/queries.js";
import { hashKey } from "../utils/hash.js";

type Queries = ReturnType<typeof createQueries>;

/** Create API key auth middleware */
function requireAuth(queries: Queries) {
  return async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const key = authHeader.slice(7);
    const keyHash = hashKey(key);

    if (!(await queries.validateApiKey(keyHash))) {
      return c.json({ error: "Invalid API key" }, 403);
    }

    await next();
  };
}

export function createApiRoutes(queries: Queries, baseUrl: string) {
  const api = new Hono();
  const auth = requireAuth(queries);

  // POST /api/sessions — Upload a session
  api.post("/sessions", auth, async (c) => {
    const body = await c.req.json();
    const { shareId, metadata, messages } = body;

    if (!shareId || !metadata || !messages) {
      return c.json({ error: "Missing required fields: shareId, metadata, messages" }, 400);
    }

    try {
      await queries.createSession(shareId, metadata, messages);
      return c.json({
        shareId,
        url: `${baseUrl}/s/${shareId}`,
      }, 201);
    } catch (error) {
      return c.json({ error: `Failed to create session: ${error}` }, 500);
    }
  });

  // GET /api/sessions — List all sessions
  api.get("/sessions", auth, async (c) => {
    const sessions = await queries.listSessions();
    return c.json(
      sessions.map((s) => ({
        shareId: s.share_id,
        title: s.title,
        projectName: s.project_name,
        userName: s.user_name,
        branch: s.branch,
        model: s.model,
        sessionDate: s.session_date,
        createdAt: s.created_at,
        messageCount: s.message_count,
        url: `${baseUrl}/s/${s.share_id}`,
      }))
    );
  });

  // GET /api/sessions/:shareId — Session metadata (public)
  api.get("/sessions/:shareId", async (c) => {
    const shareId = c.req.param("shareId");
    const session = await queries.getSession(shareId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json({
      shareId: session.share_id,
      title: session.title,
      projectName: session.project_name,
      userName: session.user_name,
      branch: session.branch,
      model: session.model,
      sessionDate: session.session_date,
      createdAt: session.created_at,
      messageCount: session.message_count,
      totalInputTokens: session.total_input_tokens,
      totalOutputTokens: session.total_output_tokens,
    });
  });

  // GET /api/sessions/:shareId/messages — Paginated messages (public)
  api.get("/sessions/:shareId/messages", async (c) => {
    const shareId = c.req.param("shareId");
    const offset = Number(c.req.query("offset") ?? "0");
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 100);

    const session = await queries.getSession(shareId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const rows = await queries.getMessages(shareId, limit, offset);
    const total = await queries.countMessages(shareId);

    const messages = rows.map((row) => ({
      sequence: row.sequence,
      type: row.type,
      role: row.role,
      content: JSON.parse(row.content_json as string),
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      timestamp: row.timestamp,
      hasThinking: row.has_thinking === 1,
      hasToolUse: row.has_tool_use === 1,
    }));

    return c.json({ messages, total, offset, limit });
  });

  // DELETE /api/sessions/:shareId — Delete session
  api.delete("/sessions/:shareId", auth, async (c) => {
    const shareId = c.req.param("shareId");
    const deleted = await queries.deleteSession(shareId);
    return c.json({ deleted });
  });

  return api;
}
