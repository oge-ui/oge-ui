import { StrictMode, createRef } from 'react';
import { act, render } from '@testing-library/react';
import type { OgeChartSeriesInput } from '@oge-ui/charts-engine';
import { OgeChart, type OgeChartHandle } from './chart';
import { OgePieChart } from './pie-chart';
import { OgePolarChart } from './polar-chart';

type Row = Record<string, unknown>;

function all(root: ParentNode, selector: string): Element[] {
  return Array.from(root.querySelectorAll(selector));
}

describe('React charts depth (labels, per-point colour, analytic series)', () => {
  it('per-point colours fill bars and labels sit inside with contrast', () => {
    const { container } = render(
      <StrictMode>
        <OgeChart<Row>
          dataSource={[
            { m: 'Jan', v: 10, c: '#ff0000' },
            { m: 'Feb', v: 30, c: '#1e3a8a' },
          ]}
          series={[
            {
              type: 'bar',
              argumentField: 'm',
              valueField: 'v',
              colorField: 'c',
              label: { visible: true, position: 'insideEnd' },
            },
          ]}
          locale="en-US"
        />
      </StrictMode>,
    );
    expect(
      all(container, '.oge-chart-bar').map((bar) => bar.getAttribute('fill')),
    ).toEqual(['#ff0000', '#1e3a8a']);
    expect(all(container, '.oge-chart-point-label')).toHaveLength(2);
    const inside = all(
      container,
      '.oge-chart-point-label-inside',
    ) as SVGTextElement[];
    // contrast-picked: dark text on the red bar, white on the navy one
    expect(inside[0].style.fill).toMatch(/17, 24, 39|#111827/);
    expect(inside[1].style.fill).toMatch(/255|#fff/);
  });

  it('renderLabel swaps the label text for custom markup', () => {
    const { container } = render(
      <OgeChart<Row>
        dataSource={[{ m: 'Jan', v: 10 }]}
        series={[
          {
            type: 'bar',
            argumentField: 'm',
            valueField: 'v',
            showLabels: true,
          },
        ]}
        renderLabel={(label) => <b className="custom-label">{label.text}!</b>}
      />,
    );
    expect(
      container.querySelector('.oge-chart-label-fo .custom-label')?.textContent,
    ).toBe('10!');
    expect(all(container, 'text.oge-chart-point-label')).toHaveLength(0);
  });

  it('waterfall, box plot, ohlc and indicator marks; the sr table speaks them', () => {
    const series: OgeChartSeriesInput<Row>[] = [
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
    ];
    const { container } = render(
      <OgeChart<Row>
        dataSource={[
          { d: 1, delta: 10, vals: [1, 2, 3, 9, 30], o: 5, h: 9, l: 4, c: 8 },
          { d: 2, delta: -4, vals: [2, 3, 4], o: 8, h: 10, l: 6, c: 7 },
          { d: 3, sum: 'total', vals: [5, 6, 7], o: 7, h: 9, l: 5, c: 9 },
        ]}
        series={series}
        locale="en-US"
      />,
    );
    expect(all(container, '.oge-chart-waterfall-up')).toHaveLength(1);
    expect(all(container, '.oge-chart-waterfall-down')).toHaveLength(1);
    expect(all(container, '.oge-chart-waterfall-total')).toHaveLength(1);
    expect(all(container, '.oge-chart-waterfall-connector')).toHaveLength(2);
    expect(all(container, '.oge-chart-box')).toHaveLength(3);
    expect(all(container, '.oge-chart-box-median')).toHaveLength(3);
    expect(all(container, '.oge-chart-dot').length).toBeGreaterThan(0);
    expect(all(container, '.oge-chart-ohlc')).toHaveLength(9);
    expect(all(container, '.oge-chart-indicator-level')).toHaveLength(2);
    const cells = all(container, '.oge-chart-sr-table td').map(
      (td) => td.textContent,
    );
    expect(cells).toContain('-4 (decrease)');
    expect(cells.some((cell) => cell?.startsWith('Min 1, Q1 2'))).toBe(true);
  });

  it('trendline, histogram and pareto marks', () => {
    const { container, rerender } = render(
      <OgeChart<Row>
        dataSource={[1, 2, 3, 4, 5].map((x) => ({ x, y: x * 3 }))}
        series={[
          {
            type: 'scatter',
            argumentField: 'x',
            valueField: 'y',
            trendline: 'polynomial',
          },
          { type: 'histogram', valueField: 'y', bins: { width: 5 } },
        ]}
      />,
    );
    expect(all(container, '.oge-chart-trendline')).toHaveLength(1);
    expect(all(container, '.oge-chart-histogram-bar')).toHaveLength(3);
    rerender(
      <OgeChart<Row>
        dataSource={[
          { k: 'a', n: 1 },
          { k: 'b', n: 5 },
        ]}
        series={[{ type: 'pareto', argumentField: 'k', valueField: 'n' }]}
      />,
    );
    expect(all(container, '.oge-chart-pareto-line')).toHaveLength(1);
    expect(
      all(container, '.oge-chart-arg-label').map((label) => label.textContent),
    ).toEqual(['b', 'a']);
  });

  it('print() on the handle hands the chart to a print frame', async () => {
    const ref = createRef<OgeChartHandle<Row>>();
    render(
      <OgeChart<Row>
        ref={ref}
        dataSource={[{ m: 'Jan', v: 1 }]}
        series={[{ type: 'bar', argumentField: 'm', valueField: 'v' }]}
        title="Print me"
      />,
    );
    const print = vi.fn();
    const spy = vi
      .spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get')
      .mockReturnValue({ focus: () => undefined, print } as unknown as Window);
    await act(async () => {
      await ref.current?.print();
    });
    expect(print).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe('React pie & polar depth', () => {
  it('nested doughnut rings, inside labels and customizePoint colours', () => {
    const data = [
      { k: 'A', v: 60, w: 30 },
      { k: 'B', v: 40, w: 70 },
    ];
    const customize = (info: { argument: unknown }) =>
      info.argument === 'B' ? { color: '#123456' } : undefined;
    const { container, rerender } = render(
      <OgePieChart<Row>
        dataSource={data}
        argumentField="k"
        valueField="v"
        type="doughnut"
        label={{ visible: true, position: 'inside' }}
        customizePoint={customize}
        locale="en-US"
      />,
    );
    expect(all(container, '.oge-chart-pie-slice')).toHaveLength(2);
    expect(all(container, '.oge-chart-pie-label')).toHaveLength(2);
    expect(all(container, '.oge-chart-pie-slice')[1].getAttribute('fill')).toBe(
      '#123456',
    );
    rerender(
      <OgePieChart<Row>
        dataSource={data}
        argumentField="k"
        valueField="v"
        type="doughnut"
        series={[{ name: '2025' }, { name: '2026', valueField: 'w' }]}
        label={{ visible: true, position: 'inside' }}
        customizePoint={customize}
        locale="en-US"
      />,
    );
    expect(all(container, '.oge-chart-pie-slice')).toHaveLength(4);
    expect(all(container, '.oge-chart-legend-btn')).toHaveLength(2);
    expect(
      all(container, '.oge-chart-sr-table thead th')
        .slice(1)
        .map((th) => th.textContent),
    ).toEqual(['2025', '2026']);
  });

  it('radial bars draw tracks, arcs with point colours and labels', () => {
    const { container } = render(
      <OgePolarChart<Row>
        dataSource={[
          { k: 'A', v: 3 },
          { k: 'B', v: 5 },
          { k: 'C', v: 8 },
        ]}
        series={[
          {
            type: 'radialBar',
            valueField: 'v',
            name: 'Done',
            label: { visible: true },
            colorField: () => '#ff8800',
          },
        ]}
        commonSeries={{ argumentField: 'k' }}
        locale="en-US"
      />,
    );
    expect(all(container, '.oge-chart-radial-track')).toHaveLength(3);
    const arcs = all(container, '.oge-chart-bar');
    expect(arcs).toHaveLength(3);
    expect(arcs[0].getAttribute('fill')).toBe('#ff8800');
    expect(all(container, '.oge-chart-point-label')).toHaveLength(3);
  });
});
