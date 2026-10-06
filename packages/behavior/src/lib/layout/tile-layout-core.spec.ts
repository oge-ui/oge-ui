import {
  OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
  ogeTileLayoutAutoRows,
  ogeTileLayoutClampResize,
  ogeTileLayoutDropIndex,
  ogeTileLayoutKeyIntent,
  ogeTileLayoutMoveState,
  ogeTileLayoutMovedText,
  ogeTileLayoutResizeSpan,
  ogeTileLayoutResizeState,
  ogeTileLayoutResizedText,
  ogeTileLayoutResolve,
  ogeTileLayoutShortcuts,
  ogeTileLayoutStep,
  ogeTileLayoutTabStop,
  ogeTileLayoutTemplateColumns,
  ogeTileLayoutTileLabel,
  ogeTileLayoutToState,
  resolveOgeTileLayoutConfig,
  sanitizeOgeTileLayoutState,
  type OgeTileLayoutItemData,
  type OgeTileLayoutRect,
} from './tile-layout-core';

const ITEMS: OgeTileLayoutItemData[] = [
  { key: 'a', title: 'Alpha', colSpan: 2 },
  { key: 'b', title: 'Beta' },
  { key: 'c', title: 'Gamma', rowSpan: 2, resizable: 'vertical' },
  { key: 'd', order: -1, title: 'Delta', colSpan: 9 },
];
const OPTS = { columns: 4, resizable: true, reorderable: true } as const;

