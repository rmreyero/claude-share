import { useEffect, useMemo, useState } from "react";
import { codeToHtml } from "shiki/bundle/web";
import { CodeBlock } from "./CodeBlock.js";

// ── Language detection ──────────────────────────────────

const EXT_MAP: Record<string, string> = {
	ts: "typescript",
	tsx: "tsx",
	js: "javascript",
	jsx: "jsx",
	mjs: "javascript",
	cjs: "javascript",
	py: "python",
	rs: "rust",
	go: "go",
	json: "json",
	jsonl: "json",
	md: "markdown",
	mdx: "markdown",
	css: "css",
	scss: "scss",
	html: "html",
	htm: "html",
	xml: "xml",
	svg: "xml",
	yml: "yaml",
	yaml: "yaml",
	toml: "toml",
	sh: "bash",
	bash: "bash",
	zsh: "bash",
	sql: "sql",
	rb: "ruby",
	java: "java",
	kt: "kotlin",
	swift: "swift",
	c: "c",
	cpp: "cpp",
	cc: "cpp",
	h: "c",
	hpp: "cpp",
	cs: "csharp",
	php: "php",
	lua: "lua",
	dockerfile: "dockerfile",
	makefile: "makefile",
	graphql: "graphql",
	prisma: "prisma",
	proto: "protobuf",
};

function langFromPath(filePath: string): string | undefined {
	const basename = (filePath.split("/").pop() ?? "").toLowerCase();
	if (basename === "makefile") return "makefile";
	if (basename === "dockerfile") return "dockerfile";
	const dot = basename.lastIndexOf(".");
	if (dot === -1 || dot === basename.length - 1) return undefined;
	return EXT_MAP[basename.slice(dot + 1)];
}

export function detectLanguage(
	toolName: string,
	input: Record<string, unknown>,
): string | undefined {
	const name = toolName.toLowerCase();
	if (
		name === "read" ||
		name === "edit" ||
		name === "write" ||
		name === "notebookedit"
	) {
		const fp = (input.file_path ??
			input.path ??
			input.notebook_path ??
			"") as string;
		if (fp) return langFromPath(fp);
	}
	return undefined;
}

// ── Diff rendering ──────────────────────────────────────

interface DiffLine {
	type: "add" | "remove" | "context";
	text: string;
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
	const oldLines = oldStr.split("\n");
	const newLines = newStr.split("\n");
	const lines: DiffLine[] = [];

	// Find common prefix
	let prefixLen = 0;
	while (
		prefixLen < oldLines.length &&
		prefixLen < newLines.length &&
		oldLines[prefixLen] === newLines[prefixLen]
	) {
		prefixLen++;
	}

	// Find common suffix (from the remaining lines after prefix)
	let suffixLen = 0;
	while (
		suffixLen < oldLines.length - prefixLen &&
		suffixLen < newLines.length - prefixLen &&
		oldLines[oldLines.length - 1 - suffixLen] ===
			newLines[newLines.length - 1 - suffixLen]
	) {
		suffixLen++;
	}

	// Context prefix
	for (let i = 0; i < prefixLen; i++) {
		lines.push({ type: "context", text: oldLines[i] });
	}
	// Removed lines
	for (let i = prefixLen; i < oldLines.length - suffixLen; i++) {
		lines.push({ type: "remove", text: oldLines[i] });
	}
	// Added lines
	for (let i = prefixLen; i < newLines.length - suffixLen; i++) {
		lines.push({ type: "add", text: newLines[i] });
	}
	// Context suffix
	for (let i = oldLines.length - suffixLen; i < oldLines.length; i++) {
		lines.push({ type: "context", text: oldLines[i] });
	}

	return lines;
}

function diffPrefixClass(type: DiffLine["type"]): string {
	return type === "add"
		? "diff-prefix-added"
		: type === "remove"
			? "diff-prefix-removed"
			: "diff-prefix-context";
}

function diffLineClass(type: DiffLine["type"]): string {
	return type === "add"
		? "diff-line-added"
		: type === "remove"
			? "diff-line-removed"
			: "diff-line-context";
}

