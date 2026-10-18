import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTransferList } from './transfer-list';

/**
 * jsdom has neither layout nor the Web Animations API: stack each pane's
 * options (the target pane 500px to the right) and record `animate` calls.
 */
function stubMotion() {
  const calls: { el: Element; keyframes: Keyframe[] }[] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const animate = proto.animate;
  const rect = Element.prototype.getBoundingClientRect;
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return {
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
      finish: () => undefined,
    };
  };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    let left = 0;
    let top = 0;
    const pane = this.closest('[data-oge-transfer-side]');
    if (pane && this.classList.contains('oge-list-box-option')) {
      if (pane.getAttribute('data-oge-transfer-side') === 'target') left = 500;
      top =
        Array.from(pane.querySelectorAll('.oge-list-box-option')).indexOf(
          this,
        ) * 30;
    }
    return {
      left,
      top,
      width: 200,
      height: 30,
      right: left + 200,
      bottom: top + 30,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      Element.prototype.getBoundingClientRect = rect;
    },
  };
}

@Component({
  imports: [OgeTransferList],
  template: `<oge-transfer-list
    label="Letters"
    [items]="items"
    [(value)]="value"
  />`,
})
class Host {
  readonly items = ['A', 'B', 'C'];
  readonly value = signal<readonly unknown[]>([]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function addAll(f: ComponentFixture<Host>): void {
  const button = Array.from(
    f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLElement>,
  ).find((b) => b.getAttribute('aria-label') === 'Add all');
  button?.click();
}

describe('OgeTransferList — move motion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('moves without any animation in jsdom', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    addAll(f);
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['A', 'B', 'C']);
    expect(
      f.nativeElement
        .querySelector('.oge-transfer-list')
        ?.hasAttribute('data-oge-animating'),
    ).toBe(false);
  });

  it('glides moved items from their slot in one list to the other', async () => {
    stub = stubMotion();
    const f = TestBed.createComponent(Host);
    await settle(f);
    addAll(f);
    await settle(f);
    expect(f.componentInstance.value()).toEqual(['A', 'B', 'C']);
    const moves = stub.calls.map((call) => ({
      text: call.el.textContent?.trim(),
      from: call.keyframes[0].transform,
    }));
    // same rows, one pane to the left: each starts 500px back
    expect(moves).toEqual([
      { text: 'A', from: 'translate(-500px, 0px)' },
      { text: 'B', from: 'translate(-500px, 0px)' },
      { text: 'C', from: 'translate(-500px, 0px)' },
    ]);
  });
});