describe('tile layout core', () => {
  it('resolves order, clamps spans and reads the per-tile flags', () => {
    const tiles = ogeTileLayoutResolve(ITEMS, OPTS);
    expect(tiles.map((t) => t.key)).toEqual(['d', 'a', 'b', 'c']);
    expect(tiles[0].colSpan).toBe(4); // 9 clamped to columns
    expect(tiles.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(tiles[3]).toMatchObject({ resizeColumns: false, resizeRows: true });
  });

  it('lets the state win and appends tiles it does not know', () => {
    const state = {
      version: 1 as const,
      tiles: [
        { key: 'c', order: 0, colSpan: 3, rowSpan: 1 },
        { key: 'a', order: 1, colSpan: 1, rowSpan: 1 },
        { key: 'gone', order: 2, colSpan: 1, rowSpan: 1 },
      ],
    };
    const tiles = ogeTileLayoutResolve(ITEMS, { ...OPTS, state });
    expect(tiles.map((t) => t.key)).toEqual(['c', 'a', 'd', 'b']);
    expect(tiles[0].colSpan).toBe(3);
  });

  it('moves and resizes into a renumbered state', () => {
    const tiles = ogeTileLayoutResolve(ITEMS, OPTS);
    const moved = ogeTileLayoutMoveState(tiles, 0, 2);
    expect(moved.tiles.map((t) => [t.key, t.order])).toEqual([
      ['a', 0],
      ['b', 1],
      ['d', 2],
      ['c', 3],
    ]);
    const resized = ogeTileLayoutResizeState(tiles, 1, {
      colSpan: 3,
      rowSpan: 2,
    });
    expect(resized.tiles[1]).toEqual({
      key: 'a',
      order: 1,
      colSpan: 3,
      rowSpan: 2,
    });
    expect(ogeTileLayoutToState(tiles).version).toBe(1);
  });

  it('clamps a resize to the tile bounds and its resizable axes', () => {
    const [d, , , c] = ogeTileLayoutResolve(
      [...ITEMS.slice(0, 3), { ...ITEMS[3], maxColSpan: 3, minColSpan: 2 }],
      OPTS,
    );
    expect(ogeTileLayoutClampResize(d, { colSpan: 1, rowSpan: 0 })).toEqual({
      colSpan: 2,
      rowSpan: 1,
    });
    expect(ogeTileLayoutClampResize(c, { colSpan: 4, rowSpan: 3 })).toEqual({
      colSpan: 1,
      rowSpan: 3,
    });
  });

  it('maps keys to intents, mirroring horizontal arrows in RTL', () => {
    expect(ogeTileLayoutKeyIntent({ key: 'ArrowRight' }, false)).toEqual({
      type: 'focus',
      to: 'next',
    });
    expect(ogeTileLayoutKeyIntent({ key: 'Home' }, false)).toEqual({
      type: 'focus',
      to: 'first',
    });
    expect(
      ogeTileLayoutKeyIntent({ key: 'ArrowLeft', ctrlKey: true }, true),
    ).toEqual({ type: 'move', to: 'next' });
    expect(
      ogeTileLayoutKeyIntent({ key: 'ArrowUp', metaKey: true }, false),
    ).toEqual({ type: 'move', to: 'up' });
    expect(
      ogeTileLayoutKeyIntent(
        { key: 'ArrowRight', ctrlKey: true, shiftKey: true },
        true,
      ),
    ).toEqual({ type: 'resize', axis: 'col', delta: -1 });
    expect(
      ogeTileLayoutKeyIntent(
        { key: 'ArrowDown', ctrlKey: true, shiftKey: true },
        false,
      ),
    ).toEqual({ type: 'resize', axis: 'row', delta: 1 });
    expect(ogeTileLayoutKeyIntent({ key: 'a', ctrlKey: true }, false)).toBe(
      null,
    );
    expect(
      ogeTileLayoutKeyIntent({ key: 'ArrowLeft', altKey: true }, false),
    ).toBe(null);
  });

  it('steps through rects, and by columns while unmeasured', () => {
    const zero: OgeTileLayoutRect[] = Array.from({ length: 6 }, () => ({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    }));
    expect(ogeTileLayoutStep(zero, 1, 'down', 4)).toBe(5);
    expect(ogeTileLayoutStep(zero, 3, 'down', 4)).toBe(5);
    expect(ogeTileLayoutStep(zero, 5, 'up', 4)).toBe(1);
    expect(ogeTileLayoutStep(zero, 0, 'prev', 4)).toBe(-1);
    expect(ogeTileLayoutStep(zero, 2, 'last', 4)).toBe(5);
    // a 2-wide tile above two narrow ones
    const rects: OgeTileLayoutRect[] = [
      { left: 0, top: 0, width: 200, height: 100 },
      { left: 210, top: 0, width: 100, height: 100 },
      { left: 0, top: 110, width: 100, height: 100 },
      { left: 110, top: 110, width: 100, height: 100 },
      { left: 0, top: 220, width: 100, height: 100 },
    ];
    expect(ogeTileLayoutStep(rects, 1, 'down', 3)).toBe(3);
    expect(ogeTileLayoutStep(rects, 2, 'down', 3)).toBe(4);
    expect(ogeTileLayoutStep(rects, 4, 'up', 3)).toBe(2);
    expect(ogeTileLayoutStep(rects, 0, 'up', 3)).toBe(-1);
  });

  it('finds the drop index under or nearest to the pointer', () => {
    const rects: OgeTileLayoutRect[] = [
      { left: 0, top: 0, width: 100, height: 100 },
      { left: 110, top: 0, width: 100, height: 100 },
    ];
    expect(ogeTileLayoutDropIndex(rects, 150, 50, 0)).toBe(1);
    expect(ogeTileLayoutDropIndex(rects, 400, 50, 0)).toBe(1);
    expect(ogeTileLayoutDropIndex([], 1, 1, 3)).toBe(3);
  });

  it('snaps a resize delta to whole tracks, mirrored in RTL', () => {
    const input = {
      start: { colSpan: 1, rowSpan: 1 },
      width: 100,
      height: 100,
      dx: 70,
      dy: 0,
      gap: 10,
      rtl: false,
    };
    expect(ogeTileLayoutResizeSpan(input)).toEqual({ colSpan: 2, rowSpan: 1 });
    expect(ogeTileLayoutResizeSpan({ ...input, rtl: true })).toEqual({
      colSpan: 1,
      rowSpan: 1,
    });
    expect(
      ogeTileLayoutResizeSpan({ ...input, rtl: true, dx: -170, dy: 120 }),
    ).toEqual({ colSpan: 3, rowSpan: 2 });
  });

  it('builds labels, shortcuts and ICU announcements', () => {
    const m = OGE_DEFAULT_TILE_LAYOUT_MESSAGES;
    expect(
      ogeTileLayoutTileLabel({ item: { key: 1 }, index: 2 }, m, 'en-US'),
    ).toBe('Tile 3');
    expect(ogeTileLayoutMovedText(m, 'Sales', 2, 6, 'en-US')).toBe(
      'Sales moved to position 2 of 6',
    );
    expect(
      ogeTileLayoutResizedText(m, 'Sales', { colSpan: 1, rowSpan: 2 }, 'en-US'),
    ).toBe('Sales resized to 1 column by 2 rows');
    expect(ogeTileLayoutShortcuts(true, false)).toBe(
      'Control+ArrowLeft Control+ArrowRight Control+ArrowUp Control+ArrowDown',
    );
    expect(ogeTileLayoutShortcuts(false, false)).toBe(null);
    expect(ogeTileLayoutTabStop([{ key: 'x' }, { key: 'y' }], 'y')).toBe('y');
    expect(ogeTileLayoutTabStop([{ key: 'x' }], 'gone')).toBe('x');
    expect(ogeTileLayoutTabStop([], null)).toBe(null);
  });

  it('builds the grid tracks and merges the config', () => {
    expect(ogeTileLayoutTemplateColumns(3, undefined)).toBe(
      'repeat(3, minmax(0, 1fr))',
    );
    expect(ogeTileLayoutTemplateColumns(2, 180)).toBe('repeat(2, 180px)');
    expect(ogeTileLayoutAutoRows('auto')).toBe('minmax(min-content, auto)');
    expect(ogeTileLayoutAutoRows(120)).toBe('120px');
    const config = resolveOgeTileLayoutConfig({
      columns: 6,
      messages: { layoutLabel: 'Pano' },
    });
    expect(config.columns).toBe(6);
    expect(config.messages.layoutLabel).toBe('Pano');
    expect(config.messages.moved).toBe(m().moved);
  });
});

const m = () => OGE_DEFAULT_TILE_LAYOUT_MESSAGES;

describe('sanitizeOgeTileLayoutState', () => {
  it('keeps the known fields and renumbers the order', () => {
    expect(
      sanitizeOgeTileLayoutState(
        {
          version: 1,
          extra: true,
          tiles: [
            { key: 'b', order: 5, colSpan: 2.7, rowSpan: 0, junk: 1 },
            { key: 'a', order: 1 },
            { key: 'a', order: 9 },
            { key: 'zz', order: 2 },
            { key: {}, order: 3 },
            { key: 'c', order: 'x' },
          ],
        },
        ['a', 'b', 'c'],
      ),
    ).toEqual({
      version: 1,
      tiles: [
        { key: 'a', order: 0, colSpan: 1, rowSpan: 1 },
        { key: 'b', order: 1, colSpan: 2, rowSpan: 1 },
      ],
    });
  });

  it('rejects wrong shapes and prototype keys at any depth', () => {
    expect(sanitizeOgeTileLayoutState(null)).toBe(null);
    expect(sanitizeOgeTileLayoutState([])).toBe(null);
    expect(sanitizeOgeTileLayoutState({ version: 2, tiles: [] })).toBe(null);
    expect(sanitizeOgeTileLayoutState({ version: 1, tiles: {} })).toBe(null);
    expect(
      sanitizeOgeTileLayoutState(
        JSON.parse(
          '{"version":1,"tiles":[{"key":"a","order":0,"__proto__":{"x":1}}]}',
        ),
      ),
    ).toBe(null);
    expect(
      sanitizeOgeTileLayoutState(
        JSON.parse('{"version":1,"tiles":[],"constructor":{}}'),
      ),
    ).toBe(null);
  });

  it('never throws on fuzzed input', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const values = [
      null,
      undefined,
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      '',
      'a',
      true,
      [],
      {},
      'constructor',
    ];
    const pick = () => values[Math.floor(rand() * values.length)];
    const randomValue = (depth: number): unknown => {
      const r = rand();
      if (depth > 3 || r < 0.5) return pick();
      if (r < 0.75)
        return Array.from({ length: 3 }, () => randomValue(depth + 1));
      const obj: Record<string, unknown> = {};
      for (const k of [
        'key',
        'order',
        'colSpan',
        'rowSpan',
        'tiles',
        'version',
      ])
        if (rand() < 0.6) obj[k] = randomValue(depth + 1);
      return obj;
    };
    for (let i = 0; i < 500; i++) {
      const input =
        rand() < 0.5 ? randomValue(0) : { version: 1, tiles: randomValue(1) };
      expect(() => sanitizeOgeTileLayoutState(input, ['a', 0])).not.toThrow();
      const out = sanitizeOgeTileLayoutState(input);
      if (out) {
        expect(out.version).toBe(1);
        for (const t of out.tiles) {
          expect(t.colSpan).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(t.rowSpan)).toBe(true);
        }
      }
    }
  });
});
