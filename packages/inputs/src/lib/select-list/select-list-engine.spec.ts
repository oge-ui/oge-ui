import { signal } from '@angular/core';
import {
  SelectListEngine,
  type SelectListEngineDeps,
} from './select-list-engine';

interface City {
  id: number;
  name: string;
  region?: string;
  blocked?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara', region: 'Anatolia' },
  { id: 2, name: 'Berlin', region: 'Europe', blocked: true },
  { id: 3, name: 'Bursa', region: 'Anatolia' },
  { id: 4, name: 'Boston', region: 'America' },
];

function makeEngine(
  overrides: Partial<SelectListEngineDeps<City>> = {},
): SelectListEngine<City> {
  return new SelectListEngine<City>({
    inputId: () => 'oge-test',
    opened: () => true,
    items: () => CITIES,
    displayExpr: () => 'name',
    valueExpr: () => 'id',
    disabledExpr: () => 'blocked',
    imageExpr: () => undefined,
    searchExpr: () => undefined,
    searchEnabled: () => true,
    searchMode: () => 'contains',
    searchDebounceMs: () => 0,
    scrollActiveIntoView: () => undefined,
    ...overrides,
  });
}

describe('SelectListEngine', () => {
  it('resolves display, value, disabled and search strings from expressions', () => {
    const engine = makeEngine();
    const [ankara, berlin] = CITIES;
    expect(engine.displayOf(ankara)).toBe('Ankara');
    expect(engine.itemValue(ankara)).toBe(1);
    expect(engine.isItemDisabled(berlin)).toBe(true);
    expect(engine.isItemDisabled(ankara)).toBe(false);
    expect(engine.searchStrings(ankara)).toEqual(['Ankara']);
  });

  it('resolves function expressions and stringifies without an expression', () => {
    const engine = makeEngine({
      displayExpr: () => (item: City) => item.name.toUpperCase(),
      valueExpr: () => undefined,
    });
    expect(engine.displayOf(CITIES[0])).toBe('ANKARA');
    expect(engine.itemValue(CITIES[0])).toBe(CITIES[0]);
  });

  it('generates listbox and option ids from the input id', () => {
    const engine = makeEngine();
    expect(engine.listboxId).toBe('oge-test-listbox');
    expect(engine.optionId(3)).toBe('oge-test-option-3');
  });

  it('filters items case-insensitively in contains and startswith modes', () => {
    const mode = signal<'contains' | 'startswith'>('contains');
    const engine = makeEngine({ searchMode: () => mode() });
    engine.setSearch('b');
    expect(engine.visibleItems().map((c) => c.name)).toEqual([
      'Berlin',
      'Bursa',
      'Boston',
    ]);
    engine.setSearch('ur');
    expect(engine.visibleItems().map((c) => c.name)).toEqual(['Bursa']);
    mode.set('startswith');
    engine.setSearch('ur');
    expect(engine.visibleItems()).toEqual([]);
  });

  it('gates the filter behind minSearchLength with showDataBeforeSearch', () => {
    let showBefore = false;
    const engine = makeEngine({
      minSearchLength: () => 2,
      showDataBeforeSearch: () => showBefore,
    });
    engine.setSearch('b');
    expect(engine.visibleItems()).toEqual([]);
    showBefore = true;
    engine.setSearch('x');
    expect(engine.visibleItems().length).toBe(CITIES.length);
    engine.setSearch('bu');
    expect(engine.visibleItems().map((c) => c.name)).toEqual(['Bursa']);
  });

  it('debounces the filter but exposes searchText immediately', async () => {
    const engine = makeEngine({ searchDebounceMs: () => 10 });
    engine.setSearch('bur');
    expect(engine.searchText()).toBe('bur');
    expect(engine.visibleItems().length).toBe(CITIES.length);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(engine.visibleItems().map((c) => c.name)).toEqual(['Bursa']);
    engine.resetSearch();
    expect(engine.searchText()).toBeNull();
    expect(engine.visibleItems().length).toBe(CITIES.length);
  });

  it('applies the preFilterItems hook before the search filter', () => {
    const hidden = signal<number[]>([2]);
    const engine = makeEngine({
      preFilterItems: (items) =>
        items.filter((item) => !hidden().includes(item.id)),
      searchEnabled: () => false,
    });
    expect(engine.visibleItems().map((c) => c.id)).toEqual([1, 3, 4]);
    hidden.set([1, 3]);
    expect(engine.visibleItems().map((c) => c.id)).toEqual([2, 4]);
  });

  it('interleaves group headers with absolute item indices in first-seen order', () => {
    const engine = makeEngine({ groupBy: () => 'region' });
    const rows = engine.rows();
    expect(rows.map((r) => (r.kind === 'group' ? `#${r.label}` : ''))).toEqual([
      '#Anatolia',
      '',
      '',
      '#Europe',
      '',
      '#America',
      '',
    ]);
    // items re-bucket by first-seen group; indices stay absolute into visibleItems
    const items = rows.filter((r) => r.kind === 'item');
    expect(items.map((r) => (r.kind === 'item' ? r.item.name : ''))).toEqual([
      'Ankara',
      'Bursa',
      'Berlin',
      'Boston',
    ]);
    expect(items.map((r) => (r.kind === 'item' ? r.index : -1))).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('navigates skipping disabled items and clamps at the edges', () => {
    const engine = makeEngine({ searchEnabled: () => false });
    expect(engine.edgeEnabledIndex(1)).toBe(0);
    expect(engine.edgeEnabledIndex(-1)).toBe(3);
    engine.setActive(0);
    engine.moveActive(1); // skips disabled Berlin (index 1)
    expect(engine.activeIndex()).toBe(2);
    engine.moveActive(1);
    expect(engine.activeIndex()).toBe(3);
    engine.moveActive(1); // clamped at the end
    expect(engine.activeIndex()).toBe(3);
    engine.moveActive(-10); // multi-step toward the start
    expect(engine.activeIndex()).toBe(0);
  });

  it('activates the given item or falls back to the first enabled option', () => {
    const engine = makeEngine({ searchEnabled: () => false });
    engine.activateItemOrFirst(CITIES[3]);
    expect(engine.activeIndex()).toBe(3);
    engine.activateItemOrFirst(null);
    expect(engine.activeIndex()).toBe(0);
  });

  it('exposes activeDescendant only while opened with an active option', () => {
    const opened = signal(true);
    const engine = makeEngine({ opened: () => opened() });
    expect(engine.activeDescendant()).toBeNull();
    engine.setActive(2);
    expect(engine.activeDescendant()).toBe('oge-test-option-2');
    opened.set(false);
    expect(engine.activeDescendant()).toBeNull();
  });

  it('resolves a lazy items function once and guards stale resolutions by runId', async () => {
    let resolveFirst!: (items: City[]) => void;
    let resolveSecond!: (items: City[]) => void;
    const sources = [
      new Promise<City[]>((resolve) => (resolveFirst = resolve)),
      new Promise<City[]>((resolve) => (resolveSecond = resolve)),
    ];
    let call = 0;
    const itemsFn = () => sources[call++];
    const engine = makeEngine({ items: () => itemsFn });
    engine.syncItemsSource();
    expect(engine.itemsStatus()).toBe('idle');
    engine.ensureItemsLoaded();
    expect(engine.itemsStatus()).toBe('loading');
    // a source swap while loading starts a second run — the first must lose
    engine.syncItemsSource();
    engine.ensureItemsLoaded();
    resolveSecond([CITIES[0]]);
    await Promise.resolve();
    expect(engine.itemsStatus()).toBe('ready');
    expect(engine.resolvedItems()).toEqual([CITIES[0]]);
    resolveFirst(CITIES);
    await Promise.resolve();
    expect(engine.resolvedItems()).toEqual([CITIES[0]]);
  });

  it('marks the error state when a lazy source rejects', async () => {
    const itemsFn = () => Promise.reject(new Error('boom'));
    const engine = makeEngine({ items: () => itemsFn });
    engine.syncItemsSource();
    engine.ensureItemsLoaded();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(engine.itemsStatus()).toBe('error');
    expect(engine.resolvedItems()).toEqual([]);
  });
});
