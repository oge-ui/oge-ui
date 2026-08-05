import { signal } from '@angular/core';
import { ColumnLayoutModel } from './column-layout-model';
import type { ResolvedColumn } from './column-model';

/** Minimal column stub — the layout model only reads id/width/minWidth/pinned/absIndex. */
function col(
  id: string,
  over: Partial<
    Pick<ResolvedColumn, 'width' | 'minWidth' | 'pinned' | 'absIndex'>
  > = {},
): ResolvedColumn {
  return { id, pinned: false, absIndex: 0, ...over } as ResolvedColumn;
}

interface LayoutOverrides {
  colVirtualized?: boolean;
  scrollLeft?: number;
  hostWidth?: number;
  leadingTracks?: readonly string[];
  trailingTracks?: readonly string[];
  leadingWidth?: number;
  defaultMinWidth?: number;
  pinnedDefaultWidth?: number;
}

function createLayout(
  columns: readonly ResolvedColumn[],
  over: LayoutOverrides = {},
) {
  const deps = {
    resolvedColumns: signal(columns),
    colVirtualized: signal(over.colVirtualized ?? false),
    scrollLeft: signal(over.scrollLeft ?? 0),
    hostWidth: signal(over.hostWidth ?? 500),
    leadingTracks: signal(over.leadingTracks ?? []),
    trailingTracks: signal(over.trailingTracks ?? []),
    leadingWidth: signal(over.leadingWidth ?? 0),
    defaultMinWidth: signal(over.defaultMinWidth ?? 80),
    pinnedDefaultWidth: signal(over.pinnedDefaultWidth ?? 120),
  };
  return { deps, layout: new ColumnLayoutModel(deps) };
}

/** 20 numeric 100px columns for the virtualization tests. */
const uniformColumns = Array.from({ length: 20 }, (_, i) =>
  col(`c${i}`, { width: 100, absIndex: i }),
);

