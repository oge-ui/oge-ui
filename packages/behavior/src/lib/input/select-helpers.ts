/**
 * Small, pure decisions the dropdown editors share across both render layers
 * (ADR 0001): the cancelable open/close pre-event vocabulary, the tag box's
 * "select all" tri-state and capped toggling, and chip overflow arithmetic.
 */

/** Why a dropdown editor's popup is about to close. */
export type OgeDropDownCloseReason =
  'api' | 'select' | 'escape' | 'outside' | 'tab' | 'blur';

/** Cancelable pre-event fired before a dropdown editor's popup opens. */
export interface OgeDropDownOpeningEvent {
  /** Set `true` to keep the popup closed. */
  cancel: boolean;
}

/** Cancelable pre-event fired before a dropdown editor's popup closes. */
export interface OgeDropDownClosingEvent {
  /** What is closing the popup. */
  readonly reason: OgeDropDownCloseReason;
  /** Set `true` to keep the popup open. */
  cancel: boolean;
}

/**
 * Runs a cancelable pre-event: builds the payload, hands it to `emit` and
 * reports whether the action may proceed. `emit` is the render layer's own
 * dispatch (an Angular `output().emit`, a React callback prop).
 */
export function ogeAllowDropDownOpen(
  emit: ((event: OgeDropDownOpeningEvent) => void) | undefined,
): boolean {
  if (!emit) return true;
  const event: OgeDropDownOpeningEvent = { cancel: false };
  emit(event);
  return !event.cancel;
}

/** Closing counterpart of {@link ogeAllowDropDownOpen}. */
export function ogeAllowDropDownClose(
  emit: ((event: OgeDropDownClosingEvent) => void) | undefined,
  reason: OgeDropDownCloseReason,
): boolean {
  if (!emit) return true;
  const event: OgeDropDownClosingEvent = { reason, cancel: false };
  emit(event);
  return !event.cancel;
}

/** State of a "select all" toggle: every, none or some of the eligible items. */
export type OgeSelectAllState = boolean | 'mixed';

/**
 * The tri-state of a tag box's "select all" row over the items it acts on
 * (the visible, enabled ones): `true` all selected, `false` none, `'mixed'`
 * in between. An empty list reads `false`.
 */
export function ogeSelectAllState<TItem>(
  items: readonly TItem[],
  isSelected: (item: TItem) => boolean,
  isDisabled: (item: TItem) => boolean,
): OgeSelectAllState {
  let selected = 0;
  let eligible = 0;
  for (const item of items) {
    if (isDisabled(item)) continue;
    eligible++;
    if (isSelected(item)) selected++;
  }
  if (eligible === 0 || selected === 0) return false;
  return selected === eligible ? true : 'mixed';
}

/**
 * The value after toggling "select all" over `items`: `select` appends every
 * enabled, not-yet-selected item (in list order, capped by `maxSelected`);
 * clearing removes the enabled visible items and keeps everything else —
 * values selected under another search, or on disabled rows.
 */
export function ogeToggleAllValues<TItem>(
  current: readonly unknown[],
  items: readonly TItem[],
  valueOf: (item: TItem) => unknown,
  isDisabled: (item: TItem) => boolean,
  select: boolean,
  maxSelected?: number,
): readonly unknown[] {
  const has = (value: unknown) =>
    current.some((entry) => Object.is(entry, value));
  if (!select) {
    const removable = items
      .filter((item) => !isDisabled(item))
      .map((item) => valueOf(item));
    return current.filter(
      (entry) => !removable.some((value) => Object.is(value, entry)),
    );
  }
  const next = [...current];
  for (const item of items) {
    if (maxSelected !== undefined && next.length >= maxSelected) break;
    if (isDisabled(item)) continue;
    const value = valueOf(item);
    if (!has(value)) next.push(value);
  }
  return next;
}

/** Whether another value may be added under a `maxSelectedItems` cap. */
export function ogeCanSelectMore(
  count: number,
  maxSelected: number | undefined,
): boolean {
  return maxSelected === undefined || count < maxSelected;
}

/** How many chips render and how many fold into the `+N more` chip. */
export function ogeChipOverflow(
  count: number,
  maxDisplayed: number | undefined,
): { readonly shown: number; readonly hidden: number } {
  if (maxDisplayed === undefined || count <= maxDisplayed) {
    return { shown: count, hidden: 0 };
  }
  const shown = Math.max(0, Math.floor(maxDisplayed));
  return { shown, hidden: count - shown };
}
