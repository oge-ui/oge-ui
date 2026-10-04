import { applyButtonGroupSelection } from '../button/button-group-selection';

/**
 * The selection rules of the items-bound choice groups — the check box group
 * (an array value, a tri-state "select all") and the toggle group (a
 * segmented single/multiple editor). Framework-free and pure, so the Angular
 * and React components cannot drift on ordering, the disabled-item rule or
 * the radio no-unselect rule (ADR 0001).
 *
 * Values are compared with `Object.is`, the select family's equality.
 */

/** How the items of a check box group are arranged. */
export type OgeCheckBoxGroupLayout = 'horizontal' | 'vertical' | 'columns';

/** Whether a toggle group holds one value (radio pattern) or many. */
export type OgeToggleGroupSelectionMode = 'single' | 'multiple';

/** `true` when `list` holds `value` (`Object.is` equality). */
export function choiceIncludes(
  list: readonly unknown[],
  value: unknown,
): boolean {
  return list.some((entry) => Object.is(entry, value));
}

/**
 * Checks or unchecks one value of an array-valued group. The result follows
 * the **items order** (`order`, the item values), not the click order, so the
 * committed array is stable however the user got there; values the current
 * array holds that no item produces (stale or not-yet-loaded items) are kept,
 * after the known ones.
 */
export function toggleChoiceValue(
  order: readonly unknown[],
  current: readonly unknown[],
  value: unknown,
  checked: boolean,
): unknown[] {
  const known = order.filter((entry) =>
    Object.is(entry, value) ? checked : choiceIncludes(current, entry),
  );
  const unknown = current.filter(
    (entry) => !choiceIncludes(order, entry) && !Object.is(entry, value),
  );
  if (checked && !choiceIncludes(order, value)) unknown.push(value);
  return [...known, ...unknown];
}

/**
 * State of the "select all" box over the `selectable` (enabled) values:
 * `true` when every one is checked, `false` when none is, `null`
 * (indeterminate) in between. No selectable item → `false`.
 */
export function selectAllState(
  selectable: readonly unknown[],
  current: readonly unknown[],
): boolean | null {
  if (selectable.length === 0) return false;
  const checked = selectable.filter((value) => choiceIncludes(current, value));
  if (checked.length === 0) return false;
  return checked.length === selectable.length ? true : null;
}

/**
 * Applies the "select all" box: `checked` adds every selectable value,
 * unchecked removes them. Disabled items keep their state either way — a user
 * may not change what they cannot reach (the DevExtreme/Kendo rule).
 */
export function applySelectAll(
  order: readonly unknown[],
  selectable: readonly unknown[],
  current: readonly unknown[],
  checked: boolean,
): unknown[] {
  let next = [...current];
  for (const value of selectable) {
    next = toggleChoiceValue(order, next, value, checked);
  }
  return next;
}

/** Indices (into `values`) a toggle group's current value selects. */
export function toggleGroupSelectedIndices(
  mode: OgeToggleGroupSelectionMode,
  values: readonly unknown[],
  current: unknown,
): number[] {
  const selected =
    mode === 'multiple'
      ? Array.isArray(current)
        ? (current as readonly unknown[])
        : []
      : current == null
        ? []
        : [current];
  return values
    .map((value, index) => (choiceIncludes(selected, value) ? index : -1))
    .filter((index) => index >= 0);
}

/** What a press did to a toggle group's value. */
export interface OgeToggleGroupChange {
  /** The new committed value — a scalar (`single`) or an array (`multiple`). */
  value: unknown;
  addedValues: unknown[];
  removedValues: unknown[];
}

/**
 * Applies a press on the item at `index` — through the button group's own
 * `applyButtonGroupSelection`, so the radio no-unselect rule is literally the
 * same code. `null` when nothing changes. A `multiple` result follows the
 * items order and keeps values no item produces.
 */
export function applyToggleGroupPress(
  mode: OgeToggleGroupSelectionMode,
  values: readonly unknown[],
  current: unknown,
  index: number,
): OgeToggleGroupChange | null {
  if (index < 0 || index >= values.length) return null;
  const keys = toggleGroupSelectedIndices(mode, values, current).map(String);
  const change = applyButtonGroupSelection(mode, keys, String(index));
  if (!change) return null;
  const toValues = (list: readonly string[]): unknown[] =>
    list.map((key) => values[Number(key)]);
  const addedValues = toValues(change.addedKeys);
  const removedValues =
    mode === 'single' && current != null && !choiceIncludes(values, current)
      ? [current]
      : toValues(change.removedKeys);
  if (mode === 'single') {
    return { value: values[index], addedValues, removedValues };
  }
  const previous = Array.isArray(current) ? (current as unknown[]) : [];
  const pressed = values[index];
  return {
    value: toggleChoiceValue(
      values,
      previous,
      pressed,
      !choiceIncludes(previous, pressed),
    ),
    addedValues,
    removedValues,
  };
}
