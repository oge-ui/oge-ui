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

/** Template context of a custom chip (`[tagTemplate]`); the remove button stays. */
export interface OgeTagBoxTagTemplateContext<TItem> {
  $implicit: TItem;
  /** Position of the chip's value in `value`. */
  index: number;
  /** The item's display text. */
  text: string;
}

/** Payload of `selectAllValueChanged` — the "select all" toggle was used. */
export interface OgeTagBoxSelectAllEvent {
  /** `true` selected every eligible item, `false` cleared them. */
  selected: boolean;
  event: Event;
}
