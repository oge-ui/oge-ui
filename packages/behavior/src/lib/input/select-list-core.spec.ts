import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OgeSelectListCore,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeSelectListCoreDeps,
} from './select-list-core';

/**
 * The framework-free reactivity adapter used by these specs: plain closures,
 * recomputed on read. Both real adapters (Angular signals, the React store)
 * add memoization on top — nothing in the machine may depend on it, which is
 * exactly what running it against this adapter proves.
 */
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

/** Lets queued promise callbacks run without leaving fake timers. */
async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

interface Row {
  id: number;
  name: string;
  team: string;
  off?: boolean;
}

const ROWS: readonly Row[] = [
  { id: 1, name: 'ada', team: 'core' },
  { id: 2, name: 'grace', team: 'docs' },
  { id: 3, name: 'alan', team: 'core', off: true },
  { id: 4, name: 'barbara', team: 'docs' },
];

/** Mutable deps so a spec can flip one getter mid-test. */
function harness(overrides: Partial<OgeSelectListCoreDeps<Row>> = {}) {
  const state = {
    opened: true,
    items: ROWS as readonly Row[] | (() => unknown),
    searchEnabled: true,
    searchDebounceMs: 0,
  };
  const deps: OgeSelectListCoreDeps<Row> = {
    inputId: () => 'field',
    opened: () => state.opened,
    items: () => state.items as never,
    displayExpr: () => 'name',
    valueExpr: () => 'id',
    disabledExpr: () => 'off',
    imageExpr: () => undefined,
    searchExpr: () => undefined,
    searchEnabled: () => state.searchEnabled,
    searchMode: () => 'contains',
    searchDebounceMs: () => state.searchDebounceMs,
    ...overrides,
  };
  return { core: new OgeSelectListCore<Row>(deps, rx), state };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ids and expression resolution', () => {
  it('derives the listbox and option ids from the field id', () => {
    const { core } = harness();
    expect(core.listboxId).toBe('field-listbox');
    expect(core.optionId(2)).toBe('field-option-2');
  });

  it('resolves display, value and disabled through the expressions', () => {
    const { core } = harness();
    expect(core.displayOf(ROWS[0])).toBe('ada');
    expect(core.itemValue(ROWS[0])).toBe(1);
    expect(core.isItemDisabled(ROWS[2])).toBe(true);
    expect(core.isItemDisabled(ROWS[0])).toBe(false);
  });

  it('returns null for a missing or empty image rather than an empty <img>', () => {
    expect(harness().core.imageOf(ROWS[0])).toBe(null);
    const withImage = harness({ imageExpr: () => 'avatar' }).core;
    expect(withImage.imageOf({ ...ROWS[0], avatar: '' } as never)).toBe(null);
    expect(withImage.imageOf({ ...ROWS[0], avatar: '/a.png' } as never)).toBe(
      '/a.png',
    );
  });

  it('searches the display text by default, and the named fields when told', () => {
    expect(harness().core.searchStrings(ROWS[0])).toEqual(['ada']);
    expect(
      harness({ searchExpr: () => ['name', 'team'] }).core.searchStrings(
        ROWS[0],
      ),
    ).toEqual(['ada', 'core']);
    expect(
      harness({
        searchExpr: () => (item: Row) => item.team,
      }).core.searchStrings(ROWS[0]),
    ).toEqual(['core']);
  });
});

describe('activeDescendant', () => {
  it('is null while closed or with no active option', () => {
    const { core, state } = harness();
    expect(core.activeDescendant()).toBe(null);
    core.setActive(1);
    expect(core.activeDescendant()).toBe('field-option-1');
    state.opened = false;
    expect(core.activeDescendant()).toBe(null);
  });
});

