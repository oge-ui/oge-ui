import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeChartSeriesInput,
  OgePieSeriesInput,
} from '@oge-ui/charts-engine';
import { OgeChart } from './chart';
import { OgePieChart } from './pie-chart';
import { OgePolarChart } from './polar-chart';
import { OgeChartLabelTemplate } from './chart-templates';

interface Row {
  [key: string]: unknown;
}

@Component({
  imports: [OgeChart, OgeChartLabelTemplate],
  template: `
    <oge-chart
      [dataSource]="data()"
      [series]="series()"
      title="Depth"
      locale="en-US"
      style="height: 400px; width: 600px"
    >
      @if (templated()) {
        <b *ogeChartLabelTemplate="let label" class="custom-label">{{
          label.text
        }}</b>
      }
    </oge-chart>
  `,
})
class CartesianHost {
  readonly chart = viewChild.required(OgeChart<Row>);
  readonly data = signal<Row[]>([]);
  readonly series = signal<OgeChartSeriesInput<Row>[]>([]);
  readonly templated = signal(false);
}

@Component({
  imports: [OgePieChart],
  template: `
    <oge-pie-chart
      [dataSource]="data"
      argumentField="k"
      valueField="v"
      type="doughnut"
      [series]="rings()"
      [label]="{ visible: true, position: 'inside' }"
      [customizePoint]="customize"
      locale="en-US"
      style="height: 320px; width: 480px"
    />
  `,
})
class PieHost {
  readonly pie = viewChild.required(OgePieChart<Row>);
  readonly data: Row[] = [
    { k: 'A', v: 60, w: 30 },
    { k: 'B', v: 40, w: 70 },
  ];
  readonly rings = signal<OgePieSeriesInput<Row>[]>([]);
  readonly customize = (info: { argument: unknown }) =>
    info.argument === 'B' ? { color: '#123456' } : undefined;
}

