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
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '');
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
    for (let unit = 0; unit < foldedChar.length; unit++)
      sourceIndex.push(index);
    folded += foldedChar;
    index += char.length;
  }
  return { folded, sourceIndex };
}

/**
 * Escaped HTML for `text` with `<mark class="oge-highlight">` around every
 * fold-matched occurrence of `query`, or `null` when there is no match.
 * Matching is locale-independent and accent-insensitive ({@link foldText});
 * match ranges are mapped back onto the original string, surrogate-safe.
 * The result is plain markup — sanitize/trust it at the rendering layer.
 */
export function buildSearchHighlightHtml(
  text: string,
  query: string,
): string | null {
  const { folded, sourceIndex } = foldTextWithMap(text);
  const needle = foldText(query);
  if (!needle || !folded.includes(needle)) return null;
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = '';
  let index = 0;
  let foldedFrom = 0;
  for (;;) {
    const found = folded.indexOf(needle, foldedFrom);
    if (found < 0) {
      html += escape(text.slice(index));
      break;
    }
    const start = sourceIndex[found];
    const last = sourceIndex[found + needle.length - 1];
    // step past the last source char (2 units for astral-plane code points)
    const end = last + ((text.codePointAt(last) ?? 0) > 0xffff ? 2 : 1);
    html += escape(text.slice(index, start));
    html += `<mark class="oge-highlight">${escape(text.slice(start, end))}</mark>`;
    index = end;
    foldedFrom = found + needle.length;
  }
  return html;
}
