import { describe, expect, it } from 'vitest';
import {
  applyMenuItemCheck,
  isMenuItemNavigable,
  menuItemAriaChecked,
  menuItemIndicator,
  menuItemKeepsOpen,
  menuItemNextChecked,
  menuItemRole,
  menuItemSegments,
  menuRetainedActiveIndex,
} from './menu-item-state';
import { menuEdgeIndex, menuMoveIndex, OgeMenuTypeAhead } from './menu-nav';
import type { OgeMenuItem } from './menu-types';

describe('menu item roles', () => {
  it('keeps the historical checked-only rule when no type is set', () => {
    expect(menuItemRole({ text: 'A' })).toBe('menuitem');
    expect(menuItemRole({ text: 'A', checked: false })).toBe(
      'menuitemcheckbox',
    );
    expect(menuItemAriaChecked({ text: 'A', checked: true })).toBe('true');
    expect(menuItemAriaChecked({ text: 'A' })).toBeNull();
  });

  it('maps checkbox and radio types, defaulting aria-checked to false', () => {
    expect(menuItemRole({ text: 'A', type: 'checkbox' })).toBe(
      'menuitemcheckbox',
    );
    expect(menuItemRole({ text: 'A', type: 'radio' })).toBe('menuitemradio');
    expect(menuItemAriaChecked({ text: 'A', type: 'radio' })).toBe('false');
    expect(menuItemIndicator({ text: 'A', type: 'radio' })).toBe('radio');
    expect(menuItemIndicator({ text: 'A', type: 'checkbox' })).toBe('check');
    expect(menuItemIndicator({ text: 'A' })).toBeNull();
  });

  it('an explicit normal type ignores checked; submenu parents stay menuitem', () => {
    expect(menuItemRole({ text: 'A', type: 'normal', checked: true })).toBe(
      'menuitem',
    );
    expect(
      menuItemRole({ text: 'A', type: 'radio', items: [{ text: 'B' }] }),
    ).toBe('menuitem');
  });

  it('computes the next checked state', () => {
    expect(menuItemNextChecked({ text: 'A', type: 'checkbox' })).toBe(true);
    expect(
      menuItemNextChecked({ text: 'A', type: 'checkbox', checked: true }),
    ).toBe(false);
    expect(
      menuItemNextChecked({ text: 'A', type: 'radio', checked: true }),
    ).toBe(true);
    expect(menuItemNextChecked({ text: 'A' })).toBeUndefined();
  });

  it('keeps check rows open on Space only, keepOpen always', () => {
    const check: OgeMenuItem = { text: 'A', type: 'checkbox' };
    expect(menuItemKeepsOpen(check, 'space')).toBe(true);
    expect(menuItemKeepsOpen(check, 'enter')).toBe(false);
    expect(menuItemKeepsOpen(check, 'pointer')).toBe(false);
    // the legacy checked-only row keeps its old close-on-activate behaviour
    expect(menuItemKeepsOpen({ text: 'A', checked: true }, 'space')).toBe(
      false,
    );
    expect(menuItemKeepsOpen({ text: 'A', keepOpen: true }, 'pointer')).toBe(
      true,
    );
  });
});

describe('navigation skips headers', () => {
  const items: OgeMenuItem[] = [
    { text: 'View', type: 'header' },
    { text: 'Small', type: 'radio' },
    { text: 'Large', type: 'radio' },
    { text: '', separator: true },
    { text: 'Sort', type: 'header' },
    { text: 'Name', type: 'radio', group: 'sort' },
  ];

  it('is never navigable', () => {
    expect(isMenuItemNavigable(items[0])).toBe(false);
    expect(isMenuItemNavigable(items[1])).toBe(true);
    expect(menuEdgeIndex(items, 'first')).toBe(1);
    expect(menuMoveIndex(items, 2, 1)).toBe(5);
    expect(menuMoveIndex(items, 1, -1)).toBe(5);
  });

  it('is ignored by type-ahead', () => {
    const typeAhead = new OgeMenuTypeAhead(() => 500);
    // "S" matches "Small" (1) — never the "Sort" header (4)
    expect(typeAhead.next('s', items, 2, 0)).toBe(1);
    typeAhead.reset();
    expect(typeAhead.next('v', items, -1, 0)).toBe(-1);
  });
});

