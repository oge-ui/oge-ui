import { describe, expect, it } from 'vitest';
import type { RowNode } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OGE_MAX_SCROLL_HEIGHT,
  OgeGridRowVirtualizerCore,
  ogeScrollScale,
} from './grid-row-virtualizer';

/** A plain-closure adapter — proves the machine needs no framework caching. */
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

const ROW = 36;
const VIEWPORT = 540;

/** A windowed (remote) virtualizer over `count` rows of 36px. */
function windowed(count: number) {
  let scrollTop = 0;
  const viewport = { scrollTop: 0, clientHeight: VIEWPORT } as HTMLElement;
  const core = new OgeGridRowVirtualizerCore<{ id: number }>(
    {
      flatNodes: () => [] as readonly RowNode<{ id: number }>[],
      virtualized: () => true,
      scrollTop: () => scrollTop,
      setScrollTop: (value) => {
        scrollTop = value;
      },
      viewportHeight: () => VIEWPORT,
      rowHeight: () => ROW,
      detailRowHeight: () => ROW,
      overscan: () => 0,
      autoRowHeight: () => false,
      viewport: () => viewport,
      windowAdapter: {
        active: () => true,
        count: () => count,
        rows: () => new Map(),
        keyOf: () => (_row, index) => index,
        blockSize: 50,
      },
    },
    rx,
  );
  const scrollTo = (value: number) => {
    scrollTop = value;
    viewport.scrollTop = value;
  };
  return { core, viewport, scrollTo };
}

describe('ogeScrollScale', () => {
  it('is the identity while the rows fit a browser-sized body', () => {
    const scale = ogeScrollScale(1_000_000, VIEWPORT);
    expect(scale.ratio).toBe(1);
    expect(scale.physicalTotal).toBe(1_000_000);
    expect(scale.toVirtual(1234)).toBe(1234);
  });

  it('compresses a taller row space and lines up both ends', () => {
    const total = 36_000_000;
    const scale = ogeScrollScale(total, VIEWPORT);
    expect(scale.physicalTotal).toBe(OGE_MAX_SCROLL_HEIGHT);
    expect(scale.ratio).toBeGreaterThan(2);
    expect(scale.toVirtual(0)).toBe(0);
    // the physical bottom is the virtual bottom
    expect(scale.toVirtual(OGE_MAX_SCROLL_HEIGHT - VIEWPORT)).toBeCloseTo(
      total - VIEWPORT,
      3,
    );
    expect(scale.toPhysical(scale.toVirtual(4321))).toBeCloseTo(4321, 6);
  });
});

describe('OgeGridRowVirtualizerCore — a million rows', () => {
  it('keeps the body inside what every browser lays out', () => {
    const { core } = windowed(1_000_000);
    expect(core.bodyHeight()).toBe(OGE_MAX_SCROLL_HEIGHT);
  });

  it('reaches the middle and the very last row by scrolling', () => {
    const { core, scrollTo } = windowed(1_000_000);
    scrollTo(OGE_MAX_SCROLL_HEIGHT / 2);
    const middle = core.viewStart();
    expect(middle).toBeGreaterThan(490_000);
    expect(middle).toBeLessThan(510_000);

    scrollTo(OGE_MAX_SCROLL_HEIGHT - VIEWPORT);
    const window = core.viewWindow();
    expect(window?.end).toBe(1_000_000);
    // the rows end exactly at the bottom of the compressed body
    expect((window?.offsetY ?? 0) + (window!.end - window!.start) * ROW).toBe(
      OGE_MAX_SCROLL_HEIGHT,
    );
  });

  it('places the rendered rows at the physical scroll position', () => {
    const { core, scrollTo } = windowed(1_000_000);
    const top = 7_000_000;
    scrollTo(top);
    const window = core.viewWindow()!;
    // the first rendered row starts at most one row above the viewport top
    expect(window.offsetY).toBeLessThanOrEqual(top);
    expect(window.offsetY).toBeGreaterThan(top - ROW);
    expect(core.rowsTransform()).toBe(`translateY(${window.offsetY}px)`);
  });

  it('scrolls a far row into view through the scale', () => {
    const { core, viewport } = windowed(1_000_000);
    core.scrollRowIntoView(999_999);
    expect(viewport.scrollTop).toBeCloseTo(OGE_MAX_SCROLL_HEIGHT - VIEWPORT, 3);
  });

  it('leaves a body that fits untouched', () => {
    const { core, scrollTo } = windowed(10_000);
    expect(core.bodyHeight()).toBe(360_000);
    scrollTo(36_000);
    expect(core.viewStart()).toBe(1000);
    expect(core.viewWindow()?.offsetY).toBe(36_000);
  });
});
