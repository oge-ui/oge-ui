import { describe, expect, it, vi } from 'vitest';
import {
  ogeAllowDropDownClose,
  ogeAllowDropDownOpen,
  ogeCanSelectMore,
  ogeChipOverflow,
  ogeSelectAllState,
  ogeToggleAllValues,
} from './select-helpers';

interface Row {
  id: number;
  off?: boolean;
}

const rows: Row[] = [{ id: 1 }, { id: 2 }, { id: 3, off: true }, { id: 4 }];
const valueOf = (row: Row) => row.id;
const isDisabled = (row: Row) => row.off === true;

describe('cancelable dropdown pre-events', () => {
  it('proceeds when nobody listens or nobody cancels', () => {
    expect(ogeAllowDropDownOpen(undefined)).toBe(true);
    expect(ogeAllowDropDownOpen(() => undefined)).toBe(true);
  });

  it('vetoes when a listener sets cancel, and carries the close reason', () => {
    expect(ogeAllowDropDownOpen((event) => (event.cancel = true))).toBe(false);
    const listener = vi.fn((event: { cancel: boolean }) => {
      event.cancel = true;
    });
    expect(ogeAllowDropDownClose(listener, 'outside')).toBe(false);
    expect(listener).toHaveBeenCalledWith({ reason: 'outside', cancel: true });
  });
});

describe('select all', () => {
  it('reads false / mixed / true over the enabled items', () => {
    const selected = (ids: number[]) => (row: Row) => ids.includes(row.id);
    expect(ogeSelectAllState(rows, selected([]), isDisabled)).toBe(false);
    expect(ogeSelectAllState(rows, selected([1]), isDisabled)).toBe('mixed');
    // the disabled row does not hold the state back
    expect(ogeSelectAllState(rows, selected([1, 2, 4]), isDisabled)).toBe(true);
    expect(ogeSelectAllState([], selected([]), isDisabled)).toBe(false);
  });

  it('selects every enabled item in list order, keeping prior values', () => {
    expect(ogeToggleAllValues([9], rows, valueOf, isDisabled, true)).toEqual([
      9, 1, 2, 4,
    ]);
  });

  it('caps the selection at maxSelected', () => {
    expect(ogeToggleAllValues([], rows, valueOf, isDisabled, true, 2)).toEqual([
      1, 2,
    ]);
  });

  it('clearing removes only the visible enabled items', () => {
    expect(
      ogeToggleAllValues([9, 1, 3, 4], rows, valueOf, isDisabled, false),
    ).toEqual([9, 3]);
  });

  it('ogeCanSelectMore honours the cap', () => {
    expect(ogeCanSelectMore(3, undefined)).toBe(true);
    expect(ogeCanSelectMore(2, 3)).toBe(true);
    expect(ogeCanSelectMore(3, 3)).toBe(false);
  });
});

describe('ogeChipOverflow', () => {
  it('folds the chips past the limit', () => {
    expect(ogeChipOverflow(5, undefined)).toEqual({ shown: 5, hidden: 0 });
    expect(ogeChipOverflow(2, 3)).toEqual({ shown: 2, hidden: 0 });
    expect(ogeChipOverflow(5, 3)).toEqual({ shown: 3, hidden: 2 });
    expect(ogeChipOverflow(5, 0)).toEqual({ shown: 0, hidden: 5 });
  });
});