describe('filtering', () => {
  it('narrows on a substring, case-insensitively', () => {
    const { core } = harness();
    core.setSearch('AR');
    expect(core.visibleItems().map((r) => r.name)).toEqual(['barbara']);
  });

  it('honours startswith mode', () => {
    const { core } = harness({ searchMode: () => 'startswith' });
    core.setSearch('a');
    expect(core.visibleItems().map((r) => r.name)).toEqual(['ada', 'alan']);
  });

  it('does not filter at all when search is disabled', () => {
    const { core, state } = harness();
    state.searchEnabled = false;
    core.setSearch('zzz');
    expect(core.visibleItems()).toHaveLength(4);
  });

  it('waits out the debounce before narrowing', () => {
    const { core, state } = harness();
    state.searchDebounceMs = 200;
    core.setSearch('ada');
    expect(core.searchText()).toBe('ada'); // the box shows the text at once
    expect(core.visibleItems()).toHaveLength(4); // the list has not moved yet
    vi.advanceTimersByTime(200);
    expect(core.visibleItems().map((r) => r.name)).toEqual(['ada']);
  });

  it('resets the search and the filter immediately, debounce or not', () => {
    const { core, state } = harness();
    state.searchDebounceMs = 200;
    core.setSearch('ada');
    core.resetSearch();
    expect(core.searchText()).toBe(null);
    expect(core.visibleItems()).toHaveLength(4);
    vi.advanceTimersByTime(500); // the superseded timer must not re-narrow
    expect(core.visibleItems()).toHaveLength(4);
  });

  it('holds the list back until minSearchLength is reached', () => {
    const { core } = harness({ minSearchLength: () => 2 });
    core.setSearch('a');
    expect(core.visibleItems()).toHaveLength(0);
    core.setSearch('ad');
    expect(core.visibleItems().map((r) => r.name)).toEqual(['ada']);
  });

  it('can show the full list below minSearchLength instead of nothing', () => {
    const { core } = harness({
      minSearchLength: () => 2,
      showDataBeforeSearch: () => true,
    });
    core.setSearch('a');
    expect(core.visibleItems()).toHaveLength(4);
  });

  it('caps the list at maxItems', () => {
    const { core } = harness({ maxItems: () => 2 });
    expect(core.visibleItems()).toHaveLength(2);
  });

  it('applies preFilterItems before the search — hidden items stay hidden', () => {
    const { core } = harness({
      preFilterItems: (items) => items.filter((r) => r.id !== 1),
    });
    core.setSearch('a');
    expect(core.visibleItems().map((r) => r.name)).toEqual([
      'grace',
      'alan',
      'barbara',
    ]);
  });

  it('clears pending filter timers on destroy', () => {
    const { core, state } = harness();
    state.searchDebounceMs = 200;
    core.setSearch('ada');
    core.destroy();
    vi.advanceTimersByTime(500);
    expect(core.visibleItems()).toHaveLength(4);
  });
});

describe('grouping', () => {
  it('reorders items by first-seen group and interleaves headers', () => {
    const { core } = harness({ groupBy: () => 'team' });
    expect(core.visibleItems().map((r) => r.name)).toEqual([
      'ada',
      'alan',
      'grace',
      'barbara',
    ]);
    expect(
      core.rows().map((row) => (row.kind === 'group' ? row.label : row.index)),
    ).toEqual(['core', 0, 1, 'docs', 2, 3]);
  });

  it('emits plain item rows with no groupBy', () => {
    const { core } = harness();
    expect(core.rows().every((row) => row.kind === 'item')).toBe(true);
    expect(core.rows()).toHaveLength(4);
  });

  it('indexes grouped rows into visibleItems, so keyboard math still lines up', () => {
    const { core } = harness({ groupBy: () => 'team' });
    const items = core.visibleItems();
    for (const row of core.rows()) {
      if (row.kind === 'item') expect(items[row.index]).toBe(row.item);
    }
  });
});

