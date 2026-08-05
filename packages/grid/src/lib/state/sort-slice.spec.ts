import { SortSlice } from './sort-slice';

describe('SortSlice', () => {
  it('cycles asc → desc → none on repeated toggles', () => {
    const slice = new SortSlice();
    slice.toggle('name');
    expect(slice.descriptors()).toEqual([{ field: 'name', dir: 'asc' }]);
    slice.toggle('name');
    expect(slice.descriptors()).toEqual([{ field: 'name', dir: 'desc' }]);
    slice.toggle('name');
    expect(slice.descriptors()).toEqual([]);
  });

  it('replaces the whole sort on non-additive toggle', () => {
    const slice = new SortSlice();
    slice.toggle('a');
    slice.toggle('b');
    expect(slice.descriptors()).toEqual([{ field: 'b', dir: 'asc' }]);
  });

  it('appends on additive toggle and preserves chain positions', () => {
    const slice = new SortSlice();
    slice.toggle('a');
    slice.toggle('b', true);
    expect(slice.descriptors()).toEqual([
      { field: 'a', dir: 'asc' },
      { field: 'b', dir: 'asc' },
    ]);
    slice.toggle('a', true); // asc → desc, stays first in the chain
    expect(slice.descriptors()).toEqual([
      { field: 'a', dir: 'desc' },
      { field: 'b', dir: 'asc' },
    ]);
    slice.toggle('a', true); // desc → removed
    expect(slice.descriptors()).toEqual([{ field: 'b', dir: 'asc' }]);
  });

  it('reports per-field state with 1-based chain index', () => {
    const slice = new SortSlice();
    slice.toggle('a');
    slice.toggle('b', true);
    expect(slice.stateOf('b')).toEqual({ dir: 'asc', index: 2 });
    expect(slice.stateOf('missing')).toBeNull();
  });
});
