import { parseStateJson } from '@oge-ui/core';

/**
 * Reads the JSON object out of a model reply.
 *
 * Models asked for JSON still wrap it in a Markdown fence or a sentence now and
 * then, so this takes the first fenced block when there is one, else the span
 * from the first `{` to its matching `}`. Parsing goes through core's
 * `parseStateJson`, so a prototype key at any depth rejects the reply the same
 * way it rejects a tampered state snapshot. `undefined` when no object is found.
 */
export function extractOgeAiJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const source = (fenced ? fenced[1] : text) ?? '';
  const start = source.indexOf('{');
  if (start < 0) return undefined;
  const end = matchingBrace(source, start);
  if (end < 0) return undefined;
  const value = parseStateJson(source.slice(start, end + 1));
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : undefined;
}

/** Index of the `}` closing the `{` at `start`, skipping string literals. */
function matchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  return -1;
}
