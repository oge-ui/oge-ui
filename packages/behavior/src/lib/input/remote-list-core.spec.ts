import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadOptions, LoadResult } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeRemoteListCore,
  isNearScrollEnd,
  type OgeListDataSource,
  type OgeRemoteListCoreDeps,
} from './remote-list-core';

/** Plain closures, no memoization — the machine must not depend on caching. */
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

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 95 }, (_, i) => ({
  id: i + 1,
  name: `${i % 2 === 0 ? 'Alpha' : 'Beta'} ${i + 1}`,
}));

/** A controllable server: every `load` waits until the spec resolves it. */
function server(options: { total?: boolean } = {}) {
  const calls: LoadOptions[] = [];
  const pending: Array<{
    options: LoadOptions;
    resolve: () => void;
    reject: (error: unknown) => void;
  }> = [];
  const source: OgeListDataSource<Row> = {
    load: (opts) => {
      calls.push(opts);
      return new Promise<LoadResult<Row>>((resolve, reject) => {
        pending.push({
          options: opts,
          resolve: () => {
            const term = (opts.searchText ?? '').toLowerCase();
            const matched = ROWS.filter((row) =>
              row.name.toLowerCase().includes(term),
            );
            const skip = opts.skip ?? 0;
            resolve({
              data: matched.slice(skip, skip + (opts.take ?? matched.length)),
              totalCount: options.total === false ? undefined : matched.length,
            });
          },
          reject,
        });
      });
    },
    byKey: vi.fn(
      async (key: unknown) => ROWS.find((row) => row.id === key) ?? null,
    ),
  };
  return { source, calls, pending };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function machine(
  source: OgeListDataSource<Row> | null,
  overrides: Partial<OgeRemoteListCoreDeps<Row>> = {},
) {
  return new OgeRemoteListCore<Row>(
    {
      source: () => source,
      pageSize: () => 20,
      searchTimeout: () => 0,
      minSearchLength: () => 0,
      showDataBeforeSearch: () => false,
      valueOf: (row) => row.id,
      ...overrides,
    },
    rx,
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('OgeRemoteListCore — paging', () => {
  it('is inert without a source', () => {
    const core = machine(null);
    core.open();
    expect(core.active).toBe(false);
    expect(core.status()).toBe('idle');
  });

  it('loads the first page on open, with skip/take/requireTotalCount and a signal', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    expect(core.loadingFirstPage()).toBe(true);
    expect(s.calls[0]).toMatchObject({
      skip: 0,
      take: 20,
      requireTotalCount: true,
    });
    expect(s.calls[0].signal).toBeInstanceOf(AbortSignal);
    expect(s.calls[0].searchText).toBeUndefined();
    s.pending[0].resolve();
    await flush();
    expect(core.items()).toHaveLength(20);
    expect(core.totalCount()).toBe(95);
    expect(core.hasMore()).toBe(true);
    expect(core.status()).toBe('ready');
  });

  it('requests the next page once the visible end nears the loaded end', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    s.pending[0].resolve();
    await flush();
    core.notifyVisibleEnd(5);
    expect(s.calls).toHaveLength(1);
    core.notifyVisibleEnd(16);
    expect(s.calls).toHaveLength(2);
    expect(s.calls[1]).toMatchObject({ skip: 20, take: 20 });
    expect(core.loadingMore()).toBe(true);
    // one page in flight at a time
    core.notifyVisibleEnd(19);
    expect(s.calls).toHaveLength(2);
    s.pending[1].resolve();
    await flush();
    expect(core.items()).toHaveLength(40);
  });

  it('stops at totalCount', async () => {
    const s = server();
    const core = machine(s.source, { pageSize: () => 50 });
    core.open();
    s.pending[0].resolve();
    await flush();
    core.loadMore();
    s.pending[1].resolve();
    await flush();
    expect(core.items()).toHaveLength(95);
    expect(core.hasMore()).toBe(false);
    core.loadMore();
    expect(s.calls).toHaveLength(2);
  });

  it('without a total, a short page marks the end', async () => {
    const s = server({ total: false });
    const core = machine(s.source, { pageSize: () => 60 });
    core.open();
    s.pending[0].resolve();
    await flush();
    expect(core.hasMore()).toBe(true);
    expect(core.totalCount()).toBeUndefined();
    core.loadMore();
    s.pending[1].resolve();
    await flush();
    expect(core.items()).toHaveLength(95);
    expect(core.hasMore()).toBe(false);
  });

  it('reports a failed page and retries it', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    s.pending[0].reject(new Error('down'));
    await flush();
    expect(core.status()).toBe('error');
    core.retry();
    expect(s.calls).toHaveLength(2);
    s.pending[1].resolve();
    await flush();
    expect(core.status()).toBe('ready');
  });

  it('notifies each landed page', async () => {
    const s = server();
    const onPageLoaded = vi.fn();
    const core = machine(s.source, { onPageLoaded });
    core.open();
    s.pending[0].resolve();
    await flush();
    expect(onPageLoaded).toHaveBeenCalledWith(
      expect.objectContaining({ searchText: '', skip: 0, totalCount: 95 }),
    );
  });
});

