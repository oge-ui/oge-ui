import { CustomDataSource } from './custom-data-source';
import type { LoadOptions } from './load-options';

interface Row {
  id: number;
  name: string;
}

describe('CustomDataSource', () => {
  it('delegates load with the given options', async () => {
    const seen: LoadOptions[] = [];
    const source = new CustomDataSource<Row>({
      key: 'id',
      load: async (options) => {
        seen.push(options);
        return { data: [{ id: 1, name: 'x' }], totalCount: 42 };
      },
    });
    const result = await source.load({ skip: 10, take: 5, requireTotalCount: true });
    expect(result.totalCount).toBe(42);
    expect(seen[0]).toMatchObject({ skip: 10, take: 5 });
  });

  it('defaults to full server-side capabilities, overridable', () => {
    const base = new CustomDataSource<Row>({ key: 'id', load: async () => ({ data: [] }) });
    expect(base.capabilities.sort).toBe(true);
    const partial = new CustomDataSource<Row>({
      key: 'id',
      load: async () => ({ data: [] }),
      capabilities: { group: false },
    });
    expect(partial.capabilities.group).toBe(false);
    expect(partial.capabilities.sort).toBe(true);
  });

  it('resolves keys via the key option', () => {
    const source = new CustomDataSource<Row>({ key: (r) => `k${r.id}`, load: async () => ({ data: [] }) });
    expect(source.keyOf({ id: 3, name: 'x' })).toBe('k3');
  });

  it('exposes optional delegates only when provided', async () => {
    const bare = new CustomDataSource<Row>({ key: 'id', load: async () => ({ data: [] }) });
    expect(bare.distinct).toBeUndefined();
    const withDistinct = new CustomDataSource<Row>({
      key: 'id',
      load: async () => ({ data: [] }),
      distinct: async () => [1, 2],
    });
    await expect(withDistinct.distinct?.('id')).resolves.toEqual([1, 2]);
  });
});
