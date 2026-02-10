import { useState, useEffect, useCallback, useRef } from "react";
import type { SessionDetailResponse, MessagesResponse, ParsedMessage } from "@claude-share/shared";
import { SessionHeader } from "./SessionHeader.js";
import { MessageBubble } from "./MessageBubble.js";

const PAGE_SIZE = 50;

interface Props {
  shareId: string;
  apiBase: string;
}

export function SessionViewer({ shareId, apiBase }: Props) {
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  // Fetch session metadata
  useEffect(() => {
    fetch(`${apiBase}/api/sessions/${shareId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Session not found");
        return r.json();
      })
      .then((data) => setSession(data as SessionDetailResponse))
      .catch((err) => setError(err.message));
  }, [shareId, apiBase]);

  // Fetch initial messages
  useEffect(() => {
    fetch(`${apiBase}/api/sessions/${shareId}/messages?offset=0&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const res = data as MessagesResponse;
        setMessages(res.messages);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [shareId, apiBase]);

  // Infinite scroll — load more
  const loadMore = useCallback(() => {
    if (loadingMore || messages.length >= total) return;
    setLoadingMore(true);
    fetch(`${apiBase}/api/sessions/${shareId}/messages?offset=${messages.length}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const res = data as MessagesResponse;
        setMessages((prev) => [...prev, ...res.messages]);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [messages.length, total, loadingMore, shareId, apiBase]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
          <p className="text-neutral-400">This session may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-neutral-400">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SessionHeader session={session} />
        <div className="mt-6 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.sequence} message={msg} />
          ))}
        </div>
        {messages.length < total && (
          <div ref={observerRef} className="py-8 text-center text-neutral-500">
            {loadingMore ? "Loading more messages..." : ""}
          </div>
        )}
      </div>
    </div>
  );
}
