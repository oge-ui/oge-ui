import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeGridColumnLayoutCore,
  ogePinnedEdgeClass,
  ogePinnedScrollShadows,
  ogeSyncPinnedShadows,
  type OgeGridLayoutColumn,
} from './grid-column-layout';

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

const col = (
  id: string,
  pinned: OgeGridLayoutColumn['pinned'] = false,
): OgeGridLayoutColumn => ({ id, width: 100, minWidth: undefined, pinned });

function layout(columns: OgeGridLayoutColumn[]) {
  return new OgeGridColumnLayoutCore(
    {
      resolvedColumns: () => columns,
      colVirtualized: () => false,
      scrollLeft: () => 0,
      hostWidth: () => 800,
      leadingTracks: () => [],
      trailingTracks: () => [],
      leadingWidth: () => 0,
      defaultMinWidth: () => 80,
      pinnedDefaultWidth: () => 120,
    },
    rx,
  );
}

describe('pinned edges', () => {
  it('marks the last start-pinned and the first end-pinned column', () => {
    const columns = [
      col('a', 'left'),
      col('b', 'left'),
      col('c'),
      col('d', 'right'),
      col('e', 'right'),
    ];
    const core = layout(columns);
    expect(core.pinnedEdges()).toEqual({ start: 'b', end: 'd' });
    expect(columns.map((c) => core.pinnedEdgeOf(c))).toEqual([
      null,
      'start',
      null,
      'end',
      null,
    ]);
    expect(ogePinnedEdgeClass('start')).toBe('oge-pin-edge-start');
    expect(ogePinnedEdgeClass(null)).toBe('');
  });

  it('has no edges without pinned columns', () => {
    expect(layout([col('a'), col('b')]).pinnedEdges()).toEqual({
      start: null,
      end: null,
    });
  });
});

describe('ogePinnedScrollShadows', () => {
  const at = (scrollLeft: number) =>
    ogePinnedScrollShadows({ scrollLeft, scrollWidth: 1000, clientWidth: 400 });

  it('shows the start shadow once scrolled and the end one while content remains', () => {
    expect(at(0)).toEqual({ start: false, end: true });
    expect(at(200)).toEqual({ start: true, end: true });
    expect(at(600)).toEqual({ start: true, end: false });
  });

  it('reads a right-to-left scroller (negative scrollLeft) the same way', () => {
    expect(at(-200)).toEqual({ start: true, end: true });
    expect(at(-600)).toEqual({ start: true, end: false });
  });

  it('shows nothing when nothing overflows', () => {
    expect(
      ogePinnedScrollShadows({
        scrollLeft: 0,
        scrollWidth: 400,
        clientWidth: 400,
      }),
    ).toEqual({ start: false, end: false });
  });

  it('toggles the viewport classes', () => {
    const viewport = document.createElement('div');
    Object.defineProperty(viewport, 'scrollWidth', { value: 1000 });
    Object.defineProperty(viewport, 'clientWidth', { value: 400 });
    ogeSyncPinnedShadows(viewport);
    expect(viewport.classList.contains('oge-pin-shadow-start')).toBe(false);
    expect(viewport.classList.contains('oge-pin-shadow-end')).toBe(true);
    ogeSyncPinnedShadows(null); // no viewport yet: a no-op
  });
});
