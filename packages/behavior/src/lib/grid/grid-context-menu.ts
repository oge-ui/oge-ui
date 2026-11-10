/**
 * Keyboard access to the row and header context menus of the grid-like
 * components (grid, tree list — both render layers).
 *
 * The WAI-ARIA grid pattern leaves the context menu to the platform keys: the
 * Menu key and Shift+F10 on the focused cell. Browsers do dispatch a
 * `contextmenu` event for them, but at the element's centre or at 0,0
 * depending on the engine, and not at all in some embedded webviews — so the
 * components handle the keys themselves, anchor the menu at the focused cell,
 * and swallow the native echo that may follow.
 */

import { ogeIsRtl } from '../a11y/direction';

/** The Menu key, or Shift+F10. */
export function isOgeContextMenuKey(event: {
  readonly key: string;
  readonly shiftKey: boolean;
}): boolean {
  return event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
}

/**
 * The source of a pointer-opened context menu: `'touch'` for a long-press
 * (the `contextmenu` event is a `PointerEvent` with `pointerType: 'touch'`
 * in Chromium and Firefox), `'pointer'` otherwise. Accepts a DOM event or a
 * React synthetic one.
 */
export function ogeContextMenuSourceOf(event: object): 'pointer' | 'touch' {
  const native =
    (event as { nativeEvent?: object }).nativeEvent ?? (event as object);
  return (native as { pointerType?: string }).pointerType === 'touch'
    ? 'touch'
    : 'pointer';
}

/**
 * Where a keyboard-opened menu anchors on `element`: its inline-start /
 * bottom corner (the right edge under `dir="rtl"`).
 */
export function ogeContextMenuAnchorPoint(element: Element): {
  readonly x: number;
  readonly y: number;
} {
  const rect = element.getBoundingClientRect();
  return { x: ogeIsRtl(element) ? rect.right : rect.left, y: rect.bottom };
}

/** What a keyboard context-menu request landed on inside a grid-like host. */
export interface OgeContextMenuKeyTarget {
  /** Where the menu opens: the cell's inline-start/bottom corner. */
  readonly x: number;
  readonly y: number;
  /** `data-colid` of the focused header cell; `null` when a body cell has focus. */
  readonly headerColumnId: string | null;
  /** `data-rowindex` of the focused body row; `null` for a header. */
  readonly rowIndex: number | null;
}

/**
 * Resolves the focused header cell (`.oge-header-cell[data-colid]`) or body
 * cell (`[role="gridcell"]` inside `.oge-row[data-rowindex]`) behind a key
 * event. `null` when the focus is on neither — a toolbar button, an editor.
 */
export function ogeContextMenuKeyTarget(
  target: EventTarget | null,
): OgeContextMenuKeyTarget | null {
  if (!isElement(target)) return null;
  const header = target.closest('.oge-header-cell');
  const anchor = header ?? target.closest('[role="gridcell"]');
  if (!anchor) return null;
  const point = ogeContextMenuAnchorPoint(anchor);
  if (header) {
    const id = header.getAttribute('data-colid');
    return id === null
      ? null
      : { ...point, headerColumnId: id, rowIndex: null };
  }
  const row = anchor.closest('.oge-row[data-rowindex]');
  const index = Number(row?.getAttribute('data-rowindex'));
  return Number.isInteger(index)
    ? { ...point, headerColumnId: null, rowIndex: index }
    : null;
}

/**
 * Swallows the native `contextmenu` a browser may send right after a
 * keyboard-opened menu. A real right-click (`button === 2`) is never taken
 * for an echo.
 */
export class OgeContextMenuEcho {
  private openedAt = Number.NEGATIVE_INFINITY;

  /** Call when the keyboard opened (or offered) a menu. */
  mark(timeStamp: number): void {
    this.openedAt = timeStamp;
  }

  /** True — and the event's default prevented — when `event` is that echo. */
  swallow(event: {
    readonly button: number;
    readonly timeStamp: number;
    preventDefault(): void;
  }): boolean {
    if (event.button === 2) return false;
    if (event.timeStamp - this.openedAt > ECHO_WINDOW_MS) return false;
    this.openedAt = Number.NEGATIVE_INFINITY;
    event.preventDefault();
    return true;
  }
}

/** Menu-key `contextmenu` follows its keydown/keyup well inside this. */
const ECHO_WINDOW_MS = 800;

function isElement(value: EventTarget | null): value is Element {
  return (
    value !== null &&
    typeof (value as Element).closest === 'function' &&
    typeof (value as Element).getBoundingClientRect === 'function'
  );
}
