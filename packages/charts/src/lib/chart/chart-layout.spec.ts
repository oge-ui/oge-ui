import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeChart } from './chart';
import { OgeRangeSelector } from './range-selector';
import type {
  OgeChartAnimationOptions,
  OgeChartAxisOptions,
  OgeChartCustomPeriod,
  OgeChartPane,
  OgeChartPeriod,
  OgeChartRange,
  OgeChartSeriesInput,
} from '@oge-ui/charts-engine';

interface Row {
  month: string;
  sales: number;
  cost: number;
}

const DATA: Row[] = [
  { month: 'Jan', sales: 10, cost: 4 },
  { month: 'Feb', sales: 25, cost: 6 },
  { month: 'Mar', sales: 30, cost: 5 },
  { month: 'Apr', sales: 40, cost: 9 },
];

@Component({
  imports: [OgeChart],
  template: `
    <div [attr.dir]="dir()">
      <oge-chart
        [dataSource]="data"
        [series]="series()"
        [rotated]="rotated()"
        [rtlEnabled]="rtl()"
        [panes]="panes()"
        [valueAxis]="valueAxis()"
        [animation]="animation()"
        zoomEnabled="both"
        locale="en-US"
      />
    </div>
  `,
})
class Host {
  readonly chart = viewChild.required(OgeChart<Row>);
  readonly data = DATA;
  readonly dir = signal<string | null>(null);
  readonly rotated = signal(false);
  readonly rtl = signal<boolean | undefined>(undefined);
  readonly panes = signal<OgeChartPane[]>([]);
  readonly animation = signal<boolean | OgeChartAnimationOptions>(true);
  readonly valueAxis = signal<OgeChartAxisOptions | OgeChartAxisOptions[]>({});
  readonly series = signal<OgeChartSeriesInput<Row>[]>([
    { type: 'bar', argumentField: 'month', valueField: 'sales', name: 'Sales' },
    { type: 'line', argumentField: 'month', valueField: 'cost', name: 'Cost' },
  ]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

const argLabels = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<SVGTextElement>('.oge-chart-arg-label'));

describe('<oge-chart> layout options', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('rotates: series group transformed, argument labels down the left', async () => {
    const frame = () => host.querySelector('.oge-chart-plot-frame');
    expect(frame()?.getAttribute('transform')).toBeNull();
    fixture.componentInstance.rotated.set(true);
    await settle(fixture);
    expect(host.querySelector('oge-chart')?.classList).toContain(
      'oge-chart-rotated',
    );
    expect(frame()?.getAttribute('transform')).toMatch(/^matrix\(0 1 -1 0 /);
    const labels = argLabels(host);
    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
    ]);
    expect(
      labels.every((label) => label.getAttribute('text-anchor') === 'end'),
    ).toBe(true);
    const ys = labels.map((label) => Number(label.getAttribute('y')));
    expect(ys[0]).toBeLessThan(ys[3]);
    // the bars keep their logical geometry inside the rotated group
    expect(host.querySelectorAll('.oge-chart-bar').length).toBe(4);
    // a vertical plot: arrows Up/Down walk the arguments
    const wrap = host.querySelector<HTMLElement>('.oge-chart-plot-wrap');
    wrap?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(host.querySelector('.oge-chart-live')?.textContent).toContain('Jan');
  });

  it('follows the page direction and an explicit rtlEnabled', async () => {
    const firstX = () => Number(argLabels(host)[0].getAttribute('x'));
    const lastX = () => Number(argLabels(host)[3].getAttribute('x'));
    expect(firstX()).toBeLessThan(lastX());
    fixture.componentInstance.rtl.set(true);
    await settle(fixture);
    expect(firstX()).toBeGreaterThan(lastX());
    expect(host.querySelector('oge-chart')?.getAttribute('dir')).toBe('rtl');
    // auto: the dir of an ancestor, read on refresh()
    fixture.componentInstance.rtl.set(undefined);
    fixture.componentInstance.dir.set('rtl');
    await settle(fixture);
    fixture.componentInstance.chart().refresh();
    await settle(fixture);
    expect(host.querySelector('oge-chart')?.hasAttribute('dir')).toBe(false);
    expect(firstX()).toBeGreaterThan(lastX());
  });

