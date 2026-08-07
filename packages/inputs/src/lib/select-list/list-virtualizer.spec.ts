import { signal } from '@angular/core';
import {
  ListVirtualizerModel,
  OGE_SELECT_OPTION_HEIGHT,
  type ListVirtualizerDeps,
} from './list-virtualizer';

function makeModel(
  overrides: Partial<ListVirtualizerDeps> = {},
): ListVirtualizerModel {
  return new ListVirtualizerModel({
    itemCount: () => 1000,
    itemHeight: () => 34,
    overscan: () => 4,
    viewportHeight: () => 200,
    scrollContainer: () => null,
    ...overrides,
  });
}

describe('ListVirtualizerModel', () => {
  beforeEach(() => {
    // async stub — keeps the deferred DOM write awaitable via setTimeout(0)
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('windows the list around the scroll offset with overscan', () => {
    const model = makeModel();
    const top = model.window();
    expect(top.start).toBe(0);
    expect(top.totalHeight).toBe(1000 * 34);
    // 200px viewport at 34px rows → ~6 visible + 1 partial + 2×4 overscan
    expect(top.end - top.start).toBeLessThan(20);

    model.scrollTop.set(340); // exactly 10 rows down
    const scrolled = model.window();
    expect(scrolled.start).toBe(10 - 4);
    expect(scrolled.offsetY).toBe((10 - 4) * 34);
  });

  it('reacts to itemCount changes through the signal graph', () => {
    const count = signal(10);
    const model = makeModel({ itemCount: () => count() });
    expect(model.window().totalHeight).toBe(10 * 34);
    count.set(50);
    expect(model.window().totalHeight).toBe(50 * 34);
  });

  it('scrollToIndex scrolls down only far enough to reveal the row', () => {
    const model = makeModel();
    model.scrollToIndex(100);
    // bottom-aligned: (100 + 1) * 34 - 200
    expect(model.scrollTop()).toBe(101 * 34 - 200);
  });

  it('scrollToIndex scrolls up to the row top and skips no-op moves', () => {
    const model = makeModel();
    model.scrollTop.set(1000);
    model.scrollToIndex(5);
    expect(model.scrollTop()).toBe(5 * 34);
    const before = model.scrollTop();
    model.scrollToIndex(6); // already visible
    expect(model.scrollTop()).toBe(before);
  });

  it('mirrors the deferred scroll into the container element', async () => {
    const el = { scrollTop: 0 } as HTMLElement;
    const model = makeModel({ scrollContainer: () => el });
    model.scrollToIndex(100);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.scrollTop).toBe(model.scrollTop());
  });

  it('reset returns to the top', () => {
    const model = makeModel();
    model.scrollTop.set(500);
    model.reset();
    expect(model.window().start).toBe(0);
  });

  it('exposes size-matched default row heights', () => {
    expect(OGE_SELECT_OPTION_HEIGHT.sm).toBeLessThan(
      OGE_SELECT_OPTION_HEIGHT.md,
    );
    expect(OGE_SELECT_OPTION_HEIGHT.md).toBeLessThan(
      OGE_SELECT_OPTION_HEIGHT.lg,
    );
  });
});
