import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ogeProgressRingGeometry } from '@oge-ui/behavior';
import { OgeProgressBar } from './progress-bar';

@Component({
  imports: [OgeProgressBar],
  template: `
    <oge-progress-bar
      type="circular"
      [value]="value()"
      [size]="size()"
      [thickness]="thickness()"
      [showLabel]="showLabel()"
      [formatLabel]="format()"
      [bufferValue]="40"
      [chunkCount]="4"
    />
  `,
})
class CircularHost {
  readonly value = signal<number | null>(25);
  readonly size = signal<number | undefined>(undefined);
  readonly thickness = signal<number | undefined>(undefined);
  readonly showLabel = signal(false);
  readonly format = signal<
    ((value: number, ratio: number) => string) | undefined
  >(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeProgressBar type="circular"', () => {
  let fixture: ComponentFixture<CircularHost>;
  let host: CircularHost;
  let el: HTMLElement;

  const bar = (): HTMLElement =>
    el.querySelector('oge-progress-bar') as HTMLElement;
  const value = (): SVGCircleElement =>
    el.querySelector('.oge-progress-ring-value') as SVGCircleElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(CircularHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('draws an aria-hidden ring and keeps the progressbar contract', () => {
    expect(bar().classList).toContain('oge-progress-bar-circular');
    expect(bar().getAttribute('role')).toBe('progressbar');
    expect(bar().getAttribute('aria-valuenow')).toBe('25');
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    // the linear-only layers never render in the ring
    expect(el.querySelector('.oge-progress-bar-track')).toBeNull();
    expect(el.querySelector('.oge-progress-bar-chunk')).toBeNull();
    expect(el.querySelector('.oge-progress-bar-buffer')).toBeNull();
  });

  it('maps the value onto the dash offset from the shared geometry', async () => {
    const expected = ogeProgressRingGeometry({ ratio: 0.25 });
    expect(Number(value().getAttribute('stroke-dashoffset'))).toBeCloseTo(
      expected.dashOffset,
    );
    host.value.set(100);
    await settle(fixture);
    expect(Number(value().getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
  });

  it('size and thickness drive the SVG box and stroke', async () => {
    host.size.set(80);
    host.thickness.set(10);
    await settle(fixture);
    const svg = el.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('viewBox')).toBe('0 0 80 80');
    expect(value().getAttribute('r')).toBe('35');
    expect(value().getAttribute('stroke-width')).toBe('10');
  });

  it('indeterminate omits aria-valuenow and draws the fixed arc', async () => {
    host.value.set(null);
    await settle(fixture);
    expect(bar().hasAttribute('aria-valuenow')).toBe(false);
    expect(bar().classList).toContain('oge-progress-bar-indeterminate');
    expect(Number(value().getAttribute('stroke-dashoffset'))).toBeCloseTo(
      ogeProgressRingGeometry({ ratio: 0.25 }).dashOffset,
    );
  });

  it('centres the formatted label inside the ring and feeds valuetext', async () => {
    host.showLabel.set(true);
    host.format.set((v) => `${v} of 100`);
    await settle(fixture);
    const label = el.querySelector(
      '.oge-progress-ring .oge-progress-ring-label',
    );
    expect(label?.textContent?.trim()).toBe('25 of 100');
    expect(bar().getAttribute('aria-valuetext')).toBe('25 of 100');
  });
});
