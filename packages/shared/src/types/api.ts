import type { ParsedMessage, SessionMetadata } from "./session.js";

/** POST /api/sessions — request body */
export interface CreateSessionRequest {
  shareId: string;
  metadata: SessionMetadata;
  messages: ParsedMessage[];
}

/** POST /api/sessions — response */
export interface CreateSessionResponse {
  shareId: string;
  url: string;
}

/** GET /api/sessions — response item */
export interface SessionListItem {
  shareId: string;
  title: string;
  projectName: string;
  branch?: string;
  model?: string;
  sessionDate: string;
  createdAt: string;
  messageCount: number;
  url: string;
}

/** GET /api/sessions/:shareId — response */
export interface SessionDetailResponse {
  shareId: string;
  title: string;
  projectName: string;
  branch?: string;
  model?: string;
  sessionDate: string;
  createdAt: string;
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

/** GET /api/sessions/:shareId/messages — response */
export interface MessagesResponse {
  messages: ParsedMessage[];
  total: number;
  offset: number;
  limit: number;
}

/** DELETE /api/sessions/:shareId — response */
export interface DeleteSessionResponse {
  deleted: boolean;
}

/** Common error response */
export interface ErrorResponse {
  error: string;
}
