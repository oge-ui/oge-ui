/**
 * Pure size math behind a splitter: N panes laid out along one axis, separated
 * by N-1 draggable separators.
 *
 * Two units coexist, which is the whole reason this is not a one-liner. A pane
 * is either a **share** of the space left over after the fixed panes and the
 * separators (the `fr` case — sizes are ratios, so `[30, 30]` lays out exactly
 * like `[50, 50]`), or a **fixed** pixel size. Dragging a separator moves both
 * of its neighbours, which may be one of each; when a fixed pane grows, the
 * flexible space shrinks under every share pane at once, so the shares have to
 * be recomputed from pixels rather than nudged.
 *
 * Framework-free on purpose — the Angular component measures its host once per
 * gesture and hands the numbers here, which is also what makes the keyboard
 * path unit-testable without a layout engine.
 */

/** One pane track: a proportional `share` of the flexible space, or a `fixed` pixel size. */
export interface OgeSplitTrack {
  readonly kind: 'share' | 'fixed';
  /** Share points for `share` tracks, CSS pixels for `fixed` ones. */
  readonly value: number;
}

/** Resize bounds of one pane, expressed in that pane's own unit. */
export interface OgeSplitBounds {
  /** Smallest allowed size; `undefined` means `0`. */
  readonly min?: number;
  /** Largest allowed size; `undefined` means unbounded. */
  readonly max?: number;
  /** A pane a gesture may not resize. Defaults to `true`. */
  readonly resizable?: boolean;
}

/** The `aria-valuenow` / `aria-valuemin` / `aria-valuemax` triple of one separator. */
export interface OgeSplitSeparatorRange {
  /** Current size of the primary (preceding) pane, as a percentage of the pane area. */
  readonly now: number;
  /** Smallest percentage the primary pane can be dragged to. */
  readonly min: number;
  /** Largest percentage the primary pane can be dragged to. */
  readonly max: number;
}

/**
 * Rewrites the `share` tracks so they sum to 100, leaving `fixed` tracks alone.
 *
 * A share of `0` means "unsized": those panes split whatever the sized ones
 * leave up to 100, or an equal slice when the sized ones already claim it all.
 * Because the result is a ratio, a caller that passes sizes summing to 80 or
 * 120 gets a sensible layout instead of an error.
 */
export function normalizeSplitTracks(
  tracks: readonly OgeSplitTrack[],
): OgeSplitTrack[] {
  const shareCount = tracks.filter((track) => track.kind === 'share').length;
  if (shareCount === 0) return tracks.map((track) => ({ ...track }));

  const sized = tracks.filter(
    (track) => track.kind === 'share' && track.value > 0,
  );
  const sizedSum = sized.reduce((sum, track) => sum + track.value, 0);
  const autoCount = shareCount - sized.length;
  const remaining = 100 - sizedSum;
  const autoValue =
    autoCount === 0
      ? 0
      : remaining > 0
        ? remaining / autoCount
        : 100 / shareCount;

  const filled = tracks.map((track) =>
    track.kind === 'share' && track.value <= 0
      ? { kind: 'share' as const, value: autoValue }
      : { ...track },
  );
  const total = filled.reduce(
    (sum, track) => (track.kind === 'share' ? sum + track.value : sum),
    0,
  );
  if (total <= 0) {
    return filled.map((track) =>
      track.kind === 'share'
        ? { kind: 'share' as const, value: 100 / shareCount }
        : track,
    );
  }
  return filled.map((track) =>
    track.kind === 'share'
      ? { kind: 'share' as const, value: (track.value / total) * 100 }
      : track,
  );
}

/**
 * Pixel size of every track. `flexiblePx` is the space the share tracks divide
 * between them — the container minus the fixed panes and the separators.
 */
export function splitTrackPx(
  tracks: readonly OgeSplitTrack[],
  flexiblePx: number,
): number[] {
  return tracks.map((track) =>
    track.kind === 'fixed' ? track.value : (track.value / 100) * flexiblePx,
  );
}

/**
 * Moves the separator between `separatorIndex` and `separatorIndex + 1` by
 * `deltaPx`, clamped so neither neighbour leaves its bounds.
 *
 * Only those two panes move — the behaviour every reference splitter has. The
 * result is re-derived from pixels, so a fixed neighbour growing correctly
 * re-shares the shrinking flexible space among all the other share panes.
 * Returns the input unchanged when the move is impossible (locked pane, index
 * out of range, or no measurable space).
 */
