import type { DataChange, DataSource, LoadOptions } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridDataCore } from './grid-data-core';

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

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function fakeSource(rows: Row[]): DataSource<Row> & {
  calls: LoadOptions[];
  push(batch: DataChange<Row>[]): void;
} {
  const listeners = new Set<(batch: readonly DataChange<Row>[]) => void>();
  const calls: LoadOptions[] = [];
  return {
    calls,
    capabilities: {
      sort: true,
      filter: true,
      group: false,
      paging: true,
      summary: false,
    },
    keyOf: (row) => row.id,
    load(options) {
      calls.push(options);
      const skip = options.skip ?? 0;
      const take = options.take ?? rows.length;
      return Promise.resolve({
        data: rows.slice(skip, skip + take),
        totalCount: rows.length,
      });
    },
    changes: {
      subscribe(observer) {
        listeners.add(observer);
        return { unsubscribe: () => listeners.delete(observer) };
      },
    },
    push(batch) {
      for (const listener of listeners) listener(batch);
    },
  };
}

describe('OgeGridDataCore', () => {
  it('sync() loads once per distinct option set', async () => {
    let options: LoadOptions = { sort: [], requireTotalCount: true };
    const source = fakeSource([{ id: 1, name: 'a' }]);
    const core = new OgeGridDataCore<Row>({ loadOptions: () => options }, rx);
    core.setSource(source);
    core.sync();
    core.sync();
    expect(core.loading()).toBe(true);
    await flush();
    expect(source.calls).toHaveLength(1);
    expect(core.result()?.data).toEqual([{ id: 1, name: 'a' }]);
    expect(core.loading()).toBe(false);

    options = { ...options, skip: 0, take: 1 };
    core.sync();
    await flush();
    expect(source.calls).toHaveLength(2);
  });

  it('switchMap: an aborted earlier load never wins', async () => {
    let resolveFirst!: (value: { data: Row[] }) => void;
    const source: DataSource<Row> = {
      capabilities: {
        sort: false,
        filter: false,
        group: false,
        paging: false,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: vi
        .fn()
        .mockImplementationOnce(
          () => new Promise((resolve) => (resolveFirst = resolve)),
        )
        .mockImplementationOnce(() =>
          Promise.resolve({ data: [{ id: 2, name: 'second' }] }),
        ),
    };
    let options: LoadOptions = { skip: 0 };
    const core = new OgeGridDataCore<Row>({ loadOptions: () => options }, rx);
    core.setSource(source);
    core.sync();
    options = { skip: 10 };
    core.sync();
    await flush();
    resolveFirst({ data: [{ id: 1, name: 'first' }] });
    await flush();
    expect(core.result()?.data).toEqual([{ id: 2, name: 'second' }]);
  });

  it('patches pushed updates in place and reloads on structural changes', async () => {
    const source = fakeSource([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    const core = new OgeGridDataCore<Row>({ loadOptions: () => ({}) }, rx);
    core.setSource(source);
    core.sync();
    await flush();
    source.push([{ type: 'update', key: 2, patch: { name: 'B' } }]);
    expect(source.calls).toHaveLength(1);
    expect(core.result()?.data[1]).toEqual({ id: 2, name: 'B' });
    expect(core.pushedCells()).toEqual({
      batch: 1,
      cells: [{ key: 2, field: 'name' }],
    });
    source.push([{ type: 'remove', key: 1 }]);
    await flush();
    expect(source.calls).toHaveLength(2);
  });

  it('windowed mode fetches blocks and keeps the total', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({
      id: i,
      name: `r${i}`,
    }));
    const source = fakeSource(rows);
    const core = new OgeGridDataCore<Row>(
      { loadOptions: () => ({ sort: [] }) },
      rx,
    );
    core.setSource(source);
    core.setMode('window');
    core.sync(); // no-op in window mode
    expect(source.calls).toHaveLength(0);
    core.requestRange(0, 150);
    expect(core.windowLoading()).toBe(true);
    await flush();
    expect(source.calls.map((c) => c.skip)).toEqual([0, 100]);
    expect(core.windowRows().get(120)?.name).toBe('r120');
    expect(core.windowTotal()).toBe(250);
    expect(core.highestLoaded()).toBe(200);
    // already loaded blocks are not fetched again
    core.requestRange(50, 120);
    expect(source.calls).toHaveLength(2);
  });

  it('destroy() unsubscribes from pushes', async () => {
    const source = fakeSource([{ id: 1, name: 'a' }]);
    const core = new OgeGridDataCore<Row>({ loadOptions: () => ({}) }, rx);
    core.setSource(source);
    core.sync();
    await flush();
    core.destroy();
    source.push([{ type: 'update', key: 1, patch: { name: 'z' } }]);
    expect(core.result()?.data[0]).toEqual({ id: 1, name: 'a' });
  });
});
