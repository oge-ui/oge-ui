import type { CheckState, RowKey, TreeFilterMode } from '@oge-ui/core';

export type { CheckState, RowKey, TreeFilterMode };

/** Shape of the bound data: a flat parent-referencing list or nested children. */
export type OgeTreeDataStructure = 'plain' | 'tree';

/** How nodes may be selected. */
export type OgeTreeSelectionMode = 'none' | 'single' | 'multiple';

/** Checkbox column: hidden, per node, or per node plus a "select all" row. */
export type OgeTreeCheckBoxesMode = 'none' | 'normal' | 'selectAll';

/** Which gesture expands a node. */
export type OgeTreeExpandEvent = 'click' | 'dblclick';

/** How the search text is compared against a node's display value. */
export type OgeTreeSearchMode = 'contains' | 'startsWith' | 'equals';

/** Projection applied when reporting `selectedKeys` outward. */
export type OgeTreeSelectedKeysMode = 'all' | 'leavesOnly' | 'excludeRecursive';

/** Where a dragged node lands relative to the drop target. */
export type OgeTreeDropPosition = 'inside' | 'before' | 'after';

/** Density of the node rows. */
export type OgeTreeSize = 'sm' | 'md' | 'lg';

/**
 * Field accessor: a property name or a function. Property names go through
 * core's `createFieldAccessor`, so dotted paths work.
 */
export type OgeTreeExpr<T, R = unknown> = string | ((row: T) => R);

/** Virtual scrolling: `true` for the default row height, or an explicit one. */
export interface OgeTreeVirtualScrollOptions {
  /** Row height in pixels — every row must actually be this tall. */
  itemHeight: number;
}

/** Loads a node's children the first time it expands. */
export type OgeTreeLoadChildren<T> = (
  parent: T,
  key: RowKey,
) => Promise<readonly T[]>;

/** Cancelable pre-event of a node expanding. */
export interface OgeTreeExpandingEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
  /** Set to `true` to block the expand. */
  cancel: boolean;
}

/** Cancelable pre-event of a node collapsing. */
export interface OgeTreeCollapsingEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
  /** Set to `true` to block the collapse. */
  cancel: boolean;
}

/** Emitted after a node expanded. */
export interface OgeTreeExpandedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
}

/** Emitted after a node collapsed. */
export interface OgeTreeCollapsedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event?: Event;
}

/** Cancelable pre-event of a selection change. */
export interface OgeTreeSelectionChangingEvent<T = unknown> {
  /** Keys the selection would become. */
  readonly keys: readonly RowKey[];
  /** The node that triggered the change — absent for select-all. */
  readonly key?: RowKey;
  readonly item?: T;
  readonly event?: Event;
  /** Set to `true` to block the change. */
  cancel: boolean;
}

/** Emitted after the selection committed. */
export interface OgeTreeSelectionChangedEvent<T = unknown> {
  /** Selected keys under the component's `selectedKeysMode` projection. */
  readonly keys: readonly RowKey[];
  readonly previousKeys: readonly RowKey[];
  readonly key?: RowKey;
  readonly item?: T;
  readonly event?: Event;
}

/** Emitted for the single node whose own selected state flipped. */
export interface OgeTreeItemSelectionChangedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly selected: boolean;
  readonly event?: Event;
}

/** Emitted when a node row is activated. */
export interface OgeTreeItemClickEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly event: Event;
}

/** Emitted after a lazy `loadChildren` resolved. */
export interface OgeTreeChildrenLoadedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly children: readonly T[];
}

/** Emitted after a lazy `loadChildren` rejected. */
export interface OgeTreeChildrenFailedEvent<T = unknown> {
  readonly key: RowKey;
  readonly item: T;
  readonly error: unknown;
}

/** Emitted when the "select all" row is toggled. */
export interface OgeTreeSelectAllChangedEvent {
  readonly state: CheckState;
}

/** Cancelable pre-event of a drag & drop reparent. */
export interface OgeTreeReorderingEvent<T = unknown> {
  readonly dragKey: RowKey;
  readonly dragItem: T;
  readonly dropKey: RowKey;
  readonly dropItem: T;
  readonly position: OgeTreeDropPosition;
  /** Set to `true` to block the drop. */
  cancel: boolean;
}

/**
 * Emitted after a drop passed `itemReordering`. The tree does not mutate the
 * data — apply the move to your own array, exactly like tree-list's
 * `rowReparented`.
 */
export interface OgeTreeReorderedEvent<T = unknown> {
  readonly dragKey: RowKey;
  readonly dragItem: T;
  readonly dropKey: RowKey;
  readonly dropItem: T;
  readonly position: OgeTreeDropPosition;
}

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
