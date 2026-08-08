import type { CheckState, RowKey } from '@oge-ui/core';

/**
 * One rendered row: a `RowNode` from core's `flattenTreeData` resolved through
 * the component's accessors. Module-internal (not exported from the barrel).
 *
 * Loading placeholders for lazily fetched children come through as `filler`
 * rows, which carry no data and are skipped by keyboard navigation.
 */
export interface OgeTreeNode<T> {
  /** DOM-safe unique id of the row (the engine key, stringified). */
  readonly id: string;
  readonly key: RowKey;
  /** `true` for the loading placeholder under an expanded, unloaded parent. */
  readonly filler: boolean;
  /** `true` when this filler represents a failed `loadChildren`. */
  readonly failed: boolean;
  readonly item: T;
  readonly text: string;
  /** Depth, 0 for roots — rendered as `aria-level = level + 1`. */
  readonly level: number;
  readonly posInSet: number;
  readonly setSize: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
  /** `true` while this node's lazy children are being fetched. */
  readonly loading: boolean;
  readonly checkState: CheckState;
  readonly icon?: string;
  /** Display text with `<mark>` around search matches, `null` when unmatched. */
  readonly highlightedHtml: string | null;
}
