import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from '../button/button';
import { OgeButtonGroup } from './button-group';

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

@Component({
  imports: [OgeButton, OgeButtonGroup],
  template: `
    <oge-button-group
      [selectionMode]="mode()"
      [(selectedKeys)]="keys"
      ariaLabel="Align"
    >
      <oge-button value="left" text="Left" />
      <oge-button value="center" text="Center" />
      <oge-button value="right" text="Right" [severity]="rightSeverity()" />
    </oge-button-group>
  `,
})
class Host {
  readonly mode = signal<'none' | 'single' | 'multiple'>('single');
  readonly keys = signal<readonly string[]>(['left']);
  readonly rightSeverity = signal<'normal' | 'danger'>('normal');
}

const natives = (fixture: ComponentFixture<unknown>): HTMLButtonElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll('.oge-button-native'));

const group = (fixture: ComponentFixture<unknown>): HTMLElement =>
  fixture.nativeElement.querySelector('.oge-button-group');

describe('OgeButtonGroup selection pill', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('slides one pill from the old segment to the new one (single mode)', async () => {
    stub = stubMotion();
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
    natives(fixture)[2].click();
    await settle(fixture);
    const pill = group(fixture).querySelector<HTMLElement>(
      ':scope > .oge-button-group-pill',
    );
    expect(pill).not.toBeNull();
    expect(group(fixture).getAttribute('data-oge-indicator-glide')).toBe('run');
    expect(stub.calls[0].keyframes[0].transform).toBe(
      'translate(-120px, 0px) scale(1, 1)',
    );
    expect(fixture.componentInstance.keys()).toEqual(['right']);
    fixture.destroy();
    expect(document.querySelector('.oge-button-group-pill')).toBeNull();
  });

  it('skips solid-severity targets and multiple mode', async () => {
    stub = stubMotion();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.rightSeverity.set('danger');
    await settle(fixture);
    natives(fixture)[2].click();
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
    fixture.componentInstance.mode.set('multiple');
    await settle(fixture);
    natives(fixture)[0].click();
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
  });
});
