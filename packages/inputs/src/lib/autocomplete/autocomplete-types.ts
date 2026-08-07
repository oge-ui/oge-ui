/** Fired when the autocomplete's resolved item selection changes. */
export interface OgeAutocompleteSelectionChangedEvent<TItem = unknown> {
  /** The picked item, or `null` when the selection was canceled (text diverged). */
  readonly item: TItem | null;
  /** The originating DOM event; `undefined` for programmatic changes. */
  readonly event?: Event;
}

/** Fired when a suggestion row is activated by click or keyboard. */
export interface OgeAutocompleteItemClickEvent<TItem = unknown> {
  readonly item: TItem;
  /** Index within the visible (filtered) list. */
  readonly index: number;
  readonly event: Event;
}
