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
  /**
   * SVG path data (`d`) for a leading `aria-hidden` icon. Rows without one stay
   * aligned: the icon column only appears when some row in the menu has an icon.
   */
  icon?: string;
  /**
   * Class(es) for a leading icon rendered as an empty `<i>` — the hook for an
   * icon font the application already ships. `icon` stays the dependency-free
   * default.
   */
  iconClass?: string;
  /**
   * Renders the row as a real link (`<a href>`), so middle-click and
   * copy-address work. `itemClick` still fires first — `preventDefault()` on
   * its `event` hands navigation to a router. Keyboard activation follows the
   * link unless the handler prevented it. Ignored on submenu parents.
   */
  url?: string;
  /** Small counter/pill rendered after the label (PrimeNG parity). */
  badge?: string | number;
  /**
   * Accelerator hint rendered right-aligned (e.g. `'Ctrl+N'`) and announced
   * via `aria-keyshortcuts`. Display only — the application owns the actual
   * key binding.
   */
  shortcut?: string;
  /** Renders a divider; every other field is ignored. */
  separator?: boolean;
  /** Invoked when the item is activated, after `itemClick` emits. */
  action?: () => void;
  /**
   * Child items — the row becomes a submenu parent (trailing chevron,
   * `aria-haspopup="menu"`, `aria-expanded`). Activation opens the submenu
   * instead of emitting `itemClick`; `checked` and `action` are ignored.
   */
  items?: readonly OgeMenuItem<T>[];
}

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
  reason: 'escape' | 'tab' | 'select' | 'back';
  event: KeyboardEvent | MouseEvent;
}

/** Template context of a custom menu item template (icons, badges…). */
export interface OgeMenuItemTemplateContext {
  $implicit: OgeMenuItem;
  index: number;
}
