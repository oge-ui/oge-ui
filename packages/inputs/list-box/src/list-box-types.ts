import type { OgeListBoxReorderCause } from '@oge-ui/behavior';

/** Payload of `selectionChanged` — the selection changed by any path. */
export interface OgeListBoxSelectionChangedEvent<TItem = unknown> {
  /** The new value (one value / `null`, or the array in multiple mode). */
  value: unknown;
  /** The value before the change. */
  previousValue: unknown;
  /** Items that became selected. */
  addedItems: TItem[];
  /** Items that stopped being selected. */
  removedItems: TItem[];
  /** The originating DOM event; `undefined` for programmatic changes. */
  event: Event | undefined;
}

/** Payload of `itemClick` — an enabled option was clicked. */
export interface OgeListBoxItemClickEvent<TItem = unknown> {
  item: TItem;
  /** Position among the visible (filtered) options. */
  index: number;
  event: MouseEvent;
}

/** Payload of the cancelable `reordering` — set `cancel` to keep the order. */
export interface OgeListBoxReorderingEvent<TItem = unknown> {
  /** The option that moves. */
  item: TItem;
  /** Its index in the whole `items` array before the move. */
  fromIndex: number;
  /** The index it lands at. */
  toIndex: number;
  /** `'keyboard'` (Alt+arrows), `'drag'` or `'api'` (`reorderItem()`). */
  cause: OgeListBoxReorderCause;
  /** The originating DOM event; `undefined` for programmatic moves. */
  event: Event | undefined;
  cancel: boolean;
}

/** Payload of `reordered` — persist `items` to keep the new order. */
export interface OgeListBoxReorderedEvent<TItem = unknown> {
  item: TItem;
  fromIndex: number;
  toIndex: number;
  cause: OgeListBoxReorderCause;
  /** Every item in the new order. */
  items: TItem[];
  event: Event | undefined;
}