  it('draws panes with their own clip paths and value axes', async () => {
    fixture.componentInstance.panes.set([
      { name: 'price', height: 3 },
      { name: 'volume' },
    ]);
    fixture.componentInstance.series.set([
      {
        type: 'line',
        argumentField: 'month',
        valueField: 'sales',
        name: 'Price',
      },
      {
        type: 'bar',
        argumentField: 'month',
        valueField: 'cost',
        name: 'Volume',
        pane: 'volume',
      },
    ]);
    await settle(fixture);
    expect(host.querySelectorAll('clipPath').length).toBe(2);
    const clips = Array.from(
      host.querySelectorAll('.oge-chart-plot-frame > g'),
    ).map((group) => group.getAttribute('clip-path'));
    expect(clips[0]).not.toBe(clips[1]);
    expect(host.querySelectorAll('.oge-chart-axis-line').length).toBe(2);
  });

  it('renders constant lines, strips and break markers', async () => {
    fixture.componentInstance.valueAxis.set({
      constantLines: [{ value: 20, label: 'Target' }],
      strips: [{ start: 30, end: 35, label: 'Stretch' }],
      breaks: [{ start: 12, end: 18 }],
    });
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-constant-line').length).toBe(1);
    const labels = Array.from(
      host.querySelectorAll('.oge-chart-strip-label'),
    ).map((label) => label.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(['Target', 'Stretch']));
    expect(host.querySelectorAll('.oge-chart-break-line').length).toBe(1);
  });

  it('plays the draw-in once and honors animation: false', async () => {
    vi.useFakeTimers();
    try {
      const fresh = TestBed.createComponent(Host);
      fresh.detectChanges();
      const el = fresh.nativeElement as HTMLElement;
      const series = el.querySelector('.oge-chart-series');
      expect(series?.classList).toContain('oge-chart-series-enter');
      expect((series as SVGElement | null)?.style.transformOrigin).toMatch(
        /px/,
      );
      vi.advanceTimersByTime(700);
      fresh.detectChanges();
      expect(
        el
          .querySelector('.oge-chart-series')
          ?.classList.contains('oge-chart-series-enter'),
      ).toBe(false);
      fresh.componentInstance.animation.set(false);
      fresh.detectChanges();
      expect(el.querySelector('oge-chart')?.classList).toContain(
        'oge-chart-static',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('declares the plot touch-action when touch zoom is on', async () => {
    const svg = () => host.querySelector<SVGSVGElement>('.oge-chart-svg');
    expect(svg()?.classList).toContain('oge-chart-touch-pan-y');
    fixture.componentInstance.rotated.set(true);
    await settle(fixture);
    expect(svg()?.classList).toContain('oge-chart-touch-pan-x');
  });
});

@Component({
  imports: [OgeRangeSelector],
  template: `
    <oge-range-selector
      [dataSource]="data"
      [series]="series"
      [periods]="periods"
      [(value)]="range"
      locale="en-US"
    />
  `,
})
class PeriodHost {
  readonly range = signal<OgeChartRange | null>(null);
  readonly data = Array.from({ length: 400 }, (_, i) => ({
    date: new Date(2025, 0, 1 + i),
    v: i,
  }));
  readonly series: OgeChartSeriesInput[] = [
    { type: 'area', argumentField: 'date', valueField: 'v' },
  ];
  readonly periods: (OgeChartPeriod | OgeChartCustomPeriod)[] = [
    '1M',
    '3M',
    'YTD',
    'All',
    { label: '2W', range: { weeks: 2 } },
  ];
}

describe('<oge-range-selector> periods', () => {
  it('renders period buttons that set the window and show as pressed', async () => {
    const fixture = TestBed.createComponent(PeriodHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector('.oge-range-periods');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Zoom period');
    const buttons = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-range-period'),
    );
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      '1M',
      '3M',
      'YTD',
      'All',
      '2W',
    ]);
    expect(buttons[0].getAttribute('title')).toBe('1 month');
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true');
    buttons[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.range()).toEqual({
      min: new Date(2026, 0, 4).getTime(),
      max: new Date(2026, 1, 4).getTime(),
    });
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[3].getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelector('.oge-chart-live')?.textContent).toContain(
      'Selected range',
    );
    buttons[3].click();
    await settle(fixture);
    expect(fixture.componentInstance.range()).toBeNull();
  });
});
