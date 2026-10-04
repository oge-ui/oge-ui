import {
  applySelectAll,
  applyToggleGroupPress,
  choiceIncludes,
  selectAllState,
  toggleChoiceValue,
  toggleGroupSelectedIndices,
} from './choice-group-core';

describe('choice group core', () => {
  const order = ['a', 'b', 'c', 'd'];

  describe('toggleChoiceValue', () => {
    it('keeps the items order, not the click order', () => {
      let value: unknown[] = [];
      value = toggleChoiceValue(order, value, 'c', true);
      value = toggleChoiceValue(order, value, 'a', true);
      expect(value).toEqual(['a', 'c']);
    });

    it('unchecks a value', () => {
      expect(toggleChoiceValue(order, ['a', 'b'], 'a', false)).toEqual(['b']);
    });

    it('keeps values no item produces, after the known ones', () => {
      expect(toggleChoiceValue(order, ['zz', 'b'], 'a', true)).toEqual([
        'a',
        'b',
        'zz',
      ]);
      expect(toggleChoiceValue(order, ['b'], 'zz', true)).toEqual(['b', 'zz']);
      expect(toggleChoiceValue(order, ['b', 'zz'], 'zz', false)).toEqual(['b']);
    });

    it('uses Object.is equality (NaN matches, 0 / -0 do not)', () => {
      expect(choiceIncludes([Number.NaN], Number.NaN)).toBe(true);
      expect(choiceIncludes([0], -0)).toBe(false);
    });
  });

  describe('select all', () => {
    it('reports none / some / all over the selectable values', () => {
      expect(selectAllState(['a', 'b'], [])).toBe(false);
      expect(selectAllState(['a', 'b'], ['a'])).toBeNull();
      expect(selectAllState(['a', 'b'], ['b', 'a'])).toBe(true);
      expect(selectAllState([], ['a'])).toBe(false);
    });

    it('ignores disabled values when deciding "all"', () => {
      // 'c' is disabled and unchecked — the selectable set is complete
      expect(selectAllState(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('checks every selectable value and leaves disabled ones alone', () => {
      expect(applySelectAll(order, ['a', 'b', 'd'], ['c'], true)).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
      expect(applySelectAll(order, ['a', 'b'], ['a', 'c'], false)).toEqual([
        'c',
      ]);
    });
  });

  describe('toggle group', () => {
    const values = ['left', 'center', 'right'];

    it('maps a scalar or array value to item indices', () => {
      expect(toggleGroupSelectedIndices('single', values, 'right')).toEqual([
        2,
      ]);
      expect(toggleGroupSelectedIndices('single', values, null)).toEqual([]);
      expect(
        toggleGroupSelectedIndices('multiple', values, ['right', 'left']),
      ).toEqual([0, 2]);
      expect(toggleGroupSelectedIndices('multiple', values, 'left')).toEqual(
        [],
      );
    });

    it('single: selects, and never unselects the active item', () => {
      expect(applyToggleGroupPress('single', values, null, 1)).toEqual({
        value: 'center',
        addedValues: ['center'],
        removedValues: [],
      });
      expect(applyToggleGroupPress('single', values, 'left', 2)).toEqual({
        value: 'right',
        addedValues: ['right'],
        removedValues: ['left'],
      });
      expect(applyToggleGroupPress('single', values, 'left', 0)).toBeNull();
    });

    it('multiple: toggles in items order', () => {
      const first = applyToggleGroupPress('multiple', values, [], 2);
      expect(first?.value).toEqual(['right']);
      const second = applyToggleGroupPress('multiple', values, first?.value, 0);
      expect(second).toEqual({
        value: ['left', 'right'],
        addedValues: ['left'],
        removedValues: [],
      });
      expect(
        applyToggleGroupPress('multiple', values, ['left', 'right'], 0),
      ).toEqual({ value: ['right'], addedValues: [], removedValues: ['left'] });
    });

    it('rejects an out-of-range index', () => {
      expect(applyToggleGroupPress('single', values, null, 5)).toBeNull();
    });
  });
});
