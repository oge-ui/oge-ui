import type { PivotArea } from '@oge-ui/core';

/**
 * DOM readers both render layers share. They only read the rendered
 * `.oge-pivot-*` markup — no framework, no state.
 */

/** Whether an element lays out right-to-left (mirrors the arrow keys). */
export function pivotIsRtl(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  return view ? view.getComputedStyle(element).direction === 'rtl' : false;
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
