import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridStateCore, loadOptionsEqual } from './grid-state-core';

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

describe('OgeGridStateCore', () => {
  it('adds the slices up to one LoadOptions', () => {
    const state = new OgeGridStateCore(rx);
    state.paging.configure(10);
    state.paging.goTo(2);
    state.sort.toggle('name');
    state.filter.setRowFilter('city', {
      type: 'binary',
      field: 'city',
      op: 'contains',
      value: 'a',
    });
    state.filter.setSearchText(' x ');
    expect(state.loadOptions()).toEqual({
      sort: [{ field: 'name', dir: 'asc' }],
      skip: 20,
      take: 10,
      filter: { type: 'binary', field: 'city', op: 'contains', value: 'a' },
      searchText: 'x',
      requireTotalCount: true,
    });
  });

  it('drops the paging window while grouped', () => {
    const state = new OgeGridStateCore(rx);
    state.paging.configure(10);
    state.grouping.groupBy('city');
    const options = state.loadOptions();
    expect(options.skip).toBeUndefined();
    expect(options.group).toEqual([{ field: 'city', dir: 'asc' }]);
  });

  it('reconcile: the first call is the baseline, a filter change resets the page', () => {
    const state = new OgeGridStateCore(rx);
    state.paging.configure(10);
    state.paging.goTo(3);
    expect(state.reconcile()).toBe(false);
    expect(state.paging.pageIndex()).toBe(3);
    state.filter.setSearchText('q');
    expect(state.reconcile()).toBe(true);
    expect(state.paging.pageIndex()).toBe(0);
    // idempotent once settled
    expect(state.reconcile()).toBe(false);
  });

  it('reconcile: a grouping change resets the page and group expansion', () => {
    const state = new OgeGridStateCore(rx);
    state.reconcile();
    state.expansion.toggleGroup('g:a');
    state.paging.configure(5);
    state.paging.goTo(1);
    state.grouping.groupBy('city');
    expect(state.reconcile()).toBe(true);
    expect(state.paging.pageIndex()).toBe(0);
    expect(state.expansion.collapsedGroups().size).toBe(0);
  });

  it('snapshot ⇄ applySnapshot round-trips everything but the page index', () => {
    const state = new OgeGridStateCore(rx);
    state.sort.set([{ field: 'a', dir: 'desc' }]);
    state.paging.configure(25);
    state.paging.goTo(4);
    state.columns.setWidth('a', 200);
    state.columns.setPinned('b', 'left');
    state.columns.setOrder(['b', 'a']);
    state.filter.setHeaderFilter('a', [1, 2]);
    const snapshot = state.snapshot();
    expect(snapshot.paging).toEqual({ pageIndex: 4, pageSize: 25 });

    const restored = new OgeGridStateCore(rx);
    restored.applySnapshot(snapshot);
    expect(restored.sort.descriptors()).toEqual([{ field: 'a', dir: 'desc' }]);
    expect(restored.paging.pageSize()).toBe(25);
    expect(restored.paging.pageIndex()).toBe(0);
    expect(restored.columns.widthOverrides().get('a')).toBe(200);
    expect(restored.columns.pinOverrides().get('b')).toBe('left');
    expect(restored.columns.order()).toEqual(['b', 'a']);
    expect(restored.filter.headerFilterOf('a')).toEqual([1, 2]);
  });

  it('loadOptionsEqual compares structurally', () => {
    expect(loadOptionsEqual({ sort: [], skip: 0 }, { sort: [], skip: 0 })).toBe(
      true,
    );
    expect(loadOptionsEqual({ skip: 0 }, { skip: 10 })).toBe(false);
  });
});
