import type { RowNode } from '@oge-ui/core';
import {
  OgeGridKeyboardNavCore,
  type OgeGridKeyboardNavTreeHooks,
} from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Hierarchy hooks that add tree-grid keyboard semantics (expand/collapse on
 * the logical Right/Left arrows in the first column, per WAI-ARIA treegrid).
 * Row arguments are flat node indices.
 */
export type KeyboardNavTreeHooks = OgeGridKeyboardNavTreeHooks;

export interface KeyboardNavModelDeps<T> {
  flatNodes: () => readonly RowNode<T>[];
  /** Number of navigable columns. */
  columnCount: () => number;
  rtl: () => boolean;
  /** Rows a PageUp/PageDown jump covers. */
  pageSize: () => number;
  /** Present on tree hosts; absent on plain grids. */
  tree?: KeyboardNavTreeHooks;
}

/**
 * Excel-like cell navigation over the flat row list: roving tabindex,
 * arrow/Home/End/Page movement that skips non-data rows, RTL-aware
 * horizontal arrows, and optional treegrid expand/collapse semantics.
 * Hosted as a plain field by the component (slice pattern — no DI).
 *
 * Since ADR 0001's grid phase the machine itself is `@oge-ui/behavior`'s
 * `OgeGridKeyboardNavCore`, shared verbatim with the React grid; this class is
 * the Angular seam and hands it `signal()`/`computed()` as its reactivity.
 * A `Signal<T>` is already a `() => T`, so the deps object passes straight
 * through.
 */
export class KeyboardNavModel<T = unknown> extends OgeGridKeyboardNavCore<T> {
  constructor(deps: KeyboardNavModelDeps<T>) {
    super(deps, SIGNAL_ADAPTER);
  }
}
