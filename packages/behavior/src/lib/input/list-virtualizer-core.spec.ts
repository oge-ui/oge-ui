import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OGE_SELECT_OPTION_HEIGHT,
  OgeListVirtualizerCore,
  type OgeListVirtualizerDeps,
} from './list-virtualizer-core';
import type { OgeReactiveCell, OgeReactivityAdapter } from './select-list-core';

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

function harness(overrides: Partial<OgeListVirtualizerDeps> = {}) {
  const el = document.createElement('div');
  const state = { itemCount: 1000, itemHeight: 34, overscan: 4, viewport: 340 };
  const deps: OgeListVirtualizerDeps = {
    itemCount: () => state.itemCount,
    itemHeight: () => state.itemHeight,
    overscan: () => state.overscan,
    viewportHeight: () => state.viewport,
    scrollContainer: () => el,
    ...overrides,
  };
  return { core: new OgeListVirtualizerCore(deps, rx), state, el };
}

afterEach(() => vi.restoreAllMocks());

describe('OGE_SELECT_OPTION_HEIGHT', () => {
  it('carries one row height per field size', () => {
    expect(OGE_SELECT_OPTION_HEIGHT).toEqual({ sm: 28, md: 34, lg: 40 });
  });
});

describe('window', () => {
  it('starts at the top and spans the viewport plus overscan', () => {
    const { core } = harness();
    const win = core.window();
    expect(win.start).toBe(0);
    expect(win.offsetY).toBe(0);
    expect(win.totalHeight).toBe(1000 * 34);
    // 340 / 34 = 10 rows visible, plus 4 overscan below
    expect(win.end).toBeGreaterThanOrEqual(10);
  });

  it('follows the scroll offset', () => {
    const { core } = harness();
    core.scrollTop.set(3400); // 100 rows down
    const win = core.window();
    expect(win.start).toBeLessThanOrEqual(100);
    expect(win.start).toBeGreaterThan(90); // overscan, not the whole list
    expect(win.end).toBeGreaterThan(100);
    expect(win.offsetY).toBe(win.start * 34);
  });

  it('re-reads the item count, so a filtered list reshapes the spacer', () => {
    const { core, state } = harness();
    state.itemCount = 3;
    expect(core.window().totalHeight).toBe(3 * 34);
    expect(core.window().end).toBeLessThanOrEqual(3);
  });

  it('handles an empty list without producing a negative window', () => {
    const { core, state } = harness();
    state.itemCount = 0;
    const win = core.window();
    expect(win.totalHeight).toBe(0);
    expect(win.end).toBeGreaterThanOrEqual(win.start);
  });
});

describe('onScroll / reset', () => {
  it('reads the scroll offset off the event target', () => {
    const { core, el } = harness();
    el.scrollTop = 200;
    core.onScroll({ target: el } as unknown as Event);
    expect(core.scrollTop()).toBe(200);
  });

  it('returns to the top when the popup closes or the filter changes', () => {
    const { core } = harness();
    core.scrollTop.set(900);
    core.reset();
    expect(core.scrollTop()).toBe(0);
  });
});

describe('scrollToIndex', () => {
  it('scrolls up so the row sits at the top edge', () => {
    const { core } = harness();
    core.scrollTop.set(1000);
    core.scrollToIndex(5);
    expect(core.scrollTop()).toBe(5 * 34);
  });

  it('scrolls down only far enough to reveal the row at the bottom edge', () => {
    const { core } = harness();
    core.scrollToIndex(20);
    expect(core.scrollTop()).toBe(21 * 34 - 340);
  });

  it('does nothing when the row is already inside the viewport', () => {
    const { core, el } = harness();
    core.scrollTop.set(0);
    el.scrollTop = 0;
    core.scrollToIndex(3);
    expect(core.scrollTop()).toBe(0);
  });

  it('writes the DOM offset a frame later — the list renders after the popup opens', async () => {
    const { core, el } = harness();
    core.scrollToIndex(20);
    expect(el.scrollTop).toBe(0); // not written synchronously
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(el.scrollTop).toBe(21 * 34 - 340);
  });

  it('survives a closed popup, where there is no list element yet', async () => {
    const { core } = harness({ scrollContainer: () => null });
    expect(() => core.scrollToIndex(20)).not.toThrow();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(core.scrollTop()).toBe(21 * 34 - 340);
  });
});
