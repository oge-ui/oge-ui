import {
  OGE_DEFAULT_DATA_VIEW_MESSAGES,
  ogeDataViewClampPage,
  ogeDataViewCompare,
  ogeDataViewDisplayText,
  ogeDataViewSearchText,
  ogeDataViewField,
  ogeDataViewInfoText,
  ogeDataViewIsEllipsis,
  ogeDataViewKey,
  ogeDataViewKeyIntent,
  ogeDataViewMatches,
  ogeDataViewMeasureColumns,
  ogeDataViewPageCount,
  ogeDataViewPageItems,
  ogeDataViewPagerWindow,
  ogeDataViewProcess,
  ogeDataViewRole,
  ogeDataViewStyleVars,
  ogeDataViewTabStop,
  ogeDataViewToggleSelection,
  resolveOgeDataViewConfig,
} from './data-view-core';

interface Row {
  id: number;
  name: string;
  city: { name: string };
  price?: number | null;
  added?: Date;
}

const ROWS: Row[] = [
  { id: 1, name: 'Item 10', city: { name: 'İstanbul' }, price: 30 },
  { id: 2, name: 'item 9', city: { name: 'Ankara' }, price: null },
  { id: 3, name: 'Éclair', city: { name: 'Paris' }, price: 5 },
  { id: 4, name: 'apple', city: { name: 'Izmir' }, price: 30 },
];

