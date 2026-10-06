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
