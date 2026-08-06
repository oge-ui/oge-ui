/** Destructive items render with the danger token. */
export type OgeMenuItemSeverity = 'normal' | 'danger';

/**
 * Canonical menu item of the oge suite — used by drop-down buttons and, going
 * forward, context menus across packages.
 */
export interface OgeMenuItem<T = unknown> {
  text: string;
  /** Consumer-defined key carried through click events. */
  value?: T;
  /** Tooltip (native `title`) — e.g. why an item is disabled. */
  hint?: string;
  disabled?: boolean;
  /**
   * Defined (true or false) renders the item as `menuitemcheckbox` with a
   * check mark when `true`.
   */
  checked?: boolean;
  /** `'danger'` renders the destructive style. Default `'normal'`. */
  severity?: OgeMenuItemSeverity;
  /** Renders a divider; every other field is ignored. */
  separator?: boolean;
  /** Invoked when the item is activated, after `itemClick` emits. */
  action?: () => void;
}

/** Payload of `OgeMenuList.itemClick`. */
export interface OgeMenuListItemClickEvent {
  item: OgeMenuItem;
  /** Index within the `items` input (separators included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/** The menu asks its owner to close it (owner decides focus handling). */
export interface OgeMenuCloseRequestEvent {
  reason: 'escape' | 'tab' | 'select';
  event: KeyboardEvent | MouseEvent;
}

/** Template context of a custom menu item template (icons, badges…). */
export interface OgeMenuItemTemplateContext {
  $implicit: OgeMenuItem;
  index: number;
}
