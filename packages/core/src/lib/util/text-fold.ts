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

/** One run of a highlighted string: the text, and whether it matched. */
export interface SearchHighlightSegment {
  text: string;
  /** `true` for the runs a renderer wraps in `<mark class="oge-highlight">`. */
  match: boolean;
}

/**
 * Splits `text` into alternating plain and matched runs for every
 * fold-matched occurrence of `query`, or returns `null` when there is no
 * match. Matching is locale-independent and accent-insensitive
 * ({@link foldText}); match ranges are mapped back onto the original string,
 * surrogate-safe.
 *
 * Segments rather than markup on purpose. A renderer that receives an HTML
 * string has to be *trusted* with it — Angular needs `bypassSecurityTrustHtml`
 * and React `dangerouslySetInnerHTML` — and a codebase that bans those
 * outright (a reasonable rule, and one real integrations do have) cannot use
 * the component at all, however carefully the string was escaped. Handing back
 * text and letting each layer emit real text nodes and `<mark>` elements
 * removes the sink instead of arguing about it, and escaping stops being
 * something this function has to get right.
 */
export function buildSearchHighlightSegments(
  text: string,
  query: string,
): SearchHighlightSegment[] | null {
  const { folded, sourceIndex } = foldTextWithMap(text);
  const needle = foldText(query);
  if (!needle || !folded.includes(needle)) return null;
  const segments: SearchHighlightSegment[] = [];
  const push = (value: string, match: boolean) => {
    if (value) segments.push({ text: value, match });
  };
  let index = 0;
  let foldedFrom = 0;
  for (;;) {
    const found = folded.indexOf(needle, foldedFrom);
    if (found < 0) {
      push(text.slice(index), false);
      break;
    }
    const start = sourceIndex[found];
    const last = sourceIndex[found + needle.length - 1];
    // step past the last source char (2 units for astral-plane code points)
    const end = last + ((text.codePointAt(last) ?? 0) > 0xffff ? 2 : 1);
    push(text.slice(index, start), false);
    push(text.slice(start, end), true);
    index = end;
    foldedFrom = found + needle.length;
  }
  return segments;
}

/**
 * Escaped HTML for `text` with `<mark class="oge-highlight">` around every
 * fold-matched occurrence of `query`, or `null` when there is no match.
 *
 * @deprecated No component renders through this any more — they all use
 * {@link buildSearchHighlightSegments} and emit real elements, so none of them
 * needs a trusted-HTML API. Kept for hosts that were already calling it; if
 * you are one, prefer the segments and drop the `innerHTML` binding.
 */
export function buildSearchHighlightHtml(
  text: string,
  query: string,
): string | null {
  const segments = buildSearchHighlightSegments(text, query);
  if (!segments) return null;
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return segments
    .map((segment) =>
      segment.match
        ? `<mark class="oge-highlight">${escape(segment.text)}</mark>`
        : escape(segment.text),
    )
    .join('');
}
