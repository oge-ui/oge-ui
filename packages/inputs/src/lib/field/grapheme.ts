let segmenter: Intl.Segmenter | null | undefined;

function getSegmenter(): Intl.Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  segmenter =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  return segmenter;
}

/** Test hook — clears the cached segmenter instance. */
export function resetGraphemeSegmenter(): void {
  segmenter = undefined;
}

/**
 * Counts user-perceived characters (grapheme clusters) — `'👨‍👩‍👧'` counts as 1,
 * unlike `.length` (8) or code points (5). Falls back to code-point counting
 * on runtimes built without `Intl.Segmenter`.
 */
export function graphemeCount(text: string): number {
  if (!text) return 0;
  const seg = getSegmenter();
  if (!seg) return [...text].length;
  let count = 0;
  for (const _ of seg.segment(text)) count++;
  return count;
}
