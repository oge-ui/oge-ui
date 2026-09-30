/** Payload of the tag box's `selectionChanged` — the per-commit delta. */
export interface OgeTagBoxSelectionChangedEvent<TItem> {
  addedItems: readonly TItem[];
  removedItems: readonly TItem[];
}

/** Payload of `itemClick` — `index` is within the currently visible list. */
export interface OgeTagBoxItemClickEvent<TItem> {
  item: TItem;
  index: number;
  event: Event;
}
