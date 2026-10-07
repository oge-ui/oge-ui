import { createTypeAheadBuffer } from '@oge-ui/core';
import {
  OGE_DEFAULT_LIST_VIEW_MESSAGES,
  ogeListViewActionForKey,
  ogeListViewActionShortcuts,
  ogeListViewActionsText,
  ogeListViewBuildRows,
  ogeListViewClick,
  ogeListViewFilter,
  ogeListViewIndexFromTarget,
  ogeListViewInitialActive,
  ogeListViewItemId,
  ogeListViewKeyDown,
  ogeListViewKeyOf,
  ogeListViewOffsetTree,
  ogeListViewRange,
  ogeListViewRole,
  ogeListViewScrollTarget,
  ogeListViewSelectionDiff,
  ogeListViewShouldLoadMore,
  ogeListViewSwipeAxis,
  ogeListViewSwipeOpens,
  ogeListViewSwipeReveal,
  ogeListViewSwipeTranslate,
  ogeListViewTextOf,
  ogeListViewToggle,
  ogeListViewVirtualSettings,
  ogeListViewWindow,
  ogeListViewWindowHasIndex,
  resolveOgeListViewConfig,
  type OgeListViewNavState,
} from './list-view-core';

interface City {
  id: number;
  name: string;
  country: string;
  disabled?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'İstanbul', country: 'Türkiye' },
  { id: 2, name: 'Berlin', country: 'Germany' },
  { id: 3, name: 'Ankara', country: 'Türkiye' },
  { id: 4, name: 'Munich', country: 'Germany', disabled: true },
  { id: 5, name: 'Izmir', country: 'Türkiye' },
];

const state = (
  over: Partial<OgeListViewNavState> = {},
): OgeListViewNavState => ({
  mode: 'multiple',
  keys: CITIES.map((c) => c.id),
  texts: CITIES.map((c) => c.name),
  isDisabled: (i) => !!CITIES[i].disabled,
  active: 0,
  anchor: -1,
  selected: [],
  pageSize: 2,
  ...over,
});