describe('lazy items function', () => {
  it('resolves an async source once and guards against stale runs', async () => {
    let resolveFirst: (rows: readonly Row[]) => void = () => undefined;
    const first = new Promise<readonly Row[]>((r) => (resolveFirst = r));
    const { core, state } = harness();
    state.items = () => first;
    core.syncItemsSource();
    expect(core.itemsStatus()).toBe('idle');

    core.ensureItemsLoaded();
    expect(core.itemsStatus()).toBe('loading');
    // a second call while loading must not fire the source again
    core.ensureItemsLoaded();

    // the source is re-seeded (the `items` input changed) and resolves first;
    // the superseded run must lose
    state.items = () => Promise.resolve([ROWS[1]]);
    core.syncItemsSource();
    core.ensureItemsLoaded();
    await tick();
    expect(core.itemsStatus()).toBe('ready');
    resolveFirst([ROWS[0]]);
    await tick();
    expect(core.resolvedItems().map((r) => r.name)).toEqual(['grace']);
  });

  it('takes a synchronous return directly', () => {
    const { core, state } = harness();
    state.items = () => [ROWS[0]];
    core.syncItemsSource();
    core.ensureItemsLoaded();
    expect(core.itemsStatus()).toBe('ready');
    expect(core.resolvedItems()).toHaveLength(1);
  });

  it('records a rejection as an error state instead of an empty list forever', async () => {
    const { core, state } = harness();
    state.items = () => Promise.reject(new Error('offline'));
    core.syncItemsSource();
    core.ensureItemsLoaded();
    await tick();
    expect(core.itemsStatus()).toBe('error');
    expect(core.resolvedItems()).toEqual([]);
  });

  it('leaves an array source alone', () => {
    const { core } = harness();
    expect(core.itemsStatus()).toBe('static');
    core.ensureItemsLoaded();
    expect(core.resolvedItems()).toHaveLength(4);
  });
});

describe('active-option bookkeeping', () => {
  it('finds the enabled edges from either direction', () => {
    const { core } = harness();
    expect(core.edgeEnabledIndex(1)).toBe(0);
    expect(core.edgeEnabledIndex(-1)).toBe(3);
  });

  it('reports -1 when every option is disabled', () => {
    const { core } = harness({ disabledExpr: () => () => true });
    expect(core.edgeEnabledIndex(1)).toBe(-1);
  });

  it('enters from nowhere at the edge matching the direction', () => {
    const down = harness().core;
    down.moveActive(1);
    expect(down.activeIndex()).toBe(0);
    const up = harness().core;
    up.moveActive(-1);
    expect(up.activeIndex()).toBe(3);
  });

  it('skips disabled options and clamps at the ends', () => {
    const { core } = harness();
    core.setActive(1);
    core.moveActive(1); // index 2 is disabled → 3
    expect(core.activeIndex()).toBe(3);
    core.moveActive(1); // already last
    expect(core.activeIndex()).toBe(3);
    core.moveActive(-1);
    expect(core.activeIndex()).toBe(1);
  });

  it('moves by more than one for PageUp/PageDown', () => {
    const { core } = harness();
    core.setActive(0);
    core.moveActive(5);
    expect(core.activeIndex()).toBe(3);
  });

  it('does nothing on an empty list', () => {
    const { core, state } = harness();
    state.items = [];
    core.moveActive(1);
    expect(core.activeIndex()).toBe(-1);
  });

  it('activates the selected item, or the first enabled one when it is filtered out', () => {
    const { core } = harness();
    core.activateItemOrFirst(ROWS[3]);
    expect(core.activeIndex()).toBe(3);
    core.activateItemOrFirst(null);
    expect(core.activeIndex()).toBe(0);
    core.setSearch('grace');
    core.activateItemOrFirst(ROWS[3]); // no longer visible
    expect(core.activeIndex()).toBe(0);
  });

  it('routes activation through the host scroll hook, and not when cleared', () => {
    const scrollActiveIntoView = vi.fn();
    const { core } = harness({ scrollActiveIntoView });
    core.setActive(2);
    expect(scrollActiveIntoView).toHaveBeenCalledWith(2);
    core.setActive(-1);
    expect(scrollActiveIntoView).toHaveBeenCalledTimes(1);
  });
});
