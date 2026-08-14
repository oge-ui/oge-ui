import type { OgeButtonGroupSelectionMode } from './button-types';

/** What a click did to a button group's selection. */
export interface OgeButtonGroupSelectionChange {
  selectedKeys: readonly string[];
  addedKeys: readonly string[];
  removedKeys: readonly string[];
}

/**
 * Applies a click to a button group's selection and reports the delta.
 *
 * Returns `null` when nothing changes — `selectionMode: 'none'`, a valueless
 * button, or the WAI-ARIA radio rule that a single-mode group cannot be
 * emptied by re-clicking its selected button. Framework-free so the Angular
 * and React groups cannot drift on that rule.
 */
export function applyButtonGroupSelection(
  mode: OgeButtonGroupSelectionMode,
  current: readonly string[],
  value: string | undefined,
): OgeButtonGroupSelectionChange | null {
  if (mode === 'none' || value === undefined) return null;

  if (mode === 'single') {
    // Radios cannot be unselected by clicking the active one.
    if (current.length === 1 && current[0] === value) return null;
    return {
      selectedKeys: [value],
      addedKeys: [value],
      removedKeys: current.filter((key) => key !== value),
    };
  }

  const wasSelected = current.includes(value);
  return {
    selectedKeys: wasSelected
      ? current.filter((key) => key !== value)
      : [...current, value],
    addedKeys: wasSelected ? [] : [value],
    removedKeys: wasSelected ? [value] : [],
  };
}

/** ARIA role of the group container for each selection mode. */
export function buttonGroupRole(
  mode: OgeButtonGroupSelectionMode,
): 'radiogroup' | 'group' | 'toolbar' {
  switch (mode) {
    case 'single':
      return 'radiogroup';
    case 'multiple':
      return 'group';
    default:
      return 'toolbar';
  }
}

/**
 * Index of the button an arrow/Home/End key should move focus to, given the
 * enabled buttons in DOM order. `rtl` flips the horizontal arrows; vertical
 * arrows are direction-independent. Returns `-1` when the key is not a
 * navigation key or there is nothing to move to.
 */
export function buttonGroupNavIndex(
  key: string,
  currentIndex: number,
  enabledCount: number,
  rtl: boolean,
): number {
  if (enabledCount === 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return enabledCount - 1;
  let forward: boolean;
  if (key === 'ArrowDown') forward = true;
  else if (key === 'ArrowUp') forward = false;
  else if (key === 'ArrowRight' || key === 'ArrowLeft') {
    forward = (key === 'ArrowRight') !== rtl;
  } else return -1;
  const delta = forward ? 1 : -1;
  return (currentIndex + delta + enabledCount) % enabledCount;
}
