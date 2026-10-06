import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_CHIP_MESSAGES,
  ogeChipFocusAfterRemove,
  ogeChipGridStops,
  ogeChipIsRemovable,
  ogeChipKeyIntent,
  ogeChipListRole,
  ogeChipNavIndex,
  ogeChipRemoveLabel,
  ogeChipTabStop,
  ogeChipToggleSelection,
  resolveOgeChipConfig,
} from './chip-core';

describe('ogeChipListRole', () => {
  it('maps the selection mode and removability to the APG shape', () => {
    expect(ogeChipListRole('single', false)).toBe('listbox');
    expect(ogeChipListRole('multiple', true)).toBe('listbox');
    expect(ogeChipListRole('none', true)).toBe('grid');
    expect(ogeChipListRole('none', false)).toBe('list');
  });
});

describe('ogeChipKeyIntent', () => {
  it('maps arrows (mirrored in RTL), Home/End and the actions', () => {
    expect(ogeChipKeyIntent('ArrowRight')).toEqual({
      type: 'move',
      to: 'next',
    });
    expect(ogeChipKeyIntent('ArrowRight', true)).toEqual({
      type: 'move',
      to: 'prev',
    });
    expect(ogeChipKeyIntent('ArrowLeft', true)).toEqual({
      type: 'move',
      to: 'next',
    });
    expect(ogeChipKeyIntent('ArrowUp', true)).toEqual({
      type: 'move',
      to: 'prev',
    });
    expect(ogeChipKeyIntent('Home')).toEqual({ type: 'move', to: 'first' });
    expect(ogeChipKeyIntent('End')).toEqual({ type: 'move', to: 'last' });
    expect(ogeChipKeyIntent(' ')).toEqual({ type: 'toggle' });
    expect(ogeChipKeyIntent('Enter')).toEqual({ type: 'toggle' });
    expect(ogeChipKeyIntent('Delete')).toEqual({
      type: 'remove',
      then: 'next',
    });
    expect(ogeChipKeyIntent('Backspace')).toEqual({
      type: 'remove',
      then: 'prev',
    });
    expect(ogeChipKeyIntent('a')).toBeNull();
  });
});

describe('ogeChipNavIndex', () => {
  const disabled = (i: number) => i === 1;

  it('skips disabled chips and never wraps', () => {
    expect(ogeChipNavIndex(4, 0, 'next', disabled)).toBe(2);
    expect(ogeChipNavIndex(4, 2, 'prev', disabled)).toBe(0);
    expect(ogeChipNavIndex(4, 3, 'next', disabled)).toBe(3);
    expect(ogeChipNavIndex(4, 0, 'prev', disabled)).toBe(0);
  });

  it('jumps to the first and last enabled chip', () => {
    expect(ogeChipNavIndex(3, 2, 'first', (i) => i === 0)).toBe(1);
    expect(ogeChipNavIndex(3, 0, 'last', (i) => i === 2)).toBe(1);
    expect(ogeChipNavIndex(0, 0, 'first')).toBe(-1);
  });
});

describe('ogeChipTabStop', () => {
  const items = [{ key: 'a', disabled: true }, { key: 'b' }, { key: 'c' }];

  it('keeps a valid focus, else the selected chip, else the first enabled', () => {
    expect(ogeChipTabStop(items, 2)).toBe(2);
    expect(ogeChipTabStop(items, 0, ['c'])).toBe(2);
    expect(ogeChipTabStop(items, -1)).toBe(1);
    expect(ogeChipTabStop(items, 9, ['a'])).toBe(1);
    expect(ogeChipTabStop([{ key: 'x', disabled: true }], -1)).toBe(-1);
  });
});

describe('ogeChipToggleSelection', () => {
  it('toggles in multiple mode', () => {
    expect(ogeChipToggleSelection('multiple', ['a'], 'b')).toEqual(['a', 'b']);
    expect(ogeChipToggleSelection('multiple', ['a', 'b'], 'a')).toEqual(['b']);
  });

  it('replaces or clears in single mode, changes nothing in none', () => {
    expect(ogeChipToggleSelection('single', ['a'], 'b')).toEqual(['b']);
    expect(ogeChipToggleSelection('single', ['a'], 'a')).toEqual([]);
    expect(ogeChipToggleSelection('none', ['a'], 'b')).toEqual(['a']);
  });
});

describe('ogeChipFocusAfterRemove', () => {
  it('lands on the chip taking the place, or the previous one', () => {
    expect(ogeChipFocusAfterRemove(4, 1, 'next')).toBe(1);
    expect(ogeChipFocusAfterRemove(4, 3, 'next')).toBe(2);
    expect(ogeChipFocusAfterRemove(4, 1, 'prev')).toBe(0);
    expect(ogeChipFocusAfterRemove(4, 0, 'prev')).toBe(0);
    expect(ogeChipFocusAfterRemove(1, 0, 'next')).toBe(-1);
  });

  it('skips disabled neighbours, preferred direction first', () => {
    // remaining after the removal: [enabled, disabled, enabled]
    const disabled = [false, true, false];
    expect(ogeChipFocusAfterRemove(4, 1, 'next', disabled)).toBe(2);
    expect(ogeChipFocusAfterRemove(4, 2, 'prev', disabled)).toBe(0);
    expect(ogeChipFocusAfterRemove(4, 3, 'next', [false, false, true])).toBe(1);
    expect(ogeChipFocusAfterRemove(3, 0, 'next', [true, true])).toBe(-1);
  });
});

describe('grid stops and removability', () => {
  it('lists a label and a remove stop per enabled removable chip', () => {
    expect(
      ogeChipGridStops(
        [{}, { disabled: true }, { removable: false }, { removable: true }],
        true,
      ),
    ).toEqual([
      { index: 0, part: 'label' },
      { index: 0, part: 'remove' },
      { index: 2, part: 'label' },
      { index: 3, part: 'label' },
      { index: 3, part: 'remove' },
    ]);
  });

  it('lets a chip override the list, but a disabled chip is never removable', () => {
    expect(ogeChipIsRemovable({ removable: true }, false)).toBe(true);
    expect(ogeChipIsRemovable({}, true)).toBe(true);
    expect(ogeChipIsRemovable({ removable: true, disabled: true }, true)).toBe(
      false,
    );
  });
});

describe('messages and config', () => {
  it('builds the remove label and merges the catalog', () => {
    expect(ogeChipRemoveLabel('Design', OGE_DEFAULT_CHIP_MESSAGES)).toBe(
      'Remove Design',
    );
    const config = resolveOgeChipConfig({
      size: 'sm',
      messages: { remove: 'Kaldır: {label}' },
    });
    expect(config.size).toBe('sm');
    expect(ogeChipRemoveLabel('Tasarım', config.messages)).toBe(
      'Kaldır: Tasarım',
    );
    expect(config.messages.chipList).toBe('Chips');
  });
});