function DiffView({
	filePath,
	oldStr,
	newStr,
}: { filePath: string; oldStr: string; newStr: string }) {
	const [html, setHtml] = useState<string | null>(null);
	const diffLines = useMemo(
		() => computeDiff(oldStr, newStr),
		[oldStr, newStr],
	);
	const lang = langFromPath(filePath);
	const combined = useMemo(
		() => diffLines.map((l) => l.text).join("\n"),
		[diffLines],
	);

	const added = diffLines.filter((l) => l.type === "add").length;
	const removed = diffLines.filter((l) => l.type === "remove").length;

	useEffect(() => {
		if (!lang) return;
		const decorations = diffLines.map((line, i) => ({
			start: { line: i, character: 0 },
			end: { line: i, character: line.text.length },
			properties: { class: diffLineClass(line.type) },
		}));

		codeToHtml(combined, { lang, theme: "vitesse-dark", decorations })
			.then(setHtml)
			.catch(() => setHtml(null));
	}, [combined, lang, diffLines]);

	const header = (
		<div
			className="flex items-center gap-3 px-4 py-2 text-xs"
			style={{
				borderBottom: "1px solid var(--border)",
				color: "var(--text-muted)",
			}}
		>
			<span className="font-mono" style={{ color: "var(--text-secondary)" }}>
				{filePath.split("/").pop()}
			</span>
			{added > 0 && (
				<span style={{ color: "rgba(109, 209, 130, 0.8)" }}>+{added}</span>
			)}
			{removed > 0 && (
				<span style={{ color: "rgba(209, 109, 109, 0.8)" }}>-{removed}</span>
			)}
		</div>
	);

	// Fallback: no Shiki, render plain diff
	if (!html) {
		return (
			<div>
				{header}
				<pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
					{diffLines.map((line, i) => (
						<div key={i} className={`flex ${diffLineClass(line.type)}`}>
							<span
								className={`select-none text-right shrink-0 pr-3 ${diffPrefixClass(line.type)}`}
								style={{
									width: "1.5rem",
									color: "var(--text-muted)",
									opacity: 0.5,
								}}
							>
								{line.type === "add"
									? "+"
									: line.type === "remove"
										? "-"
										: " "}
							</span>
							<span style={{ color: "var(--text-primary)" }}>
								{line.text || " "}
							</span>
						</div>
					))}
				</pre>
			</div>
		);
	}

	// Shiki-highlighted diff
	return (
		<div>
			{header}
			<div className="diff-view overflow-x-auto">
				<div className="flex">
					{/* Prefix column */}
					<div
						className="shrink-0 select-none font-mono text-xs leading-relaxed py-4 pl-2"
						style={{ color: "var(--text-muted)" }}
					>
						{diffLines.map((line, i) => (
							<div
								key={i}
								className={diffPrefixClass(line.type)}
								style={{
									paddingLeft: "0.375rem",
									paddingRight: "0.5rem",
									textAlign: "center",
								}}
							>
								{line.type === "add"
									? "+"
									: line.type === "remove"
										? "-"
										: " "}
							</div>
						))}
					</div>
					{/* Highlighted code */}
					<div
						className="p-4 pl-0 overflow-x-auto text-xs leading-relaxed shiki-wrapper flex-1 min-w-0"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				</div>
			</div>
		</div>
	);
}

// ── Tool summary for collapsed header ───────────────────

function toolSummary(
	name: string,
	input: Record<string, unknown>,
): string | null {
	const n = name.toLowerCase();
	if (n === "read" || n === "edit" || n === "write" || n === "notebookedit") {
		const fp = (input.file_path ??
			input.path ??
			input.notebook_path ??
			"") as string;
		if (fp) {
			const parts = fp.split("/");
			return parts.length > 2 ? `.../${parts.slice(-2).join("/")}` : fp;
		}
	}
	if (n === "bash") {
		const cmd = (input.command ?? "") as string;
		if (cmd) return cmd.length > 60 ? `${cmd.slice(0, 57)}...` : cmd;
	}
	if (n === "glob") {
		return (input.pattern ?? "") as string;
	}
	if (n === "grep") {
		return (input.pattern ?? "") as string;
	}
	return null;
}

