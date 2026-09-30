import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeSlider } from './slider';
import type { OgeSliderOrientation } from './slider-types';

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

@Component({
  imports: [OgeSlider],
  template: `
    <oge-slider
      [(value)]="value"
      [min]="0"
      [max]="10"
      [orientation]="orientation()"
      [formatValue]="format() ? fmt : undefined"
      [valueIndicator]="indicator()"
      ariaLabel="Volume"
    />
  `,
})
class A11yHost {
  readonly value = signal(4);
  readonly orientation = signal<OgeSliderOrientation>('horizontal');
  readonly format = signal(false);
  readonly indicator = signal<'none' | 'active' | 'always'>('none');
  readonly fmt = (value: number): string => `${value} dB`;
}

@Component({
  imports: [OgeSlider],
  template: `<oge-slider [value]="3" tooltip="Drag me" />`,
})
class TooltipHost {}

@Component({
  imports: [OgeSlider],
  template: `
    <oge-slider
      [value]="4"
      [min]="0"
      [max]="10"
      [largeStep]="5"
      [showTicks]="true"
      [showTickLabels]="true"
      [formatValue]="fmt"
    />
  `,
})
class TickHost {
  readonly fmt = (value: number): string => `${value}%`;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeSlider — accessibility contract', () => {
  let fixture: ComponentFixture<A11yHost>;
  let host: A11yHost;
  let el: HTMLElement;

  const thumb = (): HTMLElement =>
    el.querySelector('.oge-slider-thumb') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(A11yHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('carries the APG slider triple on the focusable thumb', () => {
    expect(thumb().getAttribute('role')).toBe('slider');
    expect(thumb().getAttribute('tabindex')).toBe('0');
    expect(thumb().getAttribute('aria-valuemin')).toBe('0');
    expect(thumb().getAttribute('aria-valuemax')).toBe('10');
    expect(thumb().getAttribute('aria-valuenow')).toBe('4');
    expect(thumb().getAttribute('aria-label')).toBe('Volume');
    // Horizontal is the ARIA default — no aria-orientation noise.
    expect(thumb().getAttribute('aria-orientation')).toBeNull();
    // No formatter → the number IS the meaning, no aria-valuetext.
    expect(thumb().getAttribute('aria-valuetext')).toBeNull();
  });

  it('formatValue feeds aria-valuetext and the value bubble alike', async () => {
    host.format.set(true);
    host.indicator.set('always');
    await settle(fixture);
    expect(thumb().getAttribute('aria-valuetext')).toBe('4 dB');
    expect(el.querySelector('.oge-slider-bubble')?.textContent?.trim()).toBe(
      '4 dB',
    );
  });

  it('the active indicator shows the bubble on focus, drag or hover', async () => {
    host.indicator.set('active');
    await settle(fixture);
    expect(el.querySelector('.oge-slider-bubble')).toBeNull();
    thumb().dispatchEvent(new FocusEvent('focus'));
    await settle(fixture);
    expect(el.querySelector('.oge-slider-bubble')).not.toBeNull();
    thumb().dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(el.querySelector('.oge-slider-bubble')).toBeNull();
    // Hover alone shows it too — DevExtreme's showMode: 'onHover'.
    thumb().dispatchEvent(new MouseEvent('pointerenter'));
    await settle(fixture);
    expect(el.querySelector('.oge-slider-bubble')).not.toBeNull();
    thumb().dispatchEvent(new MouseEvent('pointerleave'));
    await settle(fixture);
    expect(el.querySelector('.oge-slider-bubble')).toBeNull();
  });

  it('inherited tooltip renders as the thumb title', async () => {
    // The dx `hint` parity — the base input must actually reach the DOM.
    const local = TestBed.createComponent(TooltipHost);
    await settle(local);
    const t = (local.nativeElement as HTMLElement).querySelector(
      '.oge-slider-thumb',
    );
    expect(t?.getAttribute('title')).toBe('Drag me');
    local.destroy();
  });

  it('tick labels render formatted, aria-hidden decoration', async () => {
    const local = TestBed.createComponent(TickHost);
    await settle(local);
    const labels = Array.from(
      (local.nativeElement as HTMLElement).querySelectorAll(
        '.oge-slider-tick-label',
      ),
    );
    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      '0%',
      '5%',
      '10%',
    ]);
    labels.forEach((label) => {
      expect(label.getAttribute('aria-hidden')).toBe('true');
    });
    local.destroy();
  });

  it('vertical announces aria-orientation and keeps Up as increase', async () => {
    host.orientation.set('vertical');
    await settle(fixture);
    expect(thumb().getAttribute('aria-orientation')).toBe('vertical');
    expect(el.querySelector('.oge-slider-vertical')).not.toBeNull();
    key(thumb(), 'ArrowUp');
    expect(host.value()).toBe(5);
    key(thumb(), 'ArrowDown');
    expect(host.value()).toBe(4);
    // The horizontal pair still works on the vertical axis (APG allows both).
    key(thumb(), 'ArrowRight');
    expect(host.value()).toBe(5);
  });
});
