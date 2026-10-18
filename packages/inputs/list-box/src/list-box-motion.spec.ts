import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeListBox } from './list-box';

/**
 * jsdom has neither layout nor the Web Animations API: lay elements out in a
 * row by their index among same-class elements, and record `animate` calls.
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
    const cls = this.classList[0];
    const i = cls
      ? Array.from(document.getElementsByClassName(cls)).indexOf(this)
      : 0;
    return {
      left: i * 60,
      top: 0,
      width: 50,
      height: 30,
      right: i * 60 + 50,
      bottom: 30,
      x: i * 60,
      y: 0,
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
  imports: [OgeListBox],
  template: `
    <oge-list-box label="Cities" [items]="items" [allowReordering]="true" />
  `,
})
class Host {
  readonly items = ['Ankara', 'Berlin', 'Bonn'];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const list = (f: ComponentFixture<Host>) =>
  f.nativeElement.querySelector('[role="listbox"]') as HTMLElement;

async function altDown(f: ComponentFixture<Host>): Promise<void> {
  list(f).focus();
  list(f).dispatchEvent(new FocusEvent('focus'));
  await settle(f);
  list(f).dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle(f);
}

describe('OgeListBox — reorder motion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('reorders without any animation in jsdom', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    await altDown(f);
    expect(list(f).hasAttribute('data-oge-animating')).toBe(false);
  });

  it('glides the swapped options from their old slots', async () => {
    stub = stubMotion();
    const f = TestBed.createComponent(Host);
    await settle(f);
    await altDown(f);
    const options = Array.from(
      list(f).querySelectorAll<HTMLElement>('[role="option"]'),
    );
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'Berlin',
      'Ankara',
      'Bonn',
    ]);
    const moves = stub.calls.map((call) => ({
      text: call.el.textContent?.trim(),
      from: call.keyframes[0].transform,
    }));
    // Ankara left slot 0 for slot 1, Berlin the other way; Bonn stayed
    expect(moves).toEqual([
      { text: 'Berlin', from: 'translate(60px, 0px)' },
      { text: 'Ankara', from: 'translate(-60px, 0px)' },
    ]);
    expect(list(f).hasAttribute('data-oge-animating')).toBe(true);
  });
});
