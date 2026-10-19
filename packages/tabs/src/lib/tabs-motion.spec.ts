import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTabs } from './tabs';
import type { OgeTabItem, OgeTabsIndicatorFit } from './tabs-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

interface AnimateCall {
  el: Element;
  keyframes: Keyframe[];
}

/** jsdom has no Web Animations API (motion off) — a stub turns it on. */
function stubAnimate(): { calls: AnimateCall[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  const calls: AnimateCall[] = [];
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  return {
    calls,
    restore() {
      if (original === undefined) delete proto.animate;
      else proto.animate = original;
    },
  };
}

/**
 * Lays each tab out by its current DOM position — 100px slots — and gives
 * it the underline border the stylesheet would (jsdom loads no SCSS).
 */
function layOut(tabs: readonly HTMLElement[]): void {
  for (const tab of tabs) {
    tab.style.borderBottom = '2px solid transparent';
    tab.getBoundingClientRect = () => {
      const index = Array.from(tab.parentElement?.children ?? []).indexOf(tab);
      return {
        x: index * 100,
        y: 0,
        left: index * 100,
        right: index * 100 + 100,
        top: 0,
        bottom: 30,
        width: 100,
        height: 30,
        toJSON: () => ({}),
      } as DOMRect;
    };
  }
}

function pointer(type: string, x: number): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

@Component({
  imports: [OgeTabs],
  template: `
    <oge-tabs
      [items]="items()"
      [(selectedIndex)]="index"
      [indicatorFit]="fit()"
      [allowTabReordering]="true"
    />
  `,
})
class MotionHost {
  readonly items = signal<readonly OgeTabItem[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
    { key: 'c', text: 'Gamma' },
  ]);
  readonly index = signal(0);
  readonly fit = signal<OgeTabsIndicatorFit>('tab');
}

describe('OgeTabs motion', () => {
  let stub: ReturnType<typeof stubAnimate> | null = null;

  afterEach(() => {
    stub?.restore();
    stub = null;
  });

  async function render() {
    const fixture = TestBed.createComponent(MotionHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const tabs = () => Array.from(el.querySelectorAll<HTMLElement>('.oge-tab'));
    const list = el.querySelector<HTMLElement>('.oge-tab-strip-list')!;
    layOut(tabs());
    return { fixture, host: fixture.componentInstance, el, tabs, list };
  }

  const glides = (calls: AnimateCall[]) =>
    calls.filter((c) => c.el.classList.contains('oge-tab-ink-glide'));

  it('never glides on the first render', async () => {
    stub = stubAnimate();
    const { el } = await render();
    expect(el.querySelector('.oge-tab-ink-glide')).toBeNull();
    expect(glides(stub.calls)).toHaveLength(0);
  });

  it('slides one ink bar from the old tab to the new one', async () => {
    stub = stubAnimate();
    const { fixture, host, list } = await render();
    host.index.set(2);
    await settle(fixture);
    const bar = list.querySelector<HTMLElement>('.oge-tab-ink-glide');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(list.getAttribute('data-oge-indicator-glide')).toBe('run');
    const [glide] = glides(stub.calls);
    expect(glide.keyframes[0].transform).toBe(
      'translate(-200px, 0px) scale(1, 1)',
    );
    expect(glide.keyframes[1].transform).toBe('none');
  });

  it('just jumps without the Web Animations API (jsdom)', async () => {
    const { fixture, host, list } = await render();
    host.index.set(1);
    await settle(fixture);
    expect(list.querySelector('.oge-tab-ink-glide')).toBeNull();
    expect(list.hasAttribute('data-oge-indicator-glide')).toBe(false);
  });

  it('just jumps under reduced motion', async () => {
    stub = stubAnimate();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as unknown as typeof window.matchMedia;
    try {
      const { fixture, host, list } = await render();
      host.index.set(1);
      await settle(fixture);
      expect(list.querySelector('.oge-tab-ink-glide')).toBeNull();
      expect(glides(stub.calls)).toHaveLength(0);
    } finally {
      window.matchMedia = original;
    }
  });

  it('FLIPs the tabs a drag reorder moved', async () => {
    stub = stubAnimate();
    const { fixture, tabs } = await render();
    const alpha = tabs()[0];
    alpha.dispatchEvent(pointer('pointerdown', 10));
    alpha.dispatchEvent(pointer('pointermove', 15));
    alpha.dispatchEvent(pointer('pointermove', 280));
    await settle(fixture);
    alpha.dispatchEvent(pointer('pointerup', 280));
    await settle(fixture);
    expect(tabs().map((t) => t.textContent?.trim())).toEqual([
      'Beta',
      'Gamma',
      'Alpha',
    ]);
    const moves = stub.calls.filter((c) => c.el.classList.contains('oge-tab'));
    // Alpha travelled 200px to the right, Beta and Gamma 100px to the left
    expect(
      moves.map((c) => [c.el.textContent?.trim(), c.keyframes[0].transform]),
    ).toEqual([
      ['Beta', 'translate(100px, 0px)'],
      ['Gamma', 'translate(100px, 0px)'],
      ['Alpha', 'translate(-200px, 0px)'],
    ]);
  });
});
