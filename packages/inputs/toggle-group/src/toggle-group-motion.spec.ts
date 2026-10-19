import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeToggleGroup } from './toggle-group';

@Component({
  imports: [OgeToggleGroup],
  template: `
    <oge-toggle-group
      label="Alignment"
      [items]="items"
      [selectionMode]="mode()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = ['Left', 'Center', 'Right'];
  readonly mode = signal<'single' | 'multiple'>('single');
  readonly value = signal<unknown>('Left');
}

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

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const segments = (fixture: ComponentFixture<unknown>): HTMLButtonElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('.oge-toggle-group-item'));

const track = (fixture: ComponentFixture<unknown>): HTMLElement =>
  fixture.nativeElement.querySelector('.oge-toggle-group-track');

describe('OgeToggleGroup selection pill', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('does nothing without the Web Animations API (jsdom)', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    segments(fixture)[2].click();
    await settle(fixture);
    expect(track(fixture).querySelector('.oge-toggle-group-pill')).toBeNull();
    expect(track(fixture).hasAttribute('data-oge-indicator-glide')).toBe(false);
  });

  it('slides one pill from the old segment to the new one', async () => {
    stub = stubMotion();
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    // the first render never glides
    expect(stub.calls).toHaveLength(0);
    segments(fixture)[2].click();
    await settle(fixture);
    const pill = track(fixture).querySelector<HTMLElement>(
      '.oge-toggle-group-pill',
    );
    expect(pill?.getAttribute('aria-hidden')).toBe('true');
    expect(track(fixture).getAttribute('data-oge-indicator-glide')).toBe('run');
    // from segment 0 (left 0) to segment 2 (left 120): starts 120px back
    expect(stub.calls[0].el).toBe(pill);
    expect(stub.calls[0].keyframes[0].transform).toBe(
      'translate(-120px, 0px) scale(1, 1)',
    );
    // the CSS selection already moved — the pill is decoration only
    expect(segments(fixture)[2].getAttribute('aria-checked')).toBe('true');
    fixture.destroy();
    expect(document.querySelector('.oge-toggle-group-pill')).toBeNull();
  });

  it('never glides in multiple mode', async () => {
    stub = stubMotion();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.mode.set('multiple');
    fixture.componentInstance.value.set(['Left']);
    await settle(fixture);
    segments(fixture)[1].click();
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
  });
});
