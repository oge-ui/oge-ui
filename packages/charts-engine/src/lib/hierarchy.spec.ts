import {
  buildChartHierarchy,
  chartHierarchyDrillFocus,
  chartHierarchyColor,
  chartHierarchyDescendants,
  chartHierarchyEvent,
  chartHierarchyKeyCommand,
  chartHierarchyPath,
} from './hierarchy';

const nested = [
  {
    name: 'Europe',
    items: [
      { name: 'Germany', value: 40 },
      { name: 'France', value: 30 },
    ],
  },
  { name: 'Asia', items: [{ name: 'Japan', value: 30 }] },
  { name: 'Other', value: 10 },
];

describe('buildChartHierarchy', () => {
  it('nested data: sums groups, keys are paths', () => {
    const { root, byKey } = buildChartHierarchy({
      dataSource: nested,
      rootLabel: 'All',
    });
    expect(root.value).toBe(110);
    expect(root.children.map((c) => c.name)).toEqual([
      'Europe',
      'Asia',
      'Other',
    ]);
    expect(byKey.get('0')?.value).toBe(70);
    expect(byKey.get('0/1')?.name).toBe('France');
    expect(byKey.get('0/1')?.depth).toBe(2);
  });

  it('flat data: parentField builds the tree, unknown parents go to the top', () => {
    const flat = [
      { id: 1, parent: null, name: 'A' },
      { id: 2, parent: 1, name: 'A1', value: 5 },
      { id: 3, parent: 1, name: 'A2', value: 7 },
      { id: 4, parent: 99, name: 'B', value: 1 },
    ];
    const { root } = buildChartHierarchy({
      dataSource: flat,
      idField: 'id',
      parentField: 'parent',
      rootLabel: 'All',
    });
    expect(root.children.map((c) => c.name)).toEqual(['A', 'B']);
    expect(root.children[0].value).toBe(12);
  });

  it('survives cycles and negative values', () => {
    const cyclic = [
      { id: 1, parent: 2, name: 'x', value: -5 },
      { id: 2, parent: 1, name: 'y', value: 3 },
    ];
    const { root } = buildChartHierarchy({
      dataSource: cyclic,
      idField: 'id',
      parentField: 'parent',
      rootLabel: 'All',
    });
    // both have known parents, so neither is top level: nothing is reachable
    expect(root.value).toBe(0);
  });

  it('path, descendants, event and colour', () => {
    const { byKey } = buildChartHierarchy({
      dataSource: nested,
      rootLabel: 'All',
    });
    const france = byKey.get('0/1');
    if (france === undefined) throw new Error('missing');
    expect(chartHierarchyPath(france).map((n) => n.name)).toEqual([
      'All',
      'Europe',
      'France',
    ]);
    expect(
      chartHierarchyDescendants(byKey.get('') ?? france, 1).map((n) => n.name),
    ).toEqual(['Europe', 'Asia', 'Other']);
    expect(chartHierarchyEvent(france)).toMatchObject({
      name: 'France',
      percentOfParent: 30 / 70,
      isGroup: false,
      depth: 2,
    });
    expect(chartHierarchyColor(byKey.get('0') ?? france, ['red', 'blue'])).toBe(
      'red',
    );
    expect(chartHierarchyColor(france, ['red', 'blue'])).toBe(
      'color-mix(in srgb, red 82%, var(--oge-bg))',
    );
    expect(chartHierarchyColor(byKey.get('1') ?? france, ['red', 'blue'])).toBe(
      'blue',
    );
  });
});

describe('chartHierarchyKeyCommand', () => {
  const { root, byKey } = buildChartHierarchy({
    dataSource: nested,
    rootLabel: 'All',
  });
  const ctx = { root, drillDown: true, maxDepth: 2 };

  it('the first arrow focuses the first top-level item', () => {
    expect(
      chartHierarchyKeyCommand('ArrowRight', { ...ctx, active: null }),
    ).toEqual({ type: 'focus', key: '0' });
  });

  it('siblings, children, parent', () => {
    const europe = byKey.get('0') ?? null;
    expect(
      chartHierarchyKeyCommand('ArrowRight', { ...ctx, active: europe }),
    ).toEqual({ type: 'focus', key: '1' });
    expect(
      chartHierarchyKeyCommand('ArrowLeft', {
        ...ctx,
        active: europe,
        rtl: true,
      }),
    ).toEqual({ type: 'focus', key: '1' });
    expect(
      chartHierarchyKeyCommand('ArrowDown', { ...ctx, active: europe }),
    ).toEqual({ type: 'focus', key: '0/0' });
    expect(
      chartHierarchyKeyCommand('ArrowUp', {
        ...ctx,
        active: byKey.get('0/0') ?? null,
      }),
    ).toEqual({ type: 'focus', key: '0' });
    expect(chartHierarchyKeyCommand('End', { ...ctx, active: europe })).toEqual(
      { type: 'focus', key: '2' },
    );
    // Down stops at the drawn depth
    expect(
      chartHierarchyKeyCommand('ArrowDown', {
        ...ctx,
        maxDepth: 1,
        active: europe,
      }),
    ).toEqual({ type: 'focus', key: '0' });
  });

  it('Enter drills a group, activates a leaf; Escape goes up only below the top', () => {
    expect(
      chartHierarchyKeyCommand('Enter', {
        ...ctx,
        active: byKey.get('0') ?? null,
      }),
    ).toEqual({ type: 'drill', key: '0' });
    expect(
      chartHierarchyKeyCommand('Enter', {
        ...ctx,
        active: byKey.get('2') ?? null,
      }),
    ).toEqual({ type: 'activate', key: '2' });
    expect(
      chartHierarchyKeyCommand('Enter', {
        ...ctx,
        drillDown: false,
        active: byKey.get('0') ?? null,
      }),
    ).toEqual({ type: 'activate', key: '0' });
    expect(
      chartHierarchyKeyCommand('Escape', { ...ctx, active: null }),
    ).toBeNull();
    const europe = byKey.get('0');
    if (europe === undefined) throw new Error('missing');
    expect(
      chartHierarchyKeyCommand('Escape', {
        ...ctx,
        root: europe,
        active: null,
      }),
    ).toEqual({ type: 'up' });
  });
});

describe('chartHierarchyDrillFocus', () => {
  const { root, byKey } = buildChartHierarchy({
    dataSource: nested,
    rootLabel: 'All',
  });
  it('down: the first child; up: the branch the user came from', () => {
    const europe = byKey.get('0');
    if (europe === undefined) throw new Error('missing');
    expect(chartHierarchyDrillFocus('', europe)).toEqual({
      up: false,
      activeKey: '0/0',
    });
    expect(chartHierarchyDrillFocus('0', root)).toEqual({
      up: true,
      activeKey: '0',
    });
    // '1' is not an ancestor of '10/…'-style keys: prefix matching uses the separator
    expect(chartHierarchyDrillFocus('0/1', europe)).toEqual({
      up: true,
      activeKey: '0/1',
    });
  });
});