describe('ColumnLayoutModel', () => {
  describe('colWidths', () => {
    it('uses numeric width, then minWidth, then the default min width', () => {
      const { layout } = createLayout(
        [
          col('a', { width: 100 }),
          col('b', { minWidth: 60 }),
          col('c'),
          col('d', { width: '2fr', minWidth: 55 }), // string widths fall back to min
        ],
        { defaultMinWidth: 80 },
      );
      expect(layout.colWidths()).toEqual([100, 60, 80, 55]);
    });
  });

  describe('gridTemplateColumns (not virtualized)', () => {
    it('joins leading tracks, column tracks and trailing tracks', () => {
      const { layout } = createLayout(
        [
          col('num', { width: 100 }),
          col('str', { width: '2fr' }),
          col('pin', { pinned: 'left' }),
          col('min', { minWidth: 60 }),
          col('plain'),
        ],
        {
          leadingTracks: ['32px', '28px'],
          trailingTracks: ['90px'],
          defaultMinWidth: 80,
          pinnedDefaultWidth: 120,
        },
      );
      expect(layout.gridTemplateColumns()).toBe(
        '32px 28px 100px 2fr 120px minmax(60px, 1fr) minmax(80px, 1fr) 90px',
      );
    });

    it('keeps an explicit width on a pinned column instead of the pinned default', () => {
      const { layout } = createLayout([
        col('pin', { width: 70, pinned: 'left' }),
      ]);
      expect(layout.gridTemplateColumns()).toBe('70px');
    });
  });

  describe('pinnedOffsets', () => {
    const columns = [
      col('l1', { width: 100, pinned: 'left' }),
      col('mid'),
      col('l2', { pinned: 'left' }), // no numeric width → pinnedDefaultWidth
      col('r1', { width: 70, pinned: 'right' }),
      col('r2', { pinned: 'right' }),
    ];

    it('chains left offsets from the leading width and right offsets from 0', () => {
      const { layout } = createLayout(columns, {
        leadingWidth: 40,
        pinnedDefaultWidth: 120,
      });
      expect(layout.pinnedOffsets().get('l1')).toEqual({ left: 40 });
      expect(layout.pinnedOffsets().get('l2')).toEqual({ left: 140 });
      // right chain walks the columns in reverse: r2 sits at the edge
      expect(layout.pinnedOffsets().get('r2')).toEqual({ right: 0 });
      expect(layout.pinnedOffsets().get('r1')).toEqual({ right: 120 });
      expect(layout.pinnedOffsets().has('mid')).toBe(false);
    });

    it('exposes per-column lookups that return null for unpinned columns', () => {
      const { layout } = createLayout(columns, { leadingWidth: 40 });
      expect(layout.pinnedLeftOf(columns[0])).toBe(40);
      expect(layout.pinnedRightOf(columns[3])).toBe(120);
      expect(layout.pinnedLeftOf(columns[1])).toBeNull();
      expect(layout.pinnedRightOf(columns[1])).toBeNull();
      expect(layout.pinnedRightOf(columns[0])).toBeNull();
    });
  });

  describe('column virtualization window', () => {
    it('renders everything and reports zero spacers when colVirtualized is false', () => {
      const { deps, layout } = createLayout(uniformColumns, {
        colVirtualized: false,
      });
      expect(layout.renderColumns()).toBe(deps.resolvedColumns());
      expect(layout.colSpacerLeft()).toBe(0);
      expect(layout.colSpacerRight()).toBe(0);
    });

    it('windows from the first column at scrollLeft 0', () => {
      const { layout } = createLayout(uniformColumns, {
        colVirtualized: true,
        scrollLeft: 0,
        hostWidth: 500,
        leadingWidth: 50,
        leadingTracks: ['50px'],
      });
      // viewRight = 0 + 500 + 200 overscan; x starts at leadingWidth 50 → 7 columns fit
      expect(layout.renderColumns().map((c) => c.id)).toEqual([
        'c0',
        'c1',
        'c2',
        'c3',
        'c4',
        'c5',
        'c6',
      ]);
      expect(layout.colSpacerLeft()).toBe(0);
      expect(layout.colSpacerRight()).toBe(1300);
      expect(layout.gridTemplateColumns()).toBe(
        ['50px', ...Array(7).fill('100px'), '1300px'].join(' '),
      );
    });

    it('emits both spacers for a mid-scroll window and tracks scrollLeft updates', () => {
      const { deps, layout } = createLayout(uniformColumns, {
        colVirtualized: true,
        scrollLeft: 1000,
        hostWidth: 500,
        leadingWidth: 50,
      });
      // viewLeft = 800, viewRight = 1700 → columns 7..16 rendered
      expect(layout.renderColumns().map((c) => c.id)).toEqual([
        'c7',
        'c8',
        'c9',
        'c10',
        'c11',
        'c12',
        'c13',
        'c14',
        'c15',
        'c16',
      ]);
      expect(layout.colSpacerLeft()).toBe(700);
      expect(layout.colSpacerRight()).toBe(300);
      expect(layout.gridTemplateColumns()).toBe(
        ['700px', ...Array(10).fill('100px'), '300px'].join(' '),
      );

      deps.scrollLeft.set(0);
      expect(layout.renderColumns()[0].id).toBe('c0');
      expect(layout.colSpacerLeft()).toBe(0);
    });

    it('drops the right spacer when scrolled to the far right', () => {
      // content = 50 leading + 2000 columns; hostWidth 500 → max scrollLeft 1550
      const { layout } = createLayout(uniformColumns, {
        colVirtualized: true,
        scrollLeft: 1550,
        hostWidth: 500,
        leadingWidth: 50,
      });
      expect(layout.renderColumns().map((c) => c.id)).toEqual([
        'c13',
        'c14',
        'c15',
        'c16',
        'c17',
        'c18',
        'c19',
      ]);
      expect(layout.colSpacerLeft()).toBe(1300);
      expect(layout.colSpacerRight()).toBe(0);
    });

    it('falls back to a 1200px viewport when hostWidth is 0', () => {
      const { layout } = createLayout(uniformColumns, {
        colVirtualized: true,
        scrollLeft: 0,
        hostWidth: 0,
        leadingWidth: 50,
      });
      // viewRight = 0 + 1200 + 200 → columns until x >= 1400 → 14 columns
      expect(layout.renderColumns()).toHaveLength(14);
    });
  });
});