describe('list view core', () => {
  it('resolves config and merges messages', () => {
    const config = resolveOgeListViewConfig({
      selectionMode: 'single',
      messages: { loadMore: 'More' },
    });
    expect(config.selectionMode).toBe('single');
    expect(config.messages.loadMore).toBe('More');
    expect(config.messages.noData).toBe(OGE_DEFAULT_LIST_VIEW_MESSAGES.noData);
  });

  it('reads keys and texts from expressions and primitives', () => {
    expect(ogeListViewKeyOf(CITIES[1], 'id', 0)).toBe(2);
    expect(ogeListViewKeyOf(CITIES[1], (c) => `k${c.id}`, 0)).toBe('k2');
    expect(ogeListViewKeyOf('Rome', 'id', 3)).toBe('Rome');
    expect(ogeListViewKeyOf({}, 'id', 7)).toBe(7);
    expect(ogeListViewTextOf(CITIES[0], 'name')).toBe('İstanbul');
    expect(ogeListViewTextOf(42, undefined)).toBe('42');
  });

  it('filters locale- and accent-insensitively', () => {
    expect(
      ogeListViewFilter(CITIES, 'istanbul', { displayExpr: 'name' }).map(
        (c) => c.id,
      ),
    ).toEqual([1]);
    expect(
      ogeListViewFilter(CITIES, 'tür', { searchExpr: ['country'] }).length,
    ).toBe(3);
    expect(
      ogeListViewFilter(CITIES, 'an', {
        displayExpr: 'name',
        mode: 'startsWith',
      }),
    ).toEqual([CITIES[2]]);
    expect(ogeListViewFilter(CITIES, '  ', {})).toBe(CITIES);
  });

  it('builds grouped rows in first-appearance order', () => {
    const model = ogeListViewBuildRows(CITIES, { groupExpr: 'country' });
    expect(model.grouped).toBe(true);
    expect(
      model.rows.map((r) => (r.kind === 'group' ? `#${r.label}` : r.key)),
    ).toEqual(['#Türkiye', 1, 3, 5, '#Germany', 2, 4]);
    expect(model.items.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
    expect(model.itemRowIndex).toEqual([1, 2, 3, 5, 6]);
  });

  it('windows a virtual list and pins the header of a group it starts inside', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      group: i < 50 ? 'A' : 'B',
    }));
    const model = ogeListViewBuildRows(many, { groupExpr: 'group' });
    const settings = ogeListViewVirtualSettings({ overscan: 0 })!;
    expect(settings.itemHeight).toBe(44);
    const tree = ogeListViewOffsetTree(model.rows, settings);
    expect(tree.totalHeight).toBe(100 * 44 + 2 * 32);
    // scrolled into the middle of group A
    const win = ogeListViewWindow(model, tree, settings, 32 + 20 * 44, 220);
    expect(win.segments).toHaveLength(1);
    expect(win.segments[0].group).toBe('A');
    expect(win.segments[0].showHeader).toBe(true);
    expect(win.segments[0].items[0].key).toBe(20);
    // the slice moved up by the pinned header's height
    expect(win.offsetY).toBe(32 + 20 * 44 - 32);
    // a window spanning both groups gets two segments
    const both = ogeListViewWindow(model, tree, settings, 32 + 48 * 44, 220);
    expect(both.segments.map((s) => s.group)).toEqual(['A', 'B']);
    // not virtualized: everything, no translate
    const all = ogeListViewWindow(model, null, null, 0, 0);
    expect(all.segments.map((s) => s.items.length)).toEqual([50, 50]);
    expect(ogeListViewVirtualSettings(false)).toBeNull();
    // which items a window renders (by item index, not row index)
    expect(ogeListViewWindowHasIndex(win, 20)).toBe(true);
    expect(ogeListViewWindowHasIndex(win, 0)).toBe(false);
    expect(ogeListViewWindowHasIndex(all, 99)).toBe(true);
    expect(ogeListViewWindowHasIndex(all, -1)).toBe(false);
  });

  it('computes scroll targets with a sticky inset', () => {
    expect(ogeListViewScrollTarget(100, 44, 0, 200)).toBeNull();
    expect(ogeListViewScrollTarget(300, 44, 0, 200)).toBe(144);
    expect(ogeListViewScrollTarget(100, 44, 120, 200, 32)).toBe(68);
    expect(ogeListViewShouldLoadMore(800, 200, 1100)).toBe(true);
    expect(ogeListViewShouldLoadMore(100, 200, 1100)).toBe(false);
  });

  it('decides the role and DOM ids', () => {
    expect(ogeListViewRole('none')).toBe('list');
    expect(ogeListViewRole('single')).toBe('listbox');
    expect(ogeListViewItemId('lv1', 'a b/c')).toBe('lv1-item-a_b_c');
  });

  it('toggles and ranges selection, skipping disabled items', () => {
    expect(ogeListViewToggle([1], 2, 'single')).toEqual([2]);
    expect(ogeListViewToggle([1], 1, 'single')).toEqual([1]);
    expect(ogeListViewToggle([1, 2], 1, 'multiple')).toEqual([2]);
    const keys = CITIES.map((c) => c.id);
    expect(ogeListViewRange(keys, 4, 1, (i) => i === 3)).toEqual([2, 3, 5]);
    expect(ogeListViewSelectionDiff([1, 2], [2, 3])).toEqual({
      added: [3],
      removed: [1],
    });
  });

  it('picks the first-paint active item', () => {
    const keys = [1, 2, 3];
    expect(ogeListViewInitialActive(keys, [3], () => false, -1)).toBe(2);
    expect(ogeListViewInitialActive(keys, [], (i) => i === 0, -1)).toBe(1);
    expect(ogeListViewInitialActive(keys, [3], () => false, 0)).toBe(0);
  });

  it('moves with arrows, Home/End and pages without wrapping', () => {
    expect(ogeListViewKeyDown(state(), { key: 'ArrowDown' }).active).toBe(1);
    expect(
      ogeListViewKeyDown(state({ active: 2 }), { key: 'ArrowDown' }).active,
    ).toBe(4);
    expect(
      ogeListViewKeyDown(state({ active: 4 }), { key: 'ArrowDown' }).active,
    ).toBe(4);
    expect(
      ogeListViewKeyDown(state({ active: 0 }), { key: 'ArrowUp' }).active,
    ).toBe(0);
    expect(
      ogeListViewKeyDown(state({ active: 2 }), { key: 'Home' }).active,
    ).toBe(0);
    expect(ogeListViewKeyDown(state(), { key: 'End' }).active).toBe(4);
    expect(ogeListViewKeyDown(state(), { key: 'PageDown' }).active).toBe(2);
    expect(ogeListViewKeyDown(state(), { key: 'Tab' }).handled).toBe(false);
  });

  it('runs the multiple-selection keys', () => {
    expect(ogeListViewKeyDown(state(), { key: ' ' }).selected).toEqual([1]);
    const ext = ogeListViewKeyDown(state(), {
      key: 'ArrowDown',
      shiftKey: true,
    });
    expect(ext.active).toBe(1);
    expect(ext.selected).toEqual([1, 2]);
    const range = ogeListViewKeyDown(state({ active: 4, anchor: 1 }), {
      key: ' ',
      shiftKey: true,
    });
    expect(range.selected).toEqual([2, 3, 5]);
    const all = ogeListViewKeyDown(state(), { key: 'a', ctrlKey: true });
    expect(all.selected).toEqual([1, 2, 3, 5]);
    expect(all.selectAll).toBe(true);
    const none = ogeListViewKeyDown(state({ selected: [1, 2, 3, 5] }), {
      key: 'A',
      metaKey: true,
    });
    expect(none.selected).toEqual([]);
    const toEnd = ogeListViewKeyDown(state({ active: 2 }), {
      key: 'End',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(toEnd.selected).toEqual([3, 5]);
  });

  it('selects on Enter in single mode and activates', () => {
    const result = ogeListViewKeyDown(state({ mode: 'single', active: 1 }), {
      key: 'Enter',
    });
    expect(result.activate).toBe(true);
    expect(result.selected).toEqual([2]);
    const plain = ogeListViewKeyDown(state({ mode: 'none' }), { key: ' ' });
    expect(plain.handled).toBe(false);
  });

  it('type-aheads locale-insensitively', () => {
    const typeAhead = createTypeAheadBuffer();
    const result = ogeListViewKeyDown(state({ typeAhead }), { key: 'i' });
    // from İstanbul (0), the next "i" match is Izmir (4)
    expect(result.active).toBe(4);
  });

  it('matches action shortcuts', () => {
    const actions = [
      { key: 'delete', label: 'Delete', shortcut: 'Delete' },
      { key: 'archive', label: 'Archive', shortcut: 'Shift+A' },
      { key: 'pin', label: 'Pin' },
    ];
    expect(ogeListViewActionShortcuts(actions)).toBe('Delete Shift+A');
    expect(ogeListViewActionShortcuts([{ key: 'x', label: 'X' }])).toBeNull();
    expect(
      ogeListViewActionForKey({ key: 'A', shiftKey: true }, actions)?.key,
    ).toBe('archive');
    expect(ogeListViewActionForKey({ key: 'a' }, actions)).toBeNull();
    expect(
      ogeListViewKeyDown(state({ actions }), { key: 'Delete' }).action?.key,
    ).toBe('delete');
    expect(
      ogeListViewActionsText(actions, OGE_DEFAULT_LIST_VIEW_MESSAGES),
    ).toBe('Actions: Delete (Delete), Archive (Shift+A), Pin');
  });

  it('reduces clicks', () => {
    expect(ogeListViewClick(state({ mode: 'none' }), 2)).toMatchObject({
      active: 2,
      activate: true,
    });
    expect(ogeListViewClick(state({ selected: [1] }), 2).selected).toEqual([
      1, 3,
    ]);
    expect(
      ogeListViewClick(state({ anchor: 0 }), 2, { shiftKey: true }).selected,
    ).toEqual([1, 2, 3]);
    expect(ogeListViewClick(state(), 3).handled).toBe(false);
  });

  it('computes swipe geometry, mirrored in RTL', () => {
    expect(ogeListViewSwipeReveal(-50, 120, false)).toBe(50);
    expect(ogeListViewSwipeReveal(50, 120, false)).toBe(0);
    expect(ogeListViewSwipeReveal(50, 120, true)).toBe(50);
    expect(ogeListViewSwipeReveal(-300, 120, false)).toBe(120);
    expect(ogeListViewSwipeReveal(40, 120, false, true)).toBe(80);
    expect(ogeListViewSwipeTranslate(50, false)).toBe(-50);
    expect(ogeListViewSwipeTranslate(50, true)).toBe(50);
    expect(ogeListViewSwipeOpens(60, 120)).toBe(true);
    expect(ogeListViewSwipeOpens(59, 120)).toBe(false);
    expect(ogeListViewSwipeAxis(2, 3)).toBeNull();
    expect(ogeListViewSwipeAxis(20, 3)).toBe(true);
    expect(ogeListViewSwipeAxis(2, 30)).toBe(false);
  });

  it('resolves the item index from an event target', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div data-oge-list-index="3"><span>x</span></div>';
    const span = host.querySelector('span');
    expect(ogeListViewIndexFromTarget(span, host)).toBe(3);
    expect(ogeListViewIndexFromTarget(host, host)).toBe(-1);
  });
});
