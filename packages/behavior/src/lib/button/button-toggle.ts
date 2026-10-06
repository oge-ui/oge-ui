import type { OgeButtonGroupSelectionMode } from './button-types';

/** Inputs of {@link resolveButtonSelectionState}. */
export interface OgeButtonSelectionRequest {
  /**
   * Selection mode of the enclosing button group; `null`/`undefined` when the
   * button stands alone.
   */
  readonly groupMode?: OgeButtonGroupSelectionMode | null;
  /** Whether the enclosing group has this button's `value` selected. */
  readonly groupSelected: boolean;
  /** The button's own `toggle` flag. */
  readonly toggle: boolean;
  /** The button's own `selected` state (used only for a standalone toggle). */
  readonly selected: boolean;
}

/** The selection semantics a button renders. */
export interface OgeButtonSelectionState {
  /** Painted as selected/pressed (`.oge-button-selected`). */
  readonly selected: boolean;
  /**
   * `true` when the button's own `toggle` drives the state — a click flips
   * `selected`. Never inside a `single`/`multiple` group, which owns it.
   */
  readonly standaloneToggle: boolean;
  /** `role="radio"` inside a single-selection group. */
  readonly role: 'radio' | null;
  readonly ariaChecked: 'true' | 'false' | null;
  readonly ariaPressed: 'true' | 'false' | null;
}

/**
 * Resolves who owns a button's selected state and which ARIA attributes it
 * renders. A selection group (`'single'` → radio + `aria-checked`,
 * `'multiple'` → `aria-pressed`) always wins, so the group behaviour is
 * unchanged; outside one — standalone, or in a `'none'` group (a plain
 * toolbar) — a `toggle` button is a WAI-ARIA toggle button with
 * `aria-pressed` reflecting its own `selected`. A non-toggle standalone
 * button renders no state at all.
 */
export function resolveButtonSelectionState(
  request: OgeButtonSelectionRequest,
): OgeButtonSelectionState {
  const { groupMode, groupSelected, toggle, selected } = request;
  if (groupMode === 'single') {
    return {
      selected: groupSelected,
      standaloneToggle: false,
      role: 'radio',
      ariaChecked: String(groupSelected) as 'true' | 'false',
      ariaPressed: null,
    };
  }
  if (groupMode === 'multiple') {
    return {
      selected: groupSelected,
      standaloneToggle: false,
      role: null,
      ariaChecked: null,
      ariaPressed: String(groupSelected) as 'true' | 'false',
    };
  }
  if (toggle) {
    return {
      selected,
      standaloneToggle: true,
      role: null,
      ariaChecked: null,
      ariaPressed: selected ? 'true' : 'false',
    };
  }
  return {
    selected: false,
    standaloneToggle: false,
    role: null,
    ariaChecked: null,
    ariaPressed: null,
  };
}

/** What a click on a standalone toggle button did to its state. */
export interface OgeButtonToggleChange {
  readonly selected: boolean;
  readonly previousValue: boolean;
}

/**
 * Applies an accepted click to a standalone toggle button. Returns `null`
 * when the button is not a standalone toggle (plain button, or a group owns
 * the selection), so the host emits nothing.
 */
export function applyButtonToggle(
  state: OgeButtonSelectionState,
): OgeButtonToggleChange | null {
  if (!state.standaloneToggle) return null;
  return { selected: !state.selected, previousValue: state.selected };
}
