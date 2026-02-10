import type {
	ContentBlock,
	ParsedMessage,
	ToolResultBlock,
} from "@claude-share/shared";
import { cleanUserText } from "@claude-share/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AskUserQuestionBlock } from "./AskUserQuestionBlock.js";
import { CodeBlock } from "./CodeBlock.js";
import { ThinkingBlock } from "./ThinkingBlock.js";
import { ToolCallBlock, detectLanguage } from "./ToolCallBlock.js";
import type { ToolResultData } from "./ToolCallBlock.js";

interface Props {
	message: ParsedMessage;
	toolResultMap: Map<string, ToolResultBlock>;
	toolUseIds: Set<string>;
}

function renderTextContent(text: string) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				pre({ children }) {
					return <>{children}</>;
				},
				code({ className, children, ...props }) {
					const match = /language-(\w+)/.exec(className || "");
					const code = String(children).replace(/\n$/, "");
					const isInline = !className && !code.includes("\n");
					if (!isInline) {
						return <CodeBlock code={code} language={match?.[1]} />;
					}
					return (
						<code
							className="px-1.5 py-0.5 rounded text-sm font-mono"
							style={{
								background: "var(--bg-elevated)",
								color: "var(--accent-warm)",
							}}
							{...props}
						>
							{children}
						</code>
					);
				},
				a({ href, children }) {
					return (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							style={{
								color: "var(--user-accent)",
								textDecoration: "underline",
							}}
						>
							{children}
						</a>
					);
				},
			}}
		>
			{text}
		</ReactMarkdown>
	);
}

function extractResultContent(block: ToolResultBlock): string {
	return typeof block.content === "string"
		? block.content
		: block.content.map((c) => c.text ?? "").join("\n");
}

function renderBlock(
	block: ContentBlock,
	index: number,
	isUser: boolean,
	toolResultMap: Map<string, ToolResultBlock>,
	toolUseIds: Set<string>,
) {
	switch (block.type) {
		case "text": {
			const displayText = isUser
				? cleanUserText(block.text)
				: block.text.trim();
			if (!displayText) return null;
			return <div key={index}>{renderTextContent(displayText)}</div>;
		}
		case "thinking":
			return <ThinkingBlock key={index} content={block.thinking} />;
		case "tool_use": {
			const result = toolResultMap.get(block.id);
			let toolResult: ToolResultData | undefined;
			if (result) {
				toolResult = {
					content: extractResultContent(result),
					isError: result.is_error ?? false,
					language: detectLanguage(block.name, block.input),
				};
			}
			// Dedicated renderer for AskUserQuestion
			if (block.name === "AskUserQuestion") {
				return (
					<AskUserQuestionBlock
						key={index}
						input={block.input}
						toolResult={toolResult}
					/>
				);
			}
			return (
				<ToolCallBlock
					key={index}
					name={block.name}
					input={block.input}
					toolResult={toolResult}
				/>
			);
		}
		case "tool_result": {
			// If paired with a tool_use, it's nested inside the tool call — skip standalone render
			if (toolUseIds.has(block.tool_use_id)) {
				return null;
			}
			// Orphaned result: render standalone
			const content = extractResultContent(block);
			const isError = block.is_error;
			return (
				<div
					key={index}
					className="text-sm rounded-lg overflow-hidden"
					style={{
						background: isError
							? "var(--error-accent-dim)"
							: "var(--bg-surface)",
						border: `1px solid ${isError ? "rgba(209, 109, 109, 0.2)" : "var(--border-subtle)"}`,
					}}
				>
					<div
						className="px-4 py-2 text-xs font-medium"
						style={{
							color: isError ? "var(--error-accent)" : "var(--text-muted)",
							borderBottom: `1px solid ${isError ? "rgba(209, 109, 109, 0.12)" : "var(--border-subtle)"}`,
							background: isError
								? "rgba(209, 109, 109, 0.05)"
								: "var(--bg-elevated)",
						}}
					>
						{isError ? "Error Result" : "Tool Result"}
					</div>
					<pre
						className="whitespace-pre-wrap overflow-x-auto font-mono text-sm px-4 py-3"
						style={{ color: "var(--text-secondary)" }}
					>
						{content}
					</pre>
				</div>
			);
		}
		default:
			return null;
	}
}

/** Check if a user message has any visible text (not just tool_results). */
function hasUserText(message: ParsedMessage): boolean {
	for (const block of message.content) {
		if (block.type === "text") {
			if (cleanUserText(block.text)) return true;
		}
	}
	return false;
}

/** Check if a message has any visible content at all. */
function hasVisibleContent(
	message: ParsedMessage,
	toolUseIds: Set<string>,
): boolean {
	const isUser = message.type === "user";
	for (const block of message.content) {
		switch (block.type) {
			case "text": {
				const text = isUser ? cleanUserText(block.text) : block.text.trim();
				if (text) return true;
				break;
			}
			case "thinking":
			case "tool_use":
				return true;
			case "tool_result":
				// Only visible if NOT paired with a tool_use (orphaned result)
				if (!toolUseIds.has(block.tool_use_id)) return true;
				break;
		}
	}
	return false;
}

export function MessageBubble({ message, toolResultMap, toolUseIds }: Props) {
	const isUser = message.type === "user";

	if (!hasVisibleContent(message, toolUseIds)) return null;

	// User messages with only tool_result blocks (no user text) — render
	// just the tool results without the "User" card wrapper.
	if (isUser && !hasUserText(message)) {
		return (
			<div className="space-y-3">
				{message.content.map((block, i) =>
					renderBlock(block, i, isUser, toolResultMap, toolUseIds),
				)}
			</div>
		);
	}

	return (
		<div
			className="message-card rounded-xl px-6 py-5"
			style={{
				borderLeft: isUser
					? "3px solid var(--user-accent)"
					: "3px solid transparent",
				background: isUser ? "var(--user-accent-dim)" : "transparent",
			}}
		>
			{/* Role label */}
			<div className="flex items-center gap-2.5 mb-3">
				<span
					className="text-xs font-semibold uppercase tracking-wider"
					style={{
						color: isUser ? "var(--user-accent)" : "var(--accent-warm)",
					}}
				>
					{isUser ? "User" : "Claudio"}
				</span>
				{message.model && !isUser && (
					<span
						className="text-xs font-mono px-2 py-0.5 rounded"
						style={{
							color: "var(--text-muted)",
							background: "var(--bg-elevated)",
						}}
					>
						{message.model}
					</span>
				)}
			</div>

			{/* Content blocks */}
			<div className="space-y-3">
				{message.content.map((block, i) =>
					renderBlock(block, i, isUser, toolResultMap, toolUseIds),
				)}
			</div>
		</div>
	);
}
