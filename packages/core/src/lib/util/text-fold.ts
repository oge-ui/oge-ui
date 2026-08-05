/**
 * Locale-independent case folding for search and filter matching.
 *
 * `toLocaleLowerCase()` depends on the host locale: under a Turkish runtime
 * 'İzmir' lowers to 'izmir', elsewhere to 'i̇zmir', so the same query
 * matches on one machine and not on another. Folding lowercases with the
 * invariant algorithm, then strips combining marks, which both pins the
 * behavior across platforms and makes matching accent-insensitive
 * ('e' matches 'é', 'izmir' matches 'İzmir').
 *
 * The folded string can be shorter than the input — use {@link foldTextWithMap}
 * when match positions must be projected back onto the original text.
 */
export function foldText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '');
}

export interface FoldedText {
  /** The folded string to run `indexOf`-style matching against. */
  folded: string;
  /** For each UTF-16 unit of `folded`, the index of the source character it came from. */
  sourceIndex: readonly number[];
}

/**
 * Folds `text` while recording, for every folded UTF-16 unit, the index of the
 * original character that produced it — so a match range found in the folded
 * string can be mapped back to a range in the original (e.g. for `<mark>`
 * highlighting).
 */
export function foldTextWithMap(text: string): FoldedText {
  let folded = '';
  const sourceIndex: number[] = [];
  let index = 0;
  for (const char of text) {
    const foldedChar = foldText(char);
    for (let unit = 0; unit < foldedChar.length; unit++) sourceIndex.push(index);
    folded += foldedChar;
    index += char.length;
  }
  return { folded, sourceIndex };
}
