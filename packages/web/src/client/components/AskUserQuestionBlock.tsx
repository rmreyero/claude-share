import type { ToolResultData } from "./ToolCallBlock.js";

interface QuestionOption {
	label: string;
	description: string;
}

interface Question {
	question: string;
	header: string;
	options: QuestionOption[];
	multiSelect: boolean;
}

interface Props {
	input: Record<string, unknown>;
	toolResult?: ToolResultData;
}

/**
 * Parse the result string to find selected answer(s).
 * Format: `User has answered your questions: "question"="answer". ...`
 * Or for multi-select or "Other": freeform text after `=`.
 */
function parseSelectedAnswers(resultContent: string): Set<string> {
	const selected = new Set<string>();
	// Match patterns like "question text"="answer text"
	const matches = resultContent.matchAll(/"[^"]*?"="([^"]*?)"/g);
	for (const m of matches) {
		selected.add(m[1]);
	}
	return selected;
}

function CheckIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			style={{ flexShrink: 0 }}
		>
			<circle cx="8" cy="8" r="8" fill="var(--accent-warm)" />
			<path
				d="M5 8.2L7 10.2L11 6.2"
				stroke="var(--bg-base)"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function EmptyCircle() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			style={{ flexShrink: 0 }}
		>
			<circle
				cx="8"
				cy="8"
				r="7"
				stroke="var(--border)"
				strokeWidth="1.5"
			/>
		</svg>
	);
}

export function AskUserQuestionBlock({ input, toolResult }: Props) {
	const questions = (input.questions ?? []) as Question[];
	const selectedAnswers = toolResult
		? parseSelectedAnswers(toolResult.content)
		: new Set<string>();

	if (questions.length === 0) return null;

	return (
		<div className="space-y-4">
			{questions.map((q, qi) => {
				// Check if user picked "Other" (answer not in any option label)
				const otherAnswer = [...selectedAnswers].find(
					(a) => !q.options.some((o) => o.label === a),
				);

				return (
					<div
						key={qi}
						className="ask-question-card rounded-xl overflow-hidden"
						style={{
							background: "var(--bg-surface)",
							border: "1px solid var(--border)",
						}}
					>
						{/* Question header */}
						<div
							className="px-5 py-4"
							style={{
								borderBottom: "1px solid var(--border-subtle)",
							}}
						>
							<div className="flex items-center gap-2.5 mb-2">
								<span
									className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full"
									style={{
										background: "var(--accent-warm-dim)",
										color: "var(--accent-warm)",
										letterSpacing: "0.06em",
									}}
								>
									{q.header}
								</span>
								{q.multiSelect && (
									<span
										className="text-xs"
										style={{ color: "var(--text-muted)" }}
									>
										multiple choice
									</span>
								)}
							</div>
							<p
								className="text-sm leading-relaxed mt-2"
								style={{ color: "var(--text-primary)" }}
							>
								{q.question}
							</p>
						</div>

						{/* Options */}
						<div className="px-4 py-3 space-y-2">
							{q.options.map((opt, oi) => {
								const isSelected = selectedAnswers.has(opt.label);
								return (
									<div
										key={oi}
										className="ask-option flex items-start gap-3 rounded-lg px-4 py-3 transition-colors"
										style={{
											background: isSelected
												? "var(--accent-warm-dim)"
												: "transparent",
											border: isSelected
												? "1px solid rgba(201, 149, 107, 0.25)"
												: "1px solid var(--border-subtle)",
										}}
									>
										<div className="mt-0.5">
											{isSelected ? <CheckIcon /> : <EmptyCircle />}
										</div>
										<div className="min-w-0 flex-1">
											<div
												className="text-sm font-medium"
												style={{
													color: isSelected
														? "var(--accent-warm)"
														: "var(--text-primary)",
												}}
											>
												{opt.label}
											</div>
											{opt.description && (
												<div
													className="text-xs mt-0.5 leading-relaxed"
													style={{
														color: isSelected
															? "var(--text-secondary)"
															: "var(--text-muted)",
													}}
												>
													{opt.description}
												</div>
											)}
										</div>
									</div>
								);
							})}

							{/* Show "Other" answer if user typed a custom response */}
							{otherAnswer && (
								<div
									className="ask-option flex items-start gap-3 rounded-lg px-4 py-3"
									style={{
										background: "var(--accent-warm-dim)",
										border: "1px solid rgba(201, 149, 107, 0.25)",
									}}
								>
									<div className="mt-0.5">
										<CheckIcon />
									</div>
									<div className="min-w-0 flex-1">
										<div
											className="text-sm font-medium"
											style={{ color: "var(--accent-warm)" }}
										>
											Other
										</div>
										<div
											className="text-xs mt-0.5 leading-relaxed font-mono"
											style={{ color: "var(--text-secondary)" }}
										>
											{otherAnswer}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
