import type { OgeMenuItem } from './menu-types';

/**
 * Checkbox / radio / header semantics of a menu row, shared by the Angular
 * `oge-menu-list` and the React `<OgeMenuList>` so the two layers cannot
 * drift on roles, `aria-checked`, the radio-group rule, which rows the
 * keyboard visits or when a menu stays open (WAI-ARIA APG menu pattern).
 */

/** ARIA role a menu row renders with. */
export type OgeMenuItemRole = 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';

/** What drove an activation — Space keeps check/radio rows open (APG). */
export type OgeMenuActivationTrigger = 'pointer' | 'enter' | 'space';

/** `true` for a section caption row (`type: 'header'`). */
export function isMenuHeader(item: OgeMenuItem): boolean {
  return item.type === 'header';
}

/**
 * `true` when the active row may land on the item: enabled, not a separator
 * and not a header.
 */
export function isMenuItemNavigable(item: OgeMenuItem | undefined): boolean {
  return !!item && !item.disabled && !item.separator && !isMenuHeader(item);
}

/**
 * The row's role. Submenu parents are always `menuitem`; `type` wins when it
 * names a check kind; with no `type` a defined `checked` keeps the historical
 * `menuitemcheckbox`.
 */
export function menuItemRole(item: OgeMenuItem): OgeMenuItemRole {
  if (item.items?.length) return 'menuitem';
  if (item.type === 'checkbox') return 'menuitemcheckbox';
  if (item.type === 'radio') return 'menuitemradio';
  if (item.type === undefined && item.checked !== undefined) {
    return 'menuitemcheckbox';
  }
  return 'menuitem';
}

/** The `aria-checked` value of a row, or `null` when it carries none. */
export function menuItemAriaChecked(
  item: OgeMenuItem,
): 'true' | 'false' | null {
  if (menuItemRole(item) === 'menuitem') return null;
  return item.checked ? 'true' : 'false';
}

/** Which state glyph a row draws: a check mark, a radio dot, or none. */
export function menuItemIndicator(item: OgeMenuItem): 'check' | 'radio' | null {
  const role = menuItemRole(item);
  if (role === 'menuitemradio') return 'radio';
  if (role === 'menuitemcheckbox') return 'check';
  return null;
}

/**
 * The checked state an activation moves the row to: a checkbox toggles, a
 * radio is always checked afterwards (re-activating it is a no-op), a plain
 * row reports `undefined`.
 */
export function menuItemNextChecked(item: OgeMenuItem): boolean | undefined {
  const role = menuItemRole(item);
  if (role === 'menuitemradio') return true;
  if (role === 'menuitemcheckbox') return !item.checked;
  return undefined;
}

/**
 * Whether the menu stays open after activating the row. `keepOpen` always
 * does; otherwise explicit `type: 'checkbox' | 'radio'` rows stay open on
 * Space (APG: "changes the state without closing the menu") and close on a
 * click or Enter. Rows relying on the historical `checked`-only rule keep
 * closing on every activation.
 */
export function menuItemKeepsOpen(
  item: OgeMenuItem,
  trigger: OgeMenuActivationTrigger,
): boolean {
  if (item.keepOpen) return true;
  return (
    trigger === 'space' && (item.type === 'checkbox' || item.type === 'radio')
  );
}

/**
 * Returns `items` with the activation of `target` applied, immutably and at
 * any depth: a checkbox toggles, a radio becomes checked and every other
 * radio of the same `group` on the same level is unchecked. Untouched levels
 * and rows keep their references. `target` is matched by reference, so pass
 * the item the click event carried.
 *
 * ```ts
 * onItemClick(e) { this.items.update((items) => applyMenuItemCheck(items, e.item)); }
 * ```
 */
export function applyMenuItemCheck<I extends OgeMenuItem>(
  items: readonly I[],
  target: OgeMenuItem,
): readonly I[] {
  const index = items.indexOf(target as I);
  if (index >= 0) {
    const next = menuItemNextChecked(target);
    if (next === undefined) return items;
    const radio = menuItemRole(target) === 'menuitemradio';
    let changed = false;
    const result = items.map((item, i) => {
      if (i === index) {
        if (!!item.checked === next) return item;
        changed = true;
        return { ...item, checked: next };
      }
      if (
        radio &&
        item.checked &&
        menuItemRole(item) === 'menuitemradio' &&
        item.group === target.group
      ) {
        changed = true;
        return { ...item, checked: false };
      }
      return item;
    });
    return changed ? result : items;
  }
  let changed = false;
  const result = items.map((item) => {
    if (!item.items?.length) return item;
    const children = applyMenuItemCheck(item.items, target);
    if (children === item.items) return item;
    changed = true;
    return { ...item, items: children };
  });
  return changed ? result : items;
}

/**
 * A run of rows the menu renders together. `group: true` runs render inside a
 * `role="group"` element — labelled by the header row at `headerIndex` when
 * there is one (`-1` otherwise). `indexes` are positions in the original
 * `items` array and exclude the header itself.
 */
export interface OgeMenuSegment {
  readonly group: boolean;
  readonly headerIndex: number;
  readonly indexes: readonly number[];
}

/**
 * Splits a menu level into render segments. A header row opens a labelled
 * group that runs to the next separator or header. Outside headed sections,
 * consecutive radio rows of the same `group` form an unlabelled group (APG:
 * a radio set is delimited by a group or separators). Everything else —
 * separators included — renders loose, in order, so a menu without headers
 * or radios produces one ungrouped segment per run exactly as before.
 */
export function menuItemSegments(
  items: readonly OgeMenuItem[],
): readonly OgeMenuSegment[] {
  const segments: OgeMenuSegment[] = [];
  let loose: number[] = [];
  const flushLoose = (): void => {
    if (loose.length)
      segments.push({ group: false, headerIndex: -1, indexes: loose });
    loose = [];
  };
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (isMenuHeader(item)) {
      flushLoose();
      const indexes: number[] = [];
      let next = index + 1;
      while (
        next < items.length &&
        !items[next].separator &&
        !isMenuHeader(items[next])
      ) {
        indexes.push(next);
        next++;
      }
      segments.push({ group: true, headerIndex: index, indexes });
      index = next;
      continue;
    }
    if (!item.separator && menuItemRole(item) === 'menuitemradio') {
      flushLoose();
      const indexes = [index];
      let next = index + 1;
      while (
        next < items.length &&
        !items[next].separator &&
        !isMenuHeader(items[next]) &&
        menuItemRole(items[next]) === 'menuitemradio' &&
        items[next].group === item.group
      ) {
        indexes.push(next);
        next++;
      }
      segments.push({ group: true, headerIndex: -1, indexes });
      index = next;
      continue;
    }
    loose.push(index);
    index++;
  }
  flushLoose();
  return segments;
}

/**
 * The active row to keep when a menu's `items` are replaced. The menu resets
 * its active row on new items (an async reload is a different menu) — except
 * when the application only re-rendered the same rows, which is what a
 * kept-open checkbox/radio toggle produces: same length, same text at the
 * active position and still navigable. Returns `-1` otherwise.
 */
export function menuRetainedActiveIndex(
  previous: readonly OgeMenuItem[],
  next: readonly OgeMenuItem[],
  activeIndex: number,
): number {
  if (activeIndex < 0 || previous.length !== next.length) return -1;
  const before = previous[activeIndex];
  const after = next[activeIndex];
  if (!before || !after || before.text !== after.text) return -1;
  return isMenuItemNavigable(after) ? activeIndex : -1;
}
