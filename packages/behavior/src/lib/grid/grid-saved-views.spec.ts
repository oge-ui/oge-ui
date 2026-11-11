import type { GridStateSnapshot } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridStateCore } from './grid-state-core';
import {
  OgeSavedViewsCore,
  ogeParseSavedViews,
  ogeSavedViewsKey,
  ogeWithSavedView,
  ogeWithoutSavedView,
} from './grid-saved-views';

const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

const SORTED: GridStateSnapshot = { sort: [{ field: 'name', dir: 'asc' }] };

describe('saved views', () => {
  it('saves, replaces by name and removes', () => {
    let views = ogeWithSavedView([], '  Open   orders ', SORTED);
    expect(views.map((v) => v.name)).toEqual(['Open orders']);
    views = ogeWithSavedView(views, 'Mine', {});
    views = ogeWithSavedView(views, 'open orders', { group: [] });
    expect(views.map((v) => v.name)).toEqual(['Mine', 'open orders']);
    expect(ogeWithSavedView(views, '   ', {})).toHaveLength(2);
    expect(ogeWithoutSavedView(views, 'MINE').map((v) => v.name)).toEqual([
      'open orders',
    ]);
  });

  it('parses stored views and drops what is not a view', () => {
    const raw = JSON.stringify([
      { name: 'Good', state: SORTED, savedAt: '2026-11-11T00:00:00.000Z' },
      { name: '', state: SORTED },
      { name: 'Bad state', state: 'nope' },
      { name: 7, state: SORTED },
      { name: 'Evil', state: { __proto__: { x: 1 } } },
    ]);
    const views = ogeParseSavedViews(raw);
    expect(views.map((v) => v.name)).toEqual(['Good', 'Evil']);
    expect(views[0].state.sort).toEqual(SORTED.sort);
    expect(ogeParseSavedViews('not json')).toEqual([]);
    expect(ogeParseSavedViews(null)).toEqual([]);
  });

  it('loads once per key from sync or async storage and writes back', async () => {
    const store = new Map<string, string>([
      [ogeSavedViewsKey('orders'), JSON.stringify([{ name: 'A', state: {} }])],
    ]);
    let key: string | undefined = 'orders';
    const seen: number[] = [];
    const core = new OgeSavedViewsCore({
      storage: () => ({
        get: (k) => Promise.resolve(store.get(k) ?? null),
        set: (k, v) => {
          store.set(k, v);
        },
      }),
      stateKey: () => key,
      onChange: (views) => seen.push(views.length),
    });
    core.load();
    await Promise.resolve();
    expect(core.list().map((v) => v.name)).toEqual(['A']);
    core.save('B', SORTED);
    expect(JSON.parse(store.get(ogeSavedViewsKey('orders'))!)).toHaveLength(2);
    expect(core.find('b')?.state).toEqual(SORTED);
    core.remove('A');
    expect(core.list().map((v) => v.name)).toEqual(['B']);
    // no stateKey: the session copy only
    key = undefined;
    core.load();
    core.save('C', {});
    expect(store.has(ogeSavedViewsKey('undefined'))).toBe(false);
    expect(seen.length).toBeGreaterThan(2);
  });
});

describe('manual filter apply mode', () => {
  it('holds edits until applied and reports them as pending', () => {
    const state = new OgeGridStateCore(rx);
    state.filter.setApplyMode('manual');
    state.filter.setRowFilter('name', {
      type: 'binary',
      field: 'name',
      op: 'contains',
      value: 'a',
    });
    state.filter.setSearchText('x');
    expect(state.filter.pending()).toBe(true);
    expect(state.loadOptions().filter).toBeUndefined();
    expect(state.loadOptions().searchText).toBeUndefined();
    state.filter.applyPending();
    expect(state.filter.pending()).toBe(false);
    expect(state.loadOptions().filter).toEqual({
      type: 'binary',
      field: 'name',
      op: 'contains',
      value: 'a',
    });
    expect(state.loadOptions().searchText).toBe('x');
    // leaving manual mode applies whatever is pending
    state.filter.setSearchText('y');
    state.filter.setApplyMode('auto');
    expect(state.loadOptions().searchText).toBe('y');
  });
});
