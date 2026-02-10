import type {
	MessagesResponse,
	ParsedMessage,
	SessionDetailResponse,
	ToolResultBlock,
} from "@claude-share/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble.js";
import { SessionHeader } from "./SessionHeader.js";

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
		fetch(
			`${apiBase}/api/sessions/${shareId}/messages?offset=0&limit=${PAGE_SIZE}`,
		)
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
		fetch(
			`${apiBase}/api/sessions/${shareId}/messages?offset=${messages.length}&limit=${PAGE_SIZE}`,
		)
			.then((r) => r.json())
			.then((data: unknown) => {
				const res = data as MessagesResponse;
				setMessages((prev) => [...prev, ...res.messages]);
				setLoadingMore(false);
			})
			.catch(() => setLoadingMore(false));
	}, [messages.length, total, loadingMore, shareId, apiBase]);

	// Build tool_use_id → tool_result map for nesting results inside tool calls
	const { toolResultMap, toolUseIds } = useMemo(() => {
		const resultMap = new Map<string, ToolResultBlock>();
		const useIds = new Set<string>();
		for (const msg of messages) {
			for (const block of msg.content) {
				if (block.type === "tool_result") {
					resultMap.set(block.tool_use_id, block);
				} else if (block.type === "tool_use") {
					useIds.add(block.id);
				}
			}
		}
		return { toolResultMap: resultMap, toolUseIds: useIds };
	}, [messages]);

	// IntersectionObserver for infinite scroll
	useEffect(() => {
		const el = observerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore();
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [loadMore]);

	if (error) {
		return (
			<div
				className="min-h-screen flex items-center justify-center"
				style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
			>
				<div className="text-center animate-fade-up">
					<h1 className="font-display text-3xl mb-3" style={{ color: "#fff" }}>
						Session Not Found
					</h1>
					<p style={{ color: "var(--text-secondary)" }}>
						This session may have been deleted or the link is invalid.
					</p>
				</div>
			</div>
		);
	}

	if (loading || !session) {
		return (
			<div
				className="min-h-screen flex items-center justify-center"
				style={{ background: "var(--bg-base)" }}
			>
				<div
					className="flex items-center gap-3"
					style={{ color: "var(--text-muted)" }}
				>
					<div
						className="w-2 h-2 rounded-full animate-pulse"
						style={{ background: "var(--accent-warm)" }}
					/>
					Loading session...
				</div>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen"
			style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
		>
			<div className="max-w-5xl mx-auto px-6 py-10 lg:px-8">
				<SessionHeader session={session} />
				<div className="mt-8 space-y-5">
					{messages.map((msg) => (
						<MessageBubble
							key={msg.sequence}
							message={msg}
							toolResultMap={toolResultMap}
							toolUseIds={toolUseIds}
						/>
					))}
				</div>
				{messages.length < total && (
					<div
						ref={observerRef}
						className="py-10 text-center text-sm"
						style={{ color: "var(--text-muted)" }}
					>
						{loadingMore && (
							<span className="flex items-center justify-center gap-2">
								<span
									className="w-1.5 h-1.5 rounded-full animate-pulse"
									style={{ background: "var(--accent-warm)" }}
								/>
								Loading more messages...
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
