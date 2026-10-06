import { describe, expect, it } from 'vitest';
import {
  applyButtonToggle,
  resolveButtonSelectionState,
} from './button-toggle';

describe('resolveButtonSelectionState', () => {
  it('renders nothing for a plain standalone button', () => {
    expect(
      resolveButtonSelectionState({
        groupSelected: false,
        toggle: false,
        selected: true,
      }),
    ).toEqual({
      selected: false,
      standaloneToggle: false,
      role: null,
      ariaChecked: null,
      ariaPressed: null,
    });
  });

  it('a standalone toggle renders aria-pressed from its own state', () => {
    const off = resolveButtonSelectionState({
      groupSelected: false,
      toggle: true,
      selected: false,
    });
    expect(off.ariaPressed).toBe('false');
    expect(off.standaloneToggle).toBe(true);
    const on = resolveButtonSelectionState({
      groupMode: null,
      groupSelected: false,
      toggle: true,
      selected: true,
    });
    expect(on.ariaPressed).toBe('true');
    expect(on.selected).toBe(true);
  });

  it('a "none" group (toolbar) still lets the button toggle itself', () => {
    const state = resolveButtonSelectionState({
      groupMode: 'none',
      groupSelected: false,
      toggle: true,
      selected: true,
    });
    expect(state.standaloneToggle).toBe(true);
    expect(state.ariaPressed).toBe('true');
  });

  it('selection groups win over the button’s own toggle', () => {
    const single = resolveButtonSelectionState({
      groupMode: 'single',
      groupSelected: true,
      toggle: true,
      selected: false,
    });
    expect(single).toMatchObject({
      selected: true,
      standaloneToggle: false,
      role: 'radio',
      ariaChecked: 'true',
      ariaPressed: null,
    });
    const multiple = resolveButtonSelectionState({
      groupMode: 'multiple',
      groupSelected: false,
      toggle: true,
      selected: true,
    });
    expect(multiple).toMatchObject({
      selected: false,
      standaloneToggle: false,
      ariaPressed: 'false',
    });
  });
});

describe('applyButtonToggle', () => {
  it('flips a standalone toggle and reports the previous value', () => {
    const state = resolveButtonSelectionState({
      groupSelected: false,
      toggle: true,
      selected: false,
    });
    expect(applyButtonToggle(state)).toEqual({
      selected: true,
      previousValue: false,
    });
  });

  it('is a no-op outside toggle mode', () => {
    expect(
      applyButtonToggle(
        resolveButtonSelectionState({
          groupMode: 'multiple',
          groupSelected: true,
          toggle: true,
          selected: false,
        }),
      ),
    ).toBeNull();
  });
});
