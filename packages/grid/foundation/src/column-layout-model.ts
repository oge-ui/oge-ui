import { OgeGridColumnLayoutCore } from '@oge-ui/behavior';
import type { ColumnSource, ResolvedColumn } from './column-model';
import { SIGNAL_ADAPTER } from './signal-adapter';

export interface ColumnLayoutModelDeps<
  T,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  resolvedColumns: () => readonly ResolvedColumn<T, S>[];
  /** Whether horizontal (column) virtualization is active — the host decides. */
  colVirtualized: () => boolean;
  scrollLeft: () => number;
  hostWidth: () => number;
  /** CSS tracks of the leading utility cells (drag / expander / checkbox). */
  leadingTracks: () => readonly string[];
  /** CSS tracks of the trailing utility cells (command column). */
  trailingTracks: () => readonly string[];
  /** Total width in px of the leading utility cells. */
  leadingWidth: () => number;
  /** Fallback minimum track width for flexible columns. */
  defaultMinWidth: () => number;
  /** Track width for pinned columns without a numeric width. */
  pinnedDefaultWidth: () => number;
}

/**
 * Horizontal layout of a grid-like component: the CSS grid track list,
 * sticky pinned-column offsets and the optional column-virtualization
 * window over the resolved columns. Hosted as a plain field by the
 * component (slice pattern — no DI).
 *
 * Since ADR 0001's grid phase the arithmetic is `@oge-ui/behavior`'s
 * `OgeGridColumnLayoutCore`, shared verbatim with the React grid; this class
 * is the Angular seam and hands it `computed()` as its reactivity. The core's
 * column contract is a four-field structural minimum, so `ResolvedColumn` —
 * `TemplateRef`s and all — passes straight through.
 */
export class ColumnLayoutModel<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> extends OgeGridColumnLayoutCore<ResolvedColumn<T, S>> {
  constructor(deps: ColumnLayoutModelDeps<T, S>) {
    super(deps, SIGNAL_ADAPTER);
  }
}
