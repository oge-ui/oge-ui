import type { DataSource, DistinctOptions, FilterExpr } from '@oge-ui/core';
import { OgeHeaderValuesLoader } from './grid-header-values';

interface Call {
  field: string;
  options: DistinctOptions;
  resolve: (values: readonly unknown[]) => void;
  reject: (error: unknown) => void;
}

function remoteSource(calls: Call[], local = false): DataSource<never> {
  return {
    capabilities: {
      sort: true,
      filter: true,
      group: true,
      paging: true,
      summary: true,
    },
    load: () => Promise.resolve({ data: [] }),
    ...(local ? { loadSync: () => ({ data: [] }) } : {}),
    keyOf: () => 0,
    distinct: (field: string, options: DistinctOptions = {}) =>
      new Promise<readonly unknown[]>((resolve, reject) => {
        calls.push({ field, options, resolve, reject });
      }),
  };
}

const OTHER: FilterExpr = {
  type: 'binary',
  field: 'city',
  op: 'eq',
  value: 'Ankara',
};

describe('OgeHeaderValuesLoader', () => {
  let calls: Call[];
  let shown: (readonly unknown[] | null)[];
  let errors: unknown[];
  let cut: boolean[];

  function loader(local = false, remoteSearch?: (field: string) => boolean) {
    return new OgeHeaderValuesLoader({
      source: () => remoteSource(calls, local),
      filterFor: (field) => (field === 'name' ? OTHER : null),
      searchText: () => ' ali ',
      limit: () => 3,
      onValues: (_field, values, truncated) => {
        shown.push(values);
        cut.push(truncated);
      },
      onError: (error) => errors.push(error),
      ...(remoteSearch ? { remoteSearch } : {}),
    });
  }

  beforeEach(() => {
    calls = [];
    shown = [];
    errors = [];
    cut = [];
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('asks once on open with the other filters and the search text, not its own', async () => {
    const l = loader();
    l.open('name');
    expect(calls).toHaveLength(1);
    expect(calls[0].field).toBe('name');
    expect(calls[0].options.filter).toBe(OTHER);
    expect(calls[0].options.searchText).toBe('ali');
    expect(calls[0].options.take).toBe(4); // one more, to detect a cut list
    expect(calls[0].options.search).toBeUndefined();
    expect(calls[0].options.signal).toBeInstanceOf(AbortSignal);
    calls[0].resolve(['a', 'b', 'c', 'd']);
    await Promise.resolve();
    expect(shown).toEqual([null, ['a', 'b', 'c']]);
    expect(cut.at(-1)).toBe(true);
  });

  it('debounces a server search by 250 ms and sends the typed text', () => {
    const l = loader();
    l.open('name');
    expect(l.search('k')).toBe(true);
    expect(l.search('ka')).toBe(true);
    vi.advanceTimersByTime(249);
    expect(calls).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(calls).toHaveLength(2);
    expect(calls[1].options.search).toBe('ka');
    // the same text again sends nothing
    l.search(' ka ');
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(2);
  });

  it('drops a late answer to a superseded request and aborts it', async () => {
    const l = loader();
    l.open('name');
    l.search('ka');
    vi.advanceTimersByTime(250);
    const [first, second] = calls;
    expect(first.options.signal?.aborted).toBe(true);
    second.resolve(['Kaya']);
    await Promise.resolve();
    first.resolve(['Ali', 'Ayşe']); // arrives last, must not win
    await Promise.resolve();
    expect(shown.at(-1)).toEqual(['Kaya']);
    first.reject(new Error('aborted'));
    await Promise.resolve();
    expect(errors).toEqual([]);
  });

  it('keeps every listed value for toggling, across searches', async () => {
    const l = loader();
    l.open('name');
    calls[0].resolve(['Ali', 'Ayşe']);
    await Promise.resolve();
    l.search('ka');
    vi.advanceTimersByTime(250);
    calls[1].resolve(['Kaya', 'Ali']);
    await Promise.resolve();
    expect(l.universe()).toEqual(['Ali', 'Ayşe', 'Kaya']);
  });

  it('searches an in-memory source locally and dates never remotely', () => {
    const local = loader(true);
    local.open('name');
    expect(local.isLocal()).toBe(true);
    expect(local.search('ka')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(1);

    calls = [];
    const dates = loader(false, (field) => field !== 'at');
    dates.open('at');
    expect(dates.search('2026')).toBe(false);
    dates.open('name');
    expect(dates.search('ka')).toBe(true);
  });

  it('ignores answers after close and reports real failures', async () => {
    const l = loader();
    l.open('name');
    l.close();
    calls[0].resolve(['late']);
    await Promise.resolve();
    expect(shown).toEqual([null]);

    l.open('name');
    calls[1].reject(new Error('boom'));
    await Promise.resolve();
    await Promise.resolve();
    expect(shown.at(-1)).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it('folds blank values into one trailing null and reports a full list', async () => {
    const l = loader();
    l.open('name');
    calls[0].resolve([null, 'Ali', '', '  ']);
    await Promise.resolve();
    expect(shown.at(-1)).toEqual(['Ali', null]);
    expect(cut.at(-1)).toBe(false);
    expect(l.universe()).toEqual(['Ali', null]);
  });
});
