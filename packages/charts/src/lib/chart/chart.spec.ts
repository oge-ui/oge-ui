import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeChart } from './chart';
import { provideOgeChartsConfig } from '../config';
import type {
  OgeChartAnnotation,
  OgeChartLegendClickEvent,
  OgeChartRange,
  OgeChartSeriesInput,
} from '../charts-types';

interface Row {
  month: string;
  sales: number | null;
  cost: number;
}

const DATA: Row[] = [
  { month: 'Jan', sales: 10, cost: 4 },
  { month: 'Feb', sales: 25, cost: 6 },
  { month: 'Mar', sales: null, cost: 5 },
  { month: 'Apr', sales: 40, cost: 9 },
];

@Component({
  imports: [OgeChart],
  template: `
    <oge-chart
      [dataSource]="data()"
      [series]="series()"
      [legend]="{ visible: true }"
      [zoomEnabled]="'both'"
      selectionMode="point"
      [(visualRange)]="range"
      [annotations]="annotations()"
      title="Revenue"
      locale="en-US"
      style="height: 400px; width: 600px"
      (legendClick)="legendClicks.push($event)"
    />
  `,
})
class Host {
  readonly chart = viewChild.required(OgeChart<Row>);
  readonly data = signal<Row[]>(DATA);
  readonly series = signal<OgeChartSeriesInput<Row>[]>([
    {
      type: 'line',
      argumentField: 'month',
      valueField: 'sales',
      name: 'Sales',
    },
    { type: 'bar', argumentField: 'month', valueField: 'cost', name: 'Cost' },
  ]);
  readonly range = signal<OgeChartRange | null>(null);
  readonly annotations = signal<OgeChartAnnotation[]>([]);
  readonly legendClicks: OgeChartLegendClickEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-chart>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one line path, per-point bars, markers and the legend', () => {
    expect(host.querySelectorAll('.oge-chart-line').length).toBe(1);
    // 4 rows, one null gap → 3 bars for Cost? no — bars come from Cost (no nulls) = 4
    expect(host.querySelectorAll('.oge-chart-bar').length).toBe(4);
    // markers for the line series only (bar series has none): 3 non-null
    expect(host.querySelectorAll('.oge-chart-marker').length).toBe(3);
    const legendButtons = host.querySelectorAll('.oge-chart-legend-btn');
    expect(legendButtons.length).toBe(2);
    expect(legendButtons[0].textContent).toContain('Sales');
    // the gap splits nothing visually but the path stays a single element
    const d = host
      .querySelector('.oge-chart-line')
      ?.getAttribute('d') as string;
    expect((d.match(/M /g) ?? []).length).toBe(2); // gap → two subpaths
  });

  it('category axis labels render and the sr table carries the data', () => {
    const labels = Array.from(
      host.querySelectorAll('.oge-chart-arg-label'),
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
    const srRows = host.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(srRows.length).toBe(4);
    expect(srRows[0].textContent).toContain('Jan');
    expect(srRows[0].textContent).toContain('10');
  });

  it('legend click hides the series and is cancelable', async () => {
    const component = fixture.componentInstance;
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    );
    buttons[0].click();
    await settle(fixture);
    expect(component.legendClicks[0].willHide).toBe(true);
    expect(host.querySelectorAll('.oge-chart-line').length).toBe(0);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    // show again
    buttons[0].click();
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-line').length).toBe(1);
  });

  it('visualRange is two-way and resetZoom announces', async () => {
    const component = fixture.componentInstance;
    component.chart().zoomToRange({ min: 0.5, max: 2.5 });
    await settle(fixture);
    expect(component.range()).toEqual({ min: 0.5, max: 2.5 });
    component.chart().resetZoom();
    await settle(fixture);
    expect(component.range()).toBeNull();
    expect(host.querySelector('.oge-chart-live')?.textContent).toContain(
      'Zoom reset',
    );
  });

  it('keyboard arrows walk the arguments and announce point values', async () => {
    const wrap = host.querySelector<HTMLElement>('.oge-chart-plot-wrap');
    if (wrap === null) throw new Error('no plot wrap');
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    const live = host.querySelector('.oge-chart-live');
    expect(live?.textContent).toContain('Sales');
    expect(live?.textContent).toContain('Jan');
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(live?.textContent).toContain('Cost');
    // Enter selects the active point
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.chart().selectedPoints().length).toBe(1);
  });

  it('annotations render dots, connectors and label boxes at their anchors', async () => {
    fixture.componentInstance.annotations.set([
      { type: 'point', text: 'Peak', argument: 'Apr', value: 40 },
      { type: 'text', text: 'Note', argument: 'Jan' },
    ]);
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-annotation-dot').length).toBe(1);
    expect(
      host.querySelectorAll('.oge-chart-annotation-connector').length,
    ).toBe(1);
    const texts = Array.from(
      host.querySelectorAll('.oge-chart-annotation-text'),
    ).map((el) => el.textContent?.trim());
    expect(texts).toEqual(['Peak', 'Note']);
  });

  it('getExportData snapshots series, colors and ranges', () => {
    const data = fixture.componentInstance.chart().getExportData();
    expect(data.title).toBe('Revenue');
    expect(data.series.length).toBe(2);
    expect(data.series[0].name).toBe('Sales');
    expect(data.series[0].color).toBeTruthy();
    expect(data.argumentKind).toBe('category');
  });
});

@Component({
  imports: [OgeChart],
  providers: [
    provideOgeChartsConfig({
      locale: 'de',
      messages: { noData: 'Keine Daten' },
    }),
  ],
  template: `<oge-chart [dataSource]="[]" [series]="[]" />`,
})
class EmptyHost {}

describe('<oge-chart> config', () => {
  it('config messages and locale flow through', async () => {
    const fixture = TestBed.createComponent(EmptyHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.oge-chart-no-data')?.textContent).toContain(
      'Keine Daten',
    );
  });
});
