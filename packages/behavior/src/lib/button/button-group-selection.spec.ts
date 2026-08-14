import { describe, expect, it } from 'vitest';
import {
  applyButtonGroupSelection,
  buttonGroupNavIndex,
  buttonGroupRole,
} from './button-group-selection';

describe('applyButtonGroupSelection', () => {
  it('does nothing when the group does not select', () => {
    expect(applyButtonGroupSelection('none', [], 'a')).toBe(null);
  });

  it('does nothing for a button with no value', () => {
    expect(applyButtonGroupSelection('single', [], undefined)).toBe(null);
  });

  describe('single', () => {
    it('selects and reports what it replaced', () => {
      expect(applyButtonGroupSelection('single', ['a'], 'b')).toEqual({
        selectedKeys: ['b'],
        addedKeys: ['b'],
        removedKeys: ['a'],
      });
    });

    it('refuses to empty itself — the WAI-ARIA radio rule', () => {
      expect(applyButtonGroupSelection('single', ['a'], 'a')).toBe(null);
    });

    it('collapses a multi-key selection left over from a mode switch', () => {
      expect(applyButtonGroupSelection('single', ['a', 'b'], 'a')).toEqual({
        selectedKeys: ['a'],
        addedKeys: ['a'],
        removedKeys: ['b'],
      });
    });

    it('selects from an empty group', () => {
      expect(applyButtonGroupSelection('single', [], 'a')).toEqual({
        selectedKeys: ['a'],
        addedKeys: ['a'],
        removedKeys: [],
      });
    });
  });

  describe('multiple', () => {
    it('adds an unselected key at the end', () => {
      expect(applyButtonGroupSelection('multiple', ['a'], 'b')).toEqual({
        selectedKeys: ['a', 'b'],
        addedKeys: ['b'],
        removedKeys: [],
      });
    });

    it('toggles a selected key off — a multi group may be emptied', () => {
      expect(applyButtonGroupSelection('multiple', ['a'], 'a')).toEqual({
        selectedKeys: [],
        addedKeys: [],
        removedKeys: ['a'],
      });
    });

    it('does not mutate the incoming selection', () => {
      const current = ['a'];
      applyButtonGroupSelection('multiple', current, 'b');
      expect(current).toEqual(['a']);
    });
  });
});

describe('buttonGroupRole', () => {
  it('maps each selection mode to its ARIA container role', () => {
    expect(buttonGroupRole('single')).toBe('radiogroup');
    expect(buttonGroupRole('multiple')).toBe('group');
    expect(buttonGroupRole('none')).toBe('toolbar');
  });
});

describe('buttonGroupNavIndex', () => {
  it('jumps to the ends on Home and End', () => {
    expect(buttonGroupNavIndex('Home', 2, 4, false)).toBe(0);
    expect(buttonGroupNavIndex('End', 0, 4, false)).toBe(3);
  });

  it('steps the vertical arrows regardless of direction', () => {
    expect(buttonGroupNavIndex('ArrowDown', 0, 4, false)).toBe(1);
    expect(buttonGroupNavIndex('ArrowUp', 1, 4, false)).toBe(0);
    expect(buttonGroupNavIndex('ArrowDown', 0, 4, true)).toBe(1);
  });

  it('flips the horizontal arrows under RTL', () => {
    expect(buttonGroupNavIndex('ArrowRight', 0, 4, false)).toBe(1);
    expect(buttonGroupNavIndex('ArrowRight', 1, 4, true)).toBe(0);
    expect(buttonGroupNavIndex('ArrowLeft', 0, 4, true)).toBe(1);
  });

  it('wraps around both ends — a toolbar is a ring', () => {
    expect(buttonGroupNavIndex('ArrowRight', 3, 4, false)).toBe(0);
    expect(buttonGroupNavIndex('ArrowLeft', 0, 4, false)).toBe(3);
  });

  it('reports -1 for keys outside the pattern and for an empty group', () => {
    expect(buttonGroupNavIndex('Enter', 0, 4, false)).toBe(-1);
    expect(buttonGroupNavIndex('ArrowRight', 0, 0, false)).toBe(-1);
    expect(buttonGroupNavIndex('Home', 0, 0, false)).toBe(-1);
  });
});