// ── Main component ──────────────────────────────────────

export interface ToolResultData {
	content: string;
	isError: boolean;
	language?: string;
}

interface Props {
	name: string;
	input: Record<string, unknown>;
	toolResult?: ToolResultData;
}

export function ToolCallBlock({ name, input, toolResult }: Props) {
	const lowerName = name.toLowerCase();
	const isEdit = lowerName === "edit";
	const isWrite = lowerName === "write";
	const autoExpand = isEdit || isWrite;
	const [expanded, setExpanded] = useState(autoExpand);
	const summary = toolSummary(name, input);
	// For Edit/Write, non-error results are just "file updated" — not useful
	const showResult =
		toolResult && (toolResult.isError || (!isEdit && !isWrite));

	return (
		<div
			className="rounded-lg overflow-hidden"
			style={{
				background: "var(--tool-accent-dim)",
				border: "1px solid rgba(155, 142, 196, 0.15)",
			}}
		>
			{/* Header */}
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "rgba(155, 142, 196, 0.08)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "transparent";
				}}
			>
				<span
					className={`collapse-arrow text-xs ${expanded ? "expanded" : ""}`}
					style={{ color: "var(--tool-accent)" }}
				>
					&#9656;
				</span>
				<span
					className="font-mono text-xs font-medium px-2.5 py-0.5 rounded"
					style={{
						background: "rgba(155, 142, 196, 0.12)",
						color: "var(--tool-accent)",
					}}
				>
					{name}
				</span>
				{summary && (
					<span
						className="text-xs font-mono truncate"
						style={{ color: "var(--text-muted)" }}
					>
						{summary}
					</span>
				)}
				{toolResult?.isError && (
					<span
						className="text-xs px-2 py-0.5 rounded"
						style={{
							background: "var(--error-accent-dim)",
							color: "var(--error-accent)",
						}}
					>
						error
					</span>
				)}
			</button>

			{/* Expanded content */}
			{expanded && (
				<div style={{ borderTop: "1px solid rgba(155, 142, 196, 0.1)" }}>
					{/* Edit tool: diff view */}
					{isEdit && input.old_string != null && input.new_string != null ? (
						<div
							className="rounded-lg overflow-hidden mx-4 mt-3 mb-1"
							style={{
								background: "var(--code-bg)",
								border: "1px solid var(--border)",
							}}
						>
							<DiffView
								filePath={(input.file_path ?? "") as string}
								oldStr={input.old_string as string}
								newStr={input.new_string as string}
							/>
						</div>
					) : (
						/* Other tools: show input JSON */
						<div className="px-4 pt-3">
							<pre
								className="text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed"
								style={{ color: "var(--text-secondary)" }}
							>
								{JSON.stringify(input, null, 2)}
							</pre>
						</div>
					)}

					{/* Tool result (hidden for Edit/Write non-error) */}
					{showResult && (
						<div className="px-4 pt-2 pb-4">
							<div
								className="text-xs font-medium mb-2"
								style={{
									color: toolResult.isError
										? "var(--error-accent)"
										: "var(--text-muted)",
								}}
							>
								{toolResult.isError ? "Error" : "Result"}
							</div>
							{toolResult.isError ? (
								<pre
									className="text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed rounded-lg p-3"
									style={{
										color: "var(--error-accent)",
										background: "var(--error-accent-dim)",
										border: "1px solid rgba(209, 109, 109, 0.2)",
									}}
								>
									{toolResult.content}
								</pre>
							) : toolResult.language ? (
								<CodeBlock
									code={toolResult.content}
									language={toolResult.language}
								/>
							) : (
								<pre
									className="text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed rounded-lg p-3"
									style={{
										color: "var(--text-secondary)",
										background: "var(--bg-surface)",
										border: "1px solid var(--border-subtle)",
									}}
								>
									{toolResult.content}
								</pre>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
