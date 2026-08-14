import type { OgeMenuCloseReason, OgeMenuItem } from '@oge-ui/behavior';

// The canonical menu item is framework-free data shared with the React render
// layer, so it lives in `@oge-ui/behavior` (ADR 0001 Faz 3). Re-exported here
// unchanged — `@oge-ui/overlay` remains the import path Angular consumers use.
export type { OgeMenuItem, OgeMenuItemSeverity } from '@oge-ui/behavior';

/** Payload of `OgeMenuList.itemClick`. */
export interface OgeMenuListItemClickEvent {
  item: OgeMenuItem;
  /** Index within the `items` input (separators included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/**
 * The menu asks its owner to close it (owner decides focus handling).
 * `'back'` is emitted by a nested submenu returning to its parent item and is
 * absorbed by the parent menu — it never reaches the root owner.
 */
export interface OgeMenuCloseRequestEvent {
  reason: OgeMenuCloseReason;
  event: KeyboardEvent | MouseEvent;
}

/** Template context of a custom menu item template (icons, badges…). */
export interface OgeMenuItemTemplateContext {
  $implicit: OgeMenuItem;
  index: number;
}
