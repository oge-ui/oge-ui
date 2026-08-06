import type { OgeMenuItem } from '@oge-ui/overlay';

/**
 * Lazy items source: invoked on first open (result is cached until the
 * function reference changes); may return the items synchronously or as a
 * promise.
 */
export type OgeDropDownItemsFn = () =>
  readonly OgeMenuItem[] | Promise<readonly OgeMenuItem[]>;

/** Payload of the drop-down button's `itemClick` output. */
export interface OgeDropDownButtonItemClickEvent {
  item: OgeMenuItem;
  /** Index within the resolved items list (separators included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/** Payload of `selectionChanged` — fires when `rememberLastAction` swaps the remembered item. */
export interface OgeDropDownSelectionChangedEvent {
  item: OgeMenuItem;
  previousItem: OgeMenuItem | null;
}

/** Template context of `*ogeDropDownContent`. */
export interface OgeDropDownContentContext {
  /** Closes the panel (reason `select`) and restores focus to the trigger. */
  $implicit: () => void;
}