describe('OgeRemoteListCore — search', () => {
  it('debounces the typed text by searchTimeout', async () => {
    const s = server();
    const core = machine(s.source, { searchTimeout: () => 300 });
    core.open();
    s.pending[0].resolve();
    await flush();
    core.setSearch('al');
    core.setSearch('alp');
    vi.advanceTimersByTime(299);
    expect(s.calls).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(s.calls).toHaveLength(2);
    expect(s.calls[1].searchText).toBe('alp');
    expect(s.calls[1].skip).toBe(0);
  });

  it('aborts a superseded request and never applies it', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    core.setSearch('beta');
    expect(s.calls[0].signal?.aborted).toBe(true);
    s.pending[0].resolve(); // the stale, unfiltered page lands late
    s.pending[1].resolve();
    await flush();
    expect(core.items().every((row) => row.name.startsWith('Beta'))).toBe(true);
  });

  it('caches pages per search text', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    s.pending[0].resolve();
    await flush();
    core.setSearch('beta');
    s.pending[1].resolve();
    await flush();
    core.setSearch('');
    expect(s.calls).toHaveLength(2);
    expect(core.items()).toHaveLength(20);
    expect(core.items()[0].name).toBe('Alpha 1');
  });

  it('gates the request by minSearchLength', async () => {
    const s = server();
    const core = machine(s.source, { minSearchLength: () => 2 });
    core.open();
    expect(core.blocked()).toBe(true);
    expect(s.calls).toHaveLength(0);
    core.setSearch('a');
    expect(s.calls).toHaveLength(0);
    core.setSearch('al');
    expect(s.calls).toHaveLength(1);
    expect(core.blocked()).toBe(false);
  });

  it('below minSearchLength loads the unfiltered list with showDataBeforeSearch', () => {
    const s = server();
    const core = machine(s.source, {
      minSearchLength: () => 3,
      showDataBeforeSearch: () => true,
    });
    core.open();
    core.setSearch('al');
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0].searchText).toBeUndefined();
  });

  it('reload() drops the cache and asks again', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    s.pending[0].resolve();
    await flush();
    core.reload();
    expect(s.calls).toHaveLength(2);
    expect(core.items()).toHaveLength(0);
  });
});

describe('OgeRemoteListCore — selected items', () => {
  it('remembers items and finds them across queries', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    s.pending[0].resolve();
    await flush();
    const first = core.items()[0];
    core.remember(first);
    core.setSearch('beta');
    s.pending[1].resolve();
    await flush();
    expect(core.lookup(first.id)).toBe(first);
  });

  it('resolves an unknown value once through byKey', async () => {
    const s = server();
    const core = machine(s.source);
    core.resolve(77);
    core.resolve(77);
    expect(s.source.byKey).toHaveBeenCalledTimes(1);
    await flush();
    expect(core.lookup(77)?.name).toBe('Alpha 77');
    core.resolve(77);
    expect(s.source.byKey).toHaveBeenCalledTimes(1);
  });

  it('syncSource forgets the old source', async () => {
    const s = server();
    const core = machine(s.source);
    core.open();
    s.pending[0].resolve();
    await flush();
    core.syncSource();
    expect(core.items()).toHaveLength(0);
    core.open();
    expect(s.calls).toHaveLength(2);
  });
});

describe('isNearScrollEnd', () => {
  it('compares the scroll bottom against a threshold', () => {
    const el = { scrollTop: 400, clientHeight: 300, scrollHeight: 740 };
    expect(isNearScrollEnd(el as unknown as HTMLElement, 48)).toBe(true);
    expect(isNearScrollEnd({ ...el, scrollTop: 100 } as never, 48)).toBe(false);
  });
});
