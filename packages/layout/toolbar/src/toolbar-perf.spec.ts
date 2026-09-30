import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import type { OgeToolbarItemData } from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeToolbar],
  template: `<oge-toolbar [items]="items()" />`,
})
class PerfHost {
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
    { key: 'c', text: 'Gamma' },
    { key: 'd', text: 'Delta' },
  ]);
}

/**
 * The resize budget. A drag-resize notifies once per frame for the length of
 * the gesture, so anything the toolbar reads there is multiplied by the drag.
 * Two things must therefore stay out of that path: `getComputedStyle` (padding
 * and gap come from custom properties that a width change cannot move) and the
 * per-item layout reads (an item's own size is independent of the container's).
 */
describe('OgeToolbar resize budget', () => {
  let styleCalls = 0;
  let itemSizeReads = 0;
  let resize: (() => void) | undefined;
  let frames: FrameRequestCallback[] = [];
  const restore: Array<() => void> = [];

  beforeEach(() => {
    styleCalls = 0;
    itemSizeReads = 0;
    frames = [];
    resize = undefined;

    const realStyle = window.getComputedStyle.bind(window);
    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(((
      el: Element,
      pseudo?: string | null,
    ) => {
      styleCalls++;
      return realStyle(el, pseudo ?? undefined);
    }) as typeof window.getComputedStyle);
    restore.push(() => styleSpy.mockRestore());

    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      });
    restore.push(() => rafSpy.mockRestore());

    // jsdom ships no ResizeObserver, so the resize path is unreachable without
    // one; this stands in for it and hands the spec the notification callback.
    const previous = (globalThis as Record<string, unknown>).ResizeObserver;
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      constructor(cb: () => void) {
        resize = cb;
      }
      // the stub only needs to hand over the callback; observing and
      // disconnecting have nothing to do in a layout-free environment
      observe(): void {
        return undefined;
      }
      disconnect(): void {
        return undefined;
      }
    };
    restore.push(() => {
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    });

    const proto = HTMLElement.prototype;
    const offsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    Object.defineProperty(proto, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        if (this.classList.contains('oge-toolbar-item')) {
          itemSizeReads++;
          return 50;
        }
        return this.classList.contains('oge-toolbar-menu-btn') ? 32 : 0;
      },
    });
    restore.push(() => {
      if (offsetWidth) Object.defineProperty(proto, 'offsetWidth', offsetWidth);
    });
  });

  afterEach(() => {
    while (restore.length) restore.pop()?.();
  });

  function flushFrames(): void {
    const pending = frames;
    frames = [];
    pending.forEach((cb) => cb(0));
  }

  it('reads neither style nor item sizes across a burst of resizes', async () => {
    const fixture = TestBed.createComponent(PerfHost);
    await settle(fixture);
    expect(resize).toBeDefined();

    styleCalls = 0;
    itemSizeReads = 0;
    for (let i = 0; i < 40; i++) {
      resize?.();
      flushFrames();
    }

    expect(styleCalls).toBe(0);
    expect(itemSizeReads).toBe(0);
  });

  it('coalesces a burst of resize notifications into one pass per frame', async () => {
    const fixture = TestBed.createComponent(PerfHost);
    await settle(fixture);

    frames = [];
    for (let i = 0; i < 10; i++) resize?.();
    // Ten notifications inside one frame schedule exactly one pass.
    expect(frames.length).toBe(1);
  });

  it('still re-measures items when the content changes', async () => {
    const fixture = TestBed.createComponent(PerfHost);
    await settle(fixture);

    itemSizeReads = 0;
    fixture.componentInstance.items.set([
      { key: 'a', text: 'Alpha' },
      { key: 'e', text: 'Epsilon' },
    ]);
    await settle(fixture);
    expect(itemSizeReads).toBeGreaterThan(0);
  });
});