describe('applyMenuItemCheck', () => {
  it('toggles a checkbox immutably and keeps untouched references', () => {
    const a: OgeMenuItem = { text: 'A', type: 'checkbox' };
    const b: OgeMenuItem = { text: 'B' };
    const next = applyMenuItemCheck([a, b], a);
    expect(next[0].checked).toBe(true);
    expect(next[1]).toBe(b);
    expect(a.checked).toBeUndefined();
  });

  it('checks a radio and unchecks its group siblings only', () => {
    const items: OgeMenuItem[] = [
      { text: 'S', type: 'radio', group: 'size', checked: true },
      { text: 'L', type: 'radio', group: 'size' },
      { text: 'Name', type: 'radio', group: 'sort', checked: true },
    ];
    const next = applyMenuItemCheck(items, items[1]);
    expect(next.map((i) => !!i.checked)).toEqual([false, true, true]);
    expect(next[2]).toBe(items[2]);
  });

  it('re-activating a checked radio returns the same array', () => {
    const items: OgeMenuItem[] = [{ text: 'S', type: 'radio', checked: true }];
    expect(applyMenuItemCheck(items, items[0])).toBe(items);
  });

  it('finds the target at any depth', () => {
    const leaf: OgeMenuItem = { text: 'Grid', type: 'checkbox' };
    const other: OgeMenuItem = { text: 'Other', items: [{ text: 'X' }] };
    const items: OgeMenuItem[] = [other, { text: 'View', items: [leaf] }];
    const next = applyMenuItemCheck(items, leaf);
    expect(next[0]).toBe(other);
    expect(next[1].items?.[0].checked).toBe(true);
  });

  it('ignores plain rows and unknown targets', () => {
    const items: OgeMenuItem[] = [{ text: 'A' }];
    expect(applyMenuItemCheck(items, items[0])).toBe(items);
    expect(applyMenuItemCheck(items, { text: 'Z' })).toBe(items);
  });
});

describe('menuItemSegments', () => {
  it('keeps a plain menu as loose runs', () => {
    const items: OgeMenuItem[] = [
      { text: 'A' },
      { text: '', separator: true },
      { text: 'B', checked: true },
    ];
    expect(menuItemSegments(items)).toEqual([
      { group: false, headerIndex: -1, indexes: [0, 1, 2] },
    ]);
  });

  it('groups a headed section up to the next separator or header', () => {
    const items: OgeMenuItem[] = [
      { text: 'Open' },
      { text: 'View', type: 'header' },
      { text: 'Grid', type: 'checkbox' },
      { text: 'List', type: 'checkbox' },
      { text: '', separator: true },
      { text: 'Close' },
    ];
    expect(menuItemSegments(items)).toEqual([
      { group: false, headerIndex: -1, indexes: [0] },
      { group: true, headerIndex: 1, indexes: [2, 3] },
      { group: false, headerIndex: -1, indexes: [4, 5] },
    ]);
  });

  it('groups consecutive radios of one group outside headed sections', () => {
    const items: OgeMenuItem[] = [
      { text: 'S', type: 'radio', group: 'size' },
      { text: 'L', type: 'radio', group: 'size' },
      { text: 'Name', type: 'radio', group: 'sort' },
      { text: 'Refresh' },
    ];
    expect(menuItemSegments(items)).toEqual([
      { group: true, headerIndex: -1, indexes: [0, 1] },
      { group: true, headerIndex: -1, indexes: [2] },
      { group: false, headerIndex: -1, indexes: [3] },
    ]);
  });
});

describe('menuRetainedActiveIndex', () => {
  it('keeps the active row across a same-rows re-render', () => {
    const before: OgeMenuItem[] = [{ text: 'A', type: 'checkbox' }];
    const after: OgeMenuItem[] = [
      { text: 'A', type: 'checkbox', checked: true },
    ];
    expect(menuRetainedActiveIndex(before, after, 0)).toBe(0);
  });

  it('resets for different rows', () => {
    expect(menuRetainedActiveIndex([{ text: 'A' }], [{ text: 'B' }], 0)).toBe(
      -1,
    );
    expect(
      menuRetainedActiveIndex(
        [{ text: 'A' }],
        [{ text: 'A' }, { text: 'B' }],
        0,
      ),
    ).toBe(-1);
    expect(menuRetainedActiveIndex([{ text: 'A' }], [{ text: 'A' }], -1)).toBe(
      -1,
    );
  });
});
