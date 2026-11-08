import {
  ogeIsRtl,
  ogeVisibleViewport,
  resolvePopupPosition,
} from '@oge-ui/behavior';
import type { PivotArea } from '@oge-ui/core';

/**
 * DOM readers both render layers share. They only read the rendered
 * `.oge-pivot-*` markup — no framework, no state.
 */

/**
 * Whether an element lays out right-to-left (mirrors the arrow keys): an
 * explicit `rtlEnabled` wins, else the page direction — `ogeIsRtl` from
 * `@oge-ui/behavior` (computed `direction`, then the nearest `dir`).
 */
export function pivotIsRtl(
  element: Element,
  explicit?: boolean | undefined,
): boolean {
  return ogeIsRtl(element, explicit);
}

/** Shift+F10 or the context-menu key: the keyboard's right-click. */
export function pivotIsMenuKey(event: {
  readonly key: string;
  readonly shiftKey?: boolean;
}): boolean {
  return (
    event.key === 'ContextMenu' || (!!event.shiftKey && event.key === 'F10')
  );
}

/**
 * Re-focuses a field's chip after a keyboard move: inside the field
 * chooser when the move happened there, else in the field panel. A field
 * that left the layout (`area: null`) is focused in the chooser's "All
 * fields" list; in the panel, focus falls back to a chip of the zone it
 * left (`formerZone`), any chip, then the panel toggle.
 */
export function focusPivotChip(
  host: Element,
  fieldId: string,
  area: PivotArea | null,
  inChooser: boolean,
  formerZone: PivotArea | null,
): void {
  const root = host.querySelector(
    inChooser ? '.oge-pivot-chooser' : '.oge-pivot-field-panel',
  );
  if (!root) return;
  const chips = Array.from(
    root.querySelectorAll<HTMLElement>('.oge-pivot-field-chip[data-field-id]'),
  );
  const zoneOf = (chip: HTMLElement) =>
    chip.closest('[data-area]')?.getAttribute('data-area') ?? null;
  const own = chips.filter((chip) => chip.dataset['fieldId'] === fieldId);
  const target =
    area !== null
      ? own.find((chip) => zoneOf(chip) === area)
      : inChooser
        ? own.find((chip) => !!chip.closest('.oge-pivot-chooser-all'))
        : (chips.find((chip) => zoneOf(chip) === formerZone) ??
          chips[0] ??
          root.querySelector<HTMLElement>('.oge-pivot-panel-toggle'));
  target?.focus();
}

/**
 * Keeps an inline-fixed popup (the context menu, the header filter popup) on
 * screen. Both open at a pointer — or keyboard — anchor point and are
 * `position: fixed`, so near the bottom or the inline-end edge of the viewport
 * their last items sat outside it, unreachable without moving the page. Call
 * it once the popup rendered: it measures the popup, flips it above the
 * anchor when there is more room there, clamps it into the visible viewport,
 * and writes the resolved `top` / `left`. RTL keeps opening towards the
 * inline start, so the stylesheet's RTL `translate` is replaced here.
 */
export function fitPivotPopup(
  popup: HTMLElement,
  anchor: { readonly x: number; readonly y: number },
): void {
  const viewport = ogeVisibleViewport();
  if (!(viewport.width > 0) || !(viewport.height > 0)) return;
  const { width, height } = popup.getBoundingClientRect();
  const resolved = resolvePopupPosition({
    anchor: {
      top: anchor.y - viewport.top,
      left: anchor.x - viewport.left,
      width: 0,
      height: 0,
    },
    panel: { width, height },
    viewport: { width: viewport.width, height: viewport.height },
    placement: 'bottom-start',
    offset: 0,
    rtl: pivotIsRtl(popup),
  });
  popup.style.top = `${String(resolved.top + viewport.top)}px`;
  popup.style.left = `${String(resolved.left + viewport.left)}px`;
  popup.style.translate = 'none';
}