describe('data-view-core', () => {
  it('merges config messages one level deep', () => {
    const config = resolveOgeDataViewConfig({
      layout: 'list',
      messages: { search: 'Ara' },
    });
    expect(config.layout).toBe('list');
    expect(config.messages.search).toBe('Ara');
    expect(config.messages.noData).toBe(OGE_DEFAULT_DATA_VIEW_MESSAGES.noData);
  });

  it('reads fields, dot paths and keys', () => {
    expect(ogeDataViewField(ROWS[0], 'city.name')).toBe('İstanbul');
    expect(ogeDataViewField(null, 'a')).toBeUndefined();
    expect(ogeDataViewKey(ROWS[2], 'id', 7)).toBe(3);
    expect(ogeDataViewKey(ROWS[2], (r) => `k${r.id}`, 7)).toBe('k3');
    expect(ogeDataViewKey({ nope: true }, 'id', 7)).toBe(7);
  });

  it('falls back for display and search text', () => {
    expect(ogeDataViewDisplayText({ name: 'A', title: 'T' })).toBe('T');
    expect(ogeDataViewDisplayText(ROWS[0], 'city.name')).toBe('İstanbul');
    expect(ogeDataViewDisplayText(ROWS[0], (r) => r.name)).toBe('Item 10');
    expect(ogeDataViewDisplayText(5)).toBe('5');
    expect(ogeDataViewSearchText({ a: 'x', b: 2, c: { d: 1 } }, null)).toBe(
      'x 2',
    );
    expect(ogeDataViewMatches(ROWS[1], 'item', undefined)).toBe(true);
  });

  it('matches every word, folded', () => {
    expect(
      ogeDataViewMatches(ROWS[0], 'istanbul item', ['name', 'city.name']),
    ).toBe(true);
    expect(ogeDataViewMatches(ROWS[2], 'eclair', 'name')).toBe(true);
    expect(ogeDataViewMatches(ROWS[2], 'eclair paris x', ['name'])).toBe(false);
    expect(ogeDataViewMatches(ROWS[3], '  ', 'name')).toBe(true);
    expect(ogeDataViewMatches(ROWS[3], 'APP', (r) => r.name)).toBe(true);
  });

  it('sorts numerically, by collator, empty values last', () => {
    const asc = { field: 'price', direction: 'asc' } as const;
    expect(ogeDataViewCompare(ROWS[2], ROWS[0], asc)).toBeLessThan(0);
    expect(ogeDataViewCompare(ROWS[1], ROWS[0], asc)).toBeGreaterThan(0);
    expect(
      ogeDataViewCompare(ROWS[1], ROWS[0], {
        field: 'price',
        direction: 'desc',
      }),
    ).toBeGreaterThan(0);
    const byName = ogeDataViewProcess(ROWS, {
      sort: { field: 'name', direction: 'asc' },
      locale: 'en',
    }).map((r) => r.id);
    // numeric collation: "item 9" before "Item 10"
    expect(byName).toEqual([4, 3, 2, 1]);
    const dates = [
      { added: new Date(2026, 1, 1) },
      { added: new Date(2025, 1, 1) },
    ];
    expect(
      ogeDataViewCompare(dates[0], dates[1], {
        field: 'added',
        direction: 'asc',
      }),
    ).toBeGreaterThan(0);
  });

  it('runs filter → search → stable sort and keeps identity when idle', () => {
    expect(ogeDataViewProcess(ROWS, {})).toBe(ROWS);
    const result = ogeDataViewProcess(ROWS, {
      filter: (r) => r.id !== 3,
      searchValue: 'e',
      searchExpr: 'name',
      sort: { field: 'price', direction: 'desc' },
    });
    expect(result.map((r) => r.id)).toEqual([1, 4, 2]);
  });

  it('pages', () => {
    expect(ogeDataViewPageCount(0, 10)).toBe(1);
    expect(ogeDataViewPageCount(21, 10)).toBe(3);
    expect(ogeDataViewPageCount(21, 0)).toBe(1);
    expect(ogeDataViewClampPage(9, 3)).toBe(2);
    expect(ogeDataViewClampPage(-2, 3)).toBe(0);
    expect(ogeDataViewClampPage(Number.NaN, 3)).toBe(0);
    expect(ogeDataViewPageItems(ROWS, 1, 3).map((r) => r.id)).toEqual([4]);
    expect(ogeDataViewPageItems(ROWS, 1, 0)).toBe(ROWS);
    const window = ogeDataViewPagerWindow(5, 20);
    expect(window).toHaveLength(7);
    expect(window.some(ogeDataViewIsEllipsis)).toBe(true);
    expect(
      ogeDataViewInfoText(OGE_DEFAULT_DATA_VIEW_MESSAGES, {
        pageIndex: 1,
        pageSize: 10,
        itemCount: 25,
      }),
    ).toBe('11–20 of 25');
    expect(
      ogeDataViewInfoText(OGE_DEFAULT_DATA_VIEW_MESSAGES, {
        pageIndex: 0,
        pageSize: 0,
        itemCount: 4,
      }),
    ).toBe('1–4 of 4');
  });

  it('decides role, selection and tab stop', () => {
    expect(ogeDataViewRole('none')).toBe('list');
    expect(ogeDataViewRole('single')).toBe('listbox');
    expect(ogeDataViewToggleSelection('single', [1], 2)).toEqual([2]);
    expect(ogeDataViewToggleSelection('single', [2], 2)).toEqual([]);
    expect(ogeDataViewToggleSelection('multiple', [1], 2)).toEqual([1, 2]);
    expect(ogeDataViewToggleSelection('multiple', [1, 2], 1)).toEqual([2]);
    expect(ogeDataViewToggleSelection('none', [1], 2)).toEqual([1]);
    expect(ogeDataViewTabStop([], 0, [])).toBe(-1);
    expect(ogeDataViewTabStop(['a', 'b', 'c'], -1, ['c'])).toBe(2);
    expect(ogeDataViewTabStop(['a', 'b'], 1, ['a'])).toBe(1);
    expect(ogeDataViewTabStop(['a', 'b'], 5, [])).toBe(0);
  });

  it('maps keys in two dimensions, mirrored in RTL', () => {
    const state = {
      index: 4,
      count: 10,
      columns: 3,
      rtl: false,
      multiple: true,
    };
    expect(ogeDataViewKeyIntent({ key: 'ArrowRight' }, state)).toEqual({
      type: 'move',
      index: 5,
    });
    expect(
      ogeDataViewKeyIntent({ key: 'ArrowRight' }, { ...state, rtl: true }),
    ).toEqual({
      type: 'move',
      index: 3,
    });
    expect(ogeDataViewKeyIntent({ key: 'ArrowDown' }, state)).toEqual({
      type: 'move',
      index: 7,
    });
    expect(
      ogeDataViewKeyIntent({ key: 'ArrowDown' }, { ...state, index: 8 }),
    ).toEqual({
      type: 'move',
      index: 8,
    });
    expect(
      ogeDataViewKeyIntent({ key: 'ArrowUp' }, { ...state, index: 1 }),
    ).toEqual({
      type: 'move',
      index: 1,
    });
    expect(ogeDataViewKeyIntent({ key: 'End' }, state)).toEqual({
      type: 'move',
      index: 9,
    });
    expect(ogeDataViewKeyIntent({ key: 'Home' }, state)).toEqual({
      type: 'move',
      index: 0,
    });
    expect(ogeDataViewKeyIntent({ key: 'PageDown' }, state)).toEqual({
      type: 'page',
      delta: 1,
    });
    expect(ogeDataViewKeyIntent({ key: ' ' }, state)).toEqual({
      type: 'toggle',
    });
    expect(ogeDataViewKeyIntent({ key: 'a', ctrlKey: true }, state)).toEqual({
      type: 'selectAll',
    });
    expect(
      ogeDataViewKeyIntent(
        { key: 'a', ctrlKey: true },
        { ...state, multiple: false },
      ),
    ).toBeNull();
    expect(ogeDataViewKeyIntent({ key: 'x' }, state)).toBeNull();
  });

  it('measures columns, 1 when unmeasured', () => {
    expect(ogeDataViewMeasureColumns([])).toBe(1);
    const el = (top: number) =>
      ({ offsetWidth: 100, offsetTop: top }) as unknown as HTMLElement;
    expect(ogeDataViewMeasureColumns([el(0), el(0), el(0), el(120)])).toBe(3);
    expect(ogeDataViewMeasureColumns([document.createElement('div')])).toBe(1);
  });

  it('writes the layout custom properties', () => {
    expect(
      ogeDataViewStyleVars({ minItemWidth: 200, columns: 3, gap: 12 }),
    ).toEqual({
      '--oge-data-view-min-item-width': '200px',
      '--oge-data-view-columns': '3',
      '--oge-data-view-gap': '12px',
    });
    expect(ogeDataViewStyleVars({ minItemWidth: 0 })).toEqual({
      '--oge-data-view-min-item-width': '1px',
    });
  });
});
