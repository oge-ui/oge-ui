import { describe, expect, it } from 'vitest';
import {
  OgeMenuTypeAhead,
  menuEdgeIndex,
  menuEnabledIndexes,
  menuMoveIndex,
} from './menu-nav';
import type { OgeMenuItem } from './menu-types';

const items: readonly OgeMenuItem[] = [
  { text: 'New' },
  { text: 'Open' },
  { separator: true, text: '' },
  { text: 'Duplicate', disabled: true },
  { text: 'Delete' },
  { text: 'Details' },
];

describe('menuEnabledIndexes', () => {
  it('skips separators and disabled rows', () => {
    expect(menuEnabledIndexes(items)).toEqual([0, 1, 4, 5]);
  });
});

describe('menuMoveIndex', () => {
  it('wraps forward over separators and disabled rows', () => {
    expect(menuMoveIndex(items, 1, 1)).toBe(4);
    expect(menuMoveIndex(items, 5, 1)).toBe(0);
  });

  it('wraps backward', () => {
    expect(menuMoveIndex(items, 0, -1)).toBe(5);
    expect(menuMoveIndex(items, 4, -1)).toBe(1);
  });

  it('enters from no active row at the pattern edges', () => {
    expect(menuMoveIndex(items, -1, 1)).toBe(0);
    expect(menuMoveIndex(items, -1, -1)).toBe(5);
  });

  it('returns -1 when nothing is enabled', () => {
    expect(menuMoveIndex([{ text: 'x', disabled: true }], -1, 1)).toBe(-1);
  });
});

describe('menuEdgeIndex', () => {
  it('finds the first and last enabled rows', () => {
    expect(menuEdgeIndex(items, 'first')).toBe(0);
    expect(menuEdgeIndex(items, 'last')).toBe(5);
  });
});

describe('OgeMenuTypeAhead', () => {
  const machine = () => new OgeMenuTypeAhead(() => 500);

  it('a growing distinct buffer keeps matching the current item', () => {
    const t = machine();
    expect(t.next('d', items, -1, 0)).toBe(4); // Delete (Duplicate disabled)
    expect(t.next('e', items, 4, 100)).toBe(4); // "de" still matches Delete
    expect(t.next('t', items, 4, 200)).toBe(5); // "det" → Details
  });

  it('a repeated character cycles through matches', () => {
    const t = machine();
    expect(t.next('d', items, -1, 0)).toBe(4); // Delete
    expect(t.next('d', items, 4, 100)).toBe(5); // Details
    expect(t.next('d', items, 5, 200)).toBe(4); // wraps back (Duplicate disabled)
  });

  it('the buffer expires after the timeout', () => {
    const t = machine();
    expect(t.next('o', items, -1, 0)).toBe(1); // Open
    // "n" 600ms later is a fresh buffer, not "on"
    expect(t.next('n', items, 1, 600)).toBe(0); // New
  });

  it('returns -1 when nothing matches and never lands on disabled rows', () => {
    const t = machine();
    expect(t.next('z', items, -1, 0)).toBe(-1);
    const u = machine();
    expect(u.next('u', items, -1, 0)).toBe(-1); // only "Duplicate" (disabled)
  });
});
