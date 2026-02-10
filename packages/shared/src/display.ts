/**
 * Display-time text cleaning utilities.
 * Raw data is preserved in the database; these functions clean text only for rendering.
 */

const STRIP_PATTERNS = [
  /<system-reminder>[\s\S]*?<\/system-reminder>/g,
  /<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g,
  /<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g,
  /<antml_thinking>[\s\S]*?<\/antml_thinking>/g,
  /<user-memory-input>[\s\S]*?<\/user-memory-input>/g,
  /<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g,
  /<task-notification>[\s\S]*?<\/task-notification>/g,
  /<command-args>[\s\S]*?<\/command-args>/g,
  /<command-name>[^<]*<\/command-name>/g,
  /<command-message>[^<]*<\/command-message>/g,
  /\[Request interrupted by user(?:\s+for tool use)?\]/g,
];

/** Strip internal Claude Code XML tags from user message text for display. */
export function cleanUserText(text: string): string {
  const commandName = text.match(/<command-name>([^<]+)<\/command-name>/)?.[1];
  const commandMessage = text.match(
    /<command-message>([^<]*)<\/command-message>/,
  )?.[1];

  let result = text;
  for (const pattern of STRIP_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, "");
  }
  result = result.trim();

  if (commandName && !result) {
    result = `/${commandName}`;
    if (commandMessage && commandMessage !== commandName) {
      result += ` ${commandMessage}`;
    }
  }

  return result;
}