export function resizeSplitAt(
  tracks: readonly OgeSplitTrack[],
  separatorIndex: number,
  deltaPx: number,
  flexiblePx: number,
  bounds: readonly OgeSplitBounds[],
): OgeSplitTrack[] {
  const a = separatorIndex;
  const b = separatorIndex + 1;
  const unchanged = (): OgeSplitTrack[] =>
    tracks.map((track) => ({ ...track }));
  if (a < 0 || b >= tracks.length) return unchanged();
  if (flexiblePx <= 0 && tracks.some((track) => track.kind === 'share')) {
    return unchanged();
  }
  if (
    bounds[a]?.resizable === false ||
    bounds[b]?.resizable === false ||
    deltaPx === 0
  ) {
    return unchanged();
  }

  const px = splitTrackPx(tracks, flexiblePx);
  const toPx = (
    value: number | undefined,
    index: number,
  ): number | undefined =>
    value === undefined
      ? undefined
      : tracks[index].kind === 'fixed'
        ? value
        : (value / 100) * flexiblePx;

  const aMin = toPx(bounds[a]?.min, a) ?? 0;
  const aMax = toPx(bounds[a]?.max, a) ?? Number.POSITIVE_INFINITY;
  const bMin = toPx(bounds[b]?.min, b) ?? 0;
  const bMax = toPx(bounds[b]?.max, b) ?? Number.POSITIVE_INFINITY;

  const lower = Math.max(aMin - px[a], px[b] - bMax);
  const upper = Math.min(aMax - px[a], px[b] - bMin);
  if (lower > upper) return unchanged();
  const delta = Math.min(Math.max(deltaPx, lower), upper);
  if (delta === 0) return unchanged();

  px[a] += delta;
  px[b] -= delta;

  const nextFlexiblePx = tracks.reduce(
    (sum, track, index) => (track.kind === 'share' ? sum + px[index] : sum),
    0,
  );
  return tracks.map((track, index) =>
    track.kind === 'fixed'
      ? { kind: 'fixed' as const, value: px[index] }
      : {
          kind: 'share' as const,
          value:
            nextFlexiblePx > 0
              ? (px[index] / nextFlexiblePx) * 100
              : track.value,
        },
  );
}

/**
 * The APG `separator` value triple for one separator, on a single 0–100 scale:
 * the primary (preceding) pane's size as a percentage of the total pane area,
 * and the range that pane can actually be dragged through.
 */
export function splitSeparatorRange(
  tracks: readonly OgeSplitTrack[],
  separatorIndex: number,
  flexiblePx: number,
  bounds: readonly OgeSplitBounds[],
): OgeSplitSeparatorRange {
  const a = separatorIndex;
  const b = separatorIndex + 1;
  const empty: OgeSplitSeparatorRange = { now: 0, min: 0, max: 100 };
  if (a < 0 || b >= tracks.length) return empty;

  const px = splitTrackPx(tracks, flexiblePx);
  const contentPx = px.reduce((sum, value) => sum + value, 0);
  if (contentPx <= 0) return empty;

  const toPx = (
    value: number | undefined,
    index: number,
  ): number | undefined =>
    value === undefined
      ? undefined
      : tracks[index].kind === 'fixed'
        ? value
        : (value / 100) * flexiblePx;

  const pair = px[a] + px[b];
  const aMin = toPx(bounds[a]?.min, a) ?? 0;
  const aMax = toPx(bounds[a]?.max, a) ?? Number.POSITIVE_INFINITY;
  const bMin = toPx(bounds[b]?.min, b) ?? 0;
  const bMax = toPx(bounds[b]?.max, b) ?? Number.POSITIVE_INFINITY;

  const lowPx = Math.max(aMin, pair - bMax);
  const highPx = Math.min(aMax, pair - bMin);
  const scale = 100 / contentPx;
  return {
    now: px[a] * scale,
    min: Math.max(0, lowPx) * scale,
    max: Math.min(contentPx, Math.max(lowPx, highPx)) * scale,
  };
}