@Component({
  imports: [OgePolarChart],
  template: `
    <oge-polar-chart
      [dataSource]="data"
      [series]="series"
      [commonSeries]="{ argumentField: 'k' }"
      locale="en-US"
      style="height: 360px; width: 480px"
    />
  `,
})
class PolarHost {
  readonly data: Row[] = [
    { k: 'A', v: 3 },
    { k: 'B', v: 5 },
    { k: 'C', v: 8 },
  ];
  readonly series: OgeChartSeriesInput<Row>[] = [
    {
      type: 'radialBar',
      valueField: 'v',
      name: 'Done',
      label: { visible: true },
      colorField: () => '#ff8800',
    },
  ];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('charts depth (labels, per-point colour, analytic series)', () => {
  let fixture: ComponentFixture<CartesianHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(CartesianHost);
    host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  const set = async (
    data: Row[],
    series: OgeChartSeriesInput<Row>[],
  ): Promise<void> => {
    fixture.componentInstance.data.set(data);
    fixture.componentInstance.series.set(series);
    await settle(fixture);
  };

  it('per-point colours fill bars', async () => {
    await set(
      [
        { m: 'Jan', v: 10, c: '#ff0000' },
        { m: 'Feb', v: 20, c: '#00ff00' },
      ],
      [{ type: 'bar', argumentField: 'm', valueField: 'v', colorField: 'c' }],
    );
    const fills = [...host.querySelectorAll('.oge-chart-bar')].map((bar) =>
      bar.getAttribute('fill'),
    );
    expect(fills).toEqual(['#ff0000', '#00ff00']);
    // jsdom drops gradient backgrounds; the e2e suite checks the stripes —
    // here the tooltip/legend source of truth is the engine's swatch
    expect(host.querySelectorAll('.oge-chart-legend-marker')).toHaveLength(1);
  });

  it('draws data labels, inside labels with a contrast fill, and a template', async () => {
    await set(
      [
        { m: 'Jan', v: 10 },
        { m: 'Feb', v: 30 },
      ],
      [
        {
          type: 'bar',
          argumentField: 'm',
          valueField: 'v',
          color: '#1e3a8a',
          label: { visible: true, position: 'insideEnd' },
        },
      ],
    );
    const labels = host.querySelectorAll('.oge-chart-point-label');
    expect(labels.length).toBe(2);
    const inside = host.querySelector<SVGTextElement>(
      '.oge-chart-point-label-inside',
    );
    expect(inside?.style.fill).toMatch(/255|#fff/);
    fixture.componentInstance.templated.set(true);
    await settle(fixture);
    expect(
      host.querySelectorAll('.oge-chart-label-fo .custom-label'),
    ).toHaveLength(2);
    expect(host.querySelectorAll('text.oge-chart-point-label')).toHaveLength(0);
  });

  it('waterfall, box plot, ohlc and indicators render their marks', async () => {
    await set(
      [
        { d: 1, delta: 10, vals: [1, 2, 3, 9, 30], o: 5, h: 9, l: 4, c: 8 },
        { d: 2, delta: -4, vals: [2, 3, 4], o: 8, h: 10, l: 6, c: 7 },
        { d: 3, sum: 'total', vals: [5, 6, 7], o: 7, h: 9, l: 5, c: 9 },
      ],
      [
        {
          type: 'waterfall',
          argumentField: 'd',
          valueField: 'delta',
          summaryField: 'sum',
        },
        { type: 'boxPlot', argumentField: 'd', valuesField: 'vals' },
        {
          type: 'ohlc',
          argumentField: 'd',
          openField: 'o',
          highField: 'h',
          lowField: 'l',
          closeField: 'c',
        },
        {
          type: 'indicator',
          argumentField: 'd',
          closeField: 'c',
          indicator: { type: 'rsi', period: 1 },
        },
      ],
    );
    expect(host.querySelectorAll('.oge-chart-waterfall-up')).toHaveLength(1);
    expect(host.querySelectorAll('.oge-chart-waterfall-down')).toHaveLength(1);
    expect(host.querySelectorAll('.oge-chart-waterfall-total')).toHaveLength(1);
    expect(
      host.querySelectorAll('.oge-chart-waterfall-connector'),
    ).toHaveLength(2);
    expect(host.querySelectorAll('.oge-chart-box')).toHaveLength(3);
    expect(host.querySelectorAll('.oge-chart-box-median')).toHaveLength(3);
    expect(host.querySelectorAll('.oge-chart-dot').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.oge-chart-ohlc')).toHaveLength(9);
    expect(host.querySelectorAll('.oge-chart-indicator-level')).toHaveLength(2);
    // the sr table speaks the waterfall kind and the box statistics
    const cells = [...host.querySelectorAll('.oge-chart-sr-table td')].map(
      (cell) => cell.textContent?.trim(),
    );
    expect(cells).toContain('-4 (decrease)');
    expect(cells.some((cell) => cell?.startsWith('Min 1, Q1 2'))).toBe(true);
  });

  it('trendlines draw an extra path; histogram bars; pareto line', async () => {
    await set(
      [1, 2, 3, 4, 5].map((x) => ({ x, y: x * 3 })),
      [
        {
          type: 'scatter',
          argumentField: 'x',
          valueField: 'y',
          trendline: 'polynomial',
        },
        { type: 'histogram', valueField: 'y', bins: { width: 5 } },
      ],
    );
    expect(host.querySelectorAll('.oge-chart-trendline')).toHaveLength(1);
    // 3 6 9 12 15 in width-5 bins: [0,5) [5,10) [10,15]
    expect(host.querySelectorAll('.oge-chart-histogram-bar').length).toBe(3);
    await set(
      [
        { k: 'a', n: 1 },
        { k: 'b', n: 5 },
      ],
      [{ type: 'pareto', argumentField: 'k', valueField: 'n' }],
    );
    expect(host.querySelectorAll('.oge-chart-pareto-line')).toHaveLength(1);
    const args = [...host.querySelectorAll('.oge-chart-arg-label')].map(
      (label) => label.textContent?.trim(),
    );
    expect(args).toEqual(['b', 'a']);
  });

  it('print() hands the chart to a print frame', async () => {
    await set(
      [{ m: 'Jan', v: 1 }],
      [{ type: 'bar', argumentField: 'm', valueField: 'v' }],
    );
    const print = vi.fn();
    const spy = vi
      .spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get')
      .mockReturnValue({ focus: () => undefined, print } as unknown as Window);
    await fixture.componentInstance.chart().print();
    expect(print).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe('pie & polar depth', () => {
  it('nested doughnut rings, inside labels and customizePoint colours', async () => {
    const fixture = TestBed.createComponent(PieHost);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-pie-slice')).toHaveLength(2);
    expect(host.querySelectorAll('.oge-chart-pie-label')).toHaveLength(2);
    expect(
      host.querySelectorAll('.oge-chart-pie-slice')[1].getAttribute('fill'),
    ).toBe('#123456');
    fixture.componentInstance.rings.set([
      { name: '2025' },
      { name: '2026', valueField: 'w' },
    ]);
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-pie-slice')).toHaveLength(4);
    // one legend button per argument, a column per ring in the sr table
    expect(host.querySelectorAll('.oge-chart-legend-btn')).toHaveLength(2);
    const headers = [
      ...host.querySelectorAll('.oge-chart-sr-table thead th'),
    ].map((th) => th.textContent?.trim());
    expect(headers.slice(1)).toEqual(['2025', '2026']);
  });

  it('radial bars draw tracks, arcs with point colours and labels', async () => {
    const fixture = TestBed.createComponent(PolarHost);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-radial-track')).toHaveLength(3);
    const arcs = host.querySelectorAll('.oge-chart-bar');
    expect(arcs).toHaveLength(3);
    expect(arcs[0].getAttribute('fill')).toBe('#ff8800');
    expect(host.querySelectorAll('.oge-chart-point-label').length).toBe(3);
  });
});
