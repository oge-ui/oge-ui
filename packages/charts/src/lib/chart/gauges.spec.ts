import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeChartValueRange } from '@oge-ui/charts-engine';
import { OgeBulletChart } from './bullet-chart';
import { OgeCircularGauge } from './circular-gauge';
import { OgeLinearGauge } from './linear-gauge';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 20));
  fixture.detectChanges();
}

@Component({
  imports: [OgeCircularGauge, OgeLinearGauge, OgeBulletChart],
  template: `
    <oge-circular-gauge
      class="circular"
      [value]="value()"
      [ranges]="ranges"
      [indicator]="indicator()"
      [animation]="false"
      title="Speed"
      locale="en-US"
    />
    <oge-linear-gauge
      class="linear"
      [value]="value()"
      [rtlEnabled]="rtl()"
      indicator="marker"
      title="Level"
      locale="en-US"
    />
    <oge-bullet-chart
      class="bullet"
      [value]="270"
      [target]="250"
      [ranges]="bands"
      title="Revenue"
      locale="en-US"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(72);
  readonly indicator = signal<'needle' | 'bar' | 'marker'>('needle');
  readonly rtl = signal<boolean | undefined>(undefined);
  readonly ranges: OgeChartValueRange[] = [
    { start: 0, end: 60, label: 'Normal' },
    { start: 60, end: 90, label: 'Warning' },
    { start: 90, end: 100, label: 'Danger' },
  ];
  readonly bands: OgeChartValueRange[] = [
    { start: 0, end: 150 },
    { start: 150, end: 225 },
    { start: 225, end: 300 },
  ];
}

describe('gauges', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('the circular gauge is a labelled meter speaking the value and its range', () => {
    const meter = host.querySelector('.circular [role="meter"]');
    expect(meter?.getAttribute('aria-label')).toBe('Speed gauge');
    expect(meter?.getAttribute('aria-valuenow')).toBe('72');
    expect(meter?.getAttribute('aria-valuemin')).toBe('0');
    expect(meter?.getAttribute('aria-valuemax')).toBe('100');
    expect(meter?.getAttribute('aria-valuetext')).toBe('72, Warning');
    expect(meter?.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(host.querySelectorAll('.circular .oge-gauge-range')).toHaveLength(3);
    expect(
      host.querySelector('.circular .oge-gauge-value')?.textContent?.trim(),
    ).toBe('72');
  });

  it('rotates the needle with the value; a bar indicator uses the dash', async () => {
    const needle = host.querySelector<SVGPathElement>(
      '.circular .oge-gauge-needle',
    );
    // 72 of 0..100 over -120..120°
    expect(needle?.style.transform).toBe('rotate(52.8deg)');
    fixture.componentInstance.indicator.set('bar');
    await settle(fixture);
    expect(host.querySelector('.circular .oge-gauge-needle')).toBeNull();
    const bar = host.querySelector<SVGPathElement>('.circular .oge-gauge-bar');
    expect(bar?.getAttribute('pathLength')).toBe('1000');
    expect(bar?.style.strokeDasharray).toBe('0 0 720 1000');
  });

  it('the sr table lists value, bounds and ranges outside the meter', () => {
    const rows = Array.from(
      host.querySelectorAll('.circular .oge-chart-sr-table tbody tr'),
    ).map((row) =>
      Array.from(row.children)
        .map((cell) => cell.textContent?.trim())
        .join(' '),
    );
    expect(rows[0]).toBe('Value 72, Warning');
    expect(rows).toContain('Normal 0 – 60');
    expect(host.querySelector('[role="meter"] table')).toBeNull();
  });

  it('a null value draws no indicator and reads "no data"', async () => {
    fixture.componentInstance.value.set(null);
    await settle(fixture);
    expect(host.querySelector('.circular .oge-gauge-needle')).toBeNull();
    expect(
      host
        .querySelector('.circular [role="meter"]')
        ?.getAttribute('aria-valuetext'),
    ).toBe('no data');
  });

  it('the linear gauge moves its marker and mirrors in RTL', async () => {
    const meter = host.querySelector('.linear [role="meter"]');
    expect(meter?.getAttribute('aria-label')).toBe('Level gauge');
    const marker = host.querySelector<SVGPathElement>(
      '.linear .oge-gauge-marker',
    );
    expect(marker?.style.transform).toMatch(/^translate\(\d/);
    fixture.componentInstance.rtl.set(true);
    await settle(fixture);
    expect(host.querySelector('.linear')?.getAttribute('dir')).toBe('rtl');
    const track = host.querySelector('.linear .oge-gauge-track');
    expect(Number(track?.getAttribute('x1'))).toBeGreaterThan(
      Number(track?.getAttribute('x2')),
    );
  });

  it('the bullet chart is a labelled image with bands, bar and target', () => {
    const svg = host.querySelector('.bullet svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe(
      'Revenue bullet chart: value 270, target 250',
    );
    expect(host.querySelectorAll('.bullet .oge-bullet-range')).toHaveLength(3);
    expect(host.querySelector('.bullet .oge-bullet-bar')).not.toBeNull();
    expect(host.querySelector('.bullet .oge-bullet-target')).not.toBeNull();
  });

  it('the bullet tooltip shows value and target on hover', async () => {
    const wrap = host.querySelector('.bullet .oge-chart-plot-wrap');
    wrap?.dispatchEvent(new Event('pointerenter'));
    await settle(fixture);
    expect(
      host.querySelector('.bullet .oge-chart-tooltip')?.textContent,
    ).toContain('target 250');
  });

  it('exposes the svg for the exporters', () => {
    const debug = fixture.debugElement.query(
      (el) => el.componentInstance instanceof OgeCircularGauge,
    );
    const gauge = debug.componentInstance as OgeCircularGauge;
    expect(gauge.getSvgElement().tagName.toLowerCase()).toBe('svg');
  });
});

describe('gauge first-render sweep', () => {
  it('paints at the minimum first, then at the value', async () => {
    @Component({
      imports: [OgeCircularGauge],
      template: `<oge-circular-gauge [value]="80" locale="en-US" />`,
    })
    class SweepHost {}
    const rafs: FrameRequestCallback[] = [];
    const spy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        rafs.push(cb);
        return rafs.length;
      });
    const fixture = TestBed.createComponent(SweepHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const needle = (): string | undefined =>
      el.querySelector<SVGPathElement>('.oge-gauge-needle')?.style.transform;
    expect(needle()).toBe('rotate(-120deg)');
    // the meter already speaks the real value
    expect(
      el.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'),
    ).toBe('80');
    rafs.forEach((cb) => cb(0));
    fixture.detectChanges();
    expect(needle()).toBe('rotate(72deg)');
    spy.mockRestore();
  });
});
