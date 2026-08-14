import type { CheckState, RowKey } from '@oge-ui/core';

// The tree-view vocabulary and event payloads live framework-free in
// `@oge-ui/behavior` (`tree-view-core`), shared with the React render layer;
// re-exported here so existing imports keep working. Only the Angular
// template contexts stay local — `$implicit` has no meaning elsewhere.
export type {
  CheckState,
  RowKey,
  TreeFilterMode,
  OgeTreeDataStructure,
  OgeTreeSelectionMode,
  OgeTreeCheckBoxesMode,
  OgeTreeExpandEvent,
  OgeTreeSearchMode,
  OgeTreeSelectedKeysMode,
  OgeTreeDropPosition,
  OgeTreeSize,
  OgeTreeExpr,
  OgeTreeVirtualScrollOptions,
  OgeTreeLoadChildren,
  OgeTreeExpandingEvent,
  OgeTreeCollapsingEvent,
  OgeTreeExpandedEvent,
  OgeTreeCollapsedEvent,
  OgeTreeSelectionChangingEvent,
  OgeTreeSelectionChangedEvent,
  OgeTreeItemSelectionChangedEvent,
  OgeTreeItemClickEvent,
  OgeTreeChildrenLoadedEvent,
  OgeTreeChildrenFailedEvent,
  OgeTreeSelectAllChangedEvent,
  OgeTreeReorderingEvent,
  OgeTreeReorderedEvent,
} from '@oge-ui/behavior';

/** Context of `[ogeTreeItemTemplate]`. */
export interface OgeTreeItemTemplateContext<T = unknown> {
  $implicit: T;
  key: RowKey;
  level: number;
  expanded: boolean;
  selected: boolean;
  checkState: CheckState;
  hasChildren: boolean;
  /** Display text with `<mark>` around search matches, or `null` when not matched. */
  highlightedHtml: string | null;
}

/** Context of `[ogeTreeExpandIconTemplate]`. */
export interface OgeTreeExpandIconTemplateContext<T = unknown> {
  $implicit: boolean;
  item: T;
  key: RowKey;
  /** `true` while this node's lazy children are loading. */
  loading: boolean;
}
