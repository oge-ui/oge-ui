import { foldText } from './text-fold';

/** Accumulates printable keystrokes into a search prefix that expires when idle. */
export interface OgeTypeAheadBuffer {
  /** Appends `char` and returns the prefix to search for. */
  push(char: string, now?: number): string;
  /** Current prefix without appending anything. */
  value(): string;
  /** Drops the accumulated prefix (e.g. on blur). */
  clear(): void;
}

/**
 * Creates a type-ahead buffer: consecutive keystrokes within `timeoutMs`
 * accumulate into a prefix, and a longer pause starts a new search.
 *
 * Repeating the *same* character restarts a single-letter search instead of
 * accumulating, which is what lets `s`-`s`-`s` cycle through the entries
 * starting with `s` — the WAI-ARIA APG type-ahead convention.
 */
export function createTypeAheadBuffer(timeoutMs = 500): OgeTypeAheadBuffer {
  let buffer = '';
  let last = Number.NEGATIVE_INFINITY;
  return {
    push(char, now = Date.now()) {
      if (now - last > timeoutMs) buffer = '';
      last = now;
      // same key repeated → cycle over single-letter matches
      buffer =
        buffer && buffer.split('').every((c) => c === char)
          ? char
          : buffer + char;
      return buffer;
    },
    value: () => buffer,
    clear() {
      buffer = '';
      last = Number.NEGATIVE_INFINITY;
    },
  };
}

/**
 * Index of the first entry whose label starts with `prefix`, searching from
 * `start + 1` and wrapping. Matching is locale-independent and
 * accent-insensitive ({@link foldText}), so `o` matches `Ödeme` on every host.
 * Disabled entries are skipped; `null` when nothing matches.
 */
export function matchByPrefix(
  labels: readonly string[],
  prefix: string,
  start = -1,
  isDisabled: (index: number) => boolean = () => false,
): number | null {
  const needle = foldText(prefix);
  if (!needle) return null;
  const count = labels.length;
  for (let offset = 1; offset <= count; offset++) {
    const index = (start + offset + count) % count;
    if (isDisabled(index)) continue;
    if (foldText(labels[index] ?? '').startsWith(needle)) return index;
  }
  return null;
}
