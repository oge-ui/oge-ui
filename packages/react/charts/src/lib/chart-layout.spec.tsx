import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeChart, type OgeChartHandle } from './chart';
import { OgeRangeSelector } from './range-selector';
import type {
  OgeChartAxisOptions,
  OgeChartPane,
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

const SERIES: OgeChartSeriesInput<Row>[] = [
  { type: 'bar', argumentField: 'month', valueField: 'sales', name: 'Sales' },
  { type: 'line', argumentField: 'month', valueField: 'cost', name: 'Cost' },
];

const argLabels = (root: ParentNode) =>
  Array.from(root.querySelectorAll<SVGTextElement>('.oge-chart-arg-label'));

describe('<OgeChart> layout options', () => {
  it('rotates: series group transformed, argument labels down the left', () => {
    const { container, rerender } = render(
      <OgeChart dataSource={DATA} series={SERIES} locale="en-US" />,
    );
    const frame = () => container.querySelector('.oge-chart-plot-frame');
    expect(frame()?.getAttribute('transform')).toBeNull();
    rerender(
      <OgeChart dataSource={DATA} series={SERIES} locale="en-US" rotated />,
    );
    expect(container.firstElementChild?.classList).toContain(
      'oge-chart-rotated',
    );
    expect(frame()?.getAttribute('transform')).toMatch(/^matrix\(0 1 -1 0 /);
    const labels = argLabels(container);
    expect(labels.map((label) => label.textContent)).toEqual([
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
    // a vertical plot: Up/Down walk the arguments
    fireEvent.keyDown(
      container.querySelector('.oge-chart-plot-wrap') as Element,
      {
        key: 'ArrowDown',
      },
    );
    expect(container.querySelector('.oge-chart-live')?.textContent).toContain(
      'Jan',
    );
  });

  it('follows the page direction and an explicit rtlEnabled', () => {
    const ref = createRef<OgeChartHandle<Row>>();
    const { container, rerender } = render(
      <div dir="rtl">
        <OgeChart ref={ref} dataSource={DATA} series={SERIES} locale="en-US" />
      </div>,
    );
    const xs = () =>
      argLabels(container).map((label) => Number(label.getAttribute('x')));
    // auto-detected from the ancestor dir after mount
    expect(xs()[0]).toBeGreaterThan(xs()[3]);
    rerender(
      <div dir="rtl">
        <OgeChart
          ref={ref}
          dataSource={DATA}
          series={SERIES}
          locale="en-US"
          rtlEnabled={false}
        />
      </div>,
    );
    expect(xs()[0]).toBeLessThan(xs()[3]);
    expect(container.querySelector('.oge-chart')?.getAttribute('dir')).toBe(
      'ltr',
    );
  });

  it('draws panes with their own clip paths', () => {
    const panes: OgeChartPane[] = [
      { name: 'price', height: 3 },
      { name: 'volume' },
    ];
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        panes={panes}
        series={[
          { type: 'line', argumentField: 'month', valueField: 'sales' },
          {
            type: 'bar',
            argumentField: 'month',
            valueField: 'cost',
            pane: 'volume',
          },
        ]}
      />,
    );
    expect(container.querySelectorAll('clipPath')).toHaveLength(2);
    const clips = Array.from(
      container.querySelectorAll('.oge-chart-plot-frame > g'),
    ).map((group) => group.getAttribute('clip-path'));
    expect(clips[0]).not.toBe(clips[1]);
    expect(container.querySelectorAll('.oge-chart-axis-line')).toHaveLength(2);
  });

  it('renders constant lines, strips and break markers', () => {
    const valueAxis: OgeChartAxisOptions = {
      constantLines: [{ value: 20, label: 'Target' }],
      strips: [{ start: 30, end: 35, label: 'Stretch' }],
      breaks: [{ start: 12, end: 18 }],
    };
    const { container } = render(
      <OgeChart dataSource={DATA} series={SERIES} valueAxis={valueAxis} />,
    );
    expect(container.querySelectorAll('.oge-chart-constant-line')).toHaveLength(
      1,
    );
    const labels = Array.from(
      container.querySelectorAll('.oge-chart-strip-label'),
    ).map((label) => label.textContent);
    expect(labels).toEqual(expect.arrayContaining(['Target', 'Stretch']));
    expect(container.querySelectorAll('.oge-chart-break-line')).toHaveLength(1);
  });

  it('plays the draw-in once and honors animation: false (StrictMode-safe)', () => {
    vi.useFakeTimers();
    try {
      const { container, rerender } = render(
        <StrictMode>
          <OgeChart dataSource={DATA} series={SERIES} />
        </StrictMode>,
      );
      const series = () => container.querySelector('.oge-chart-series');
      expect(series()?.classList).toContain('oge-chart-series-enter');
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(series()?.classList.contains('oge-chart-series-enter')).toBe(
        false,
      );
      rerender(
        <StrictMode>
          <OgeChart dataSource={DATA} series={SERIES} animation={false} />
        </StrictMode>,
      );
      expect(container.firstElementChild?.classList).toContain(
        'oge-chart-static',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('declares the plot touch-action when touch zoom is on', () => {
    const { container, rerender } = render(
      <OgeChart dataSource={DATA} series={SERIES} zoomEnabled="both" />,
    );
    const svg = () => container.querySelector('.oge-chart-svg');
    expect(svg()?.classList).toContain('oge-chart-touch-pan-y');
    rerender(
      <OgeChart dataSource={DATA} series={SERIES} zoomEnabled="both" rotated />,
    );
    expect(svg()?.classList).toContain('oge-chart-touch-pan-x');
  });
});

describe('<OgeRangeSelector> periods', () => {
  const days = Array.from({ length: 400 }, (_, i) => ({
    date: new Date(2025, 0, 1 + i),
    v: i,
  }));
  let latest: OgeChartRange | null = null;
  function Host() {
    const [range, setRange] = useState<OgeChartRange | null>(null);
    latest = range;
    return (
      <OgeRangeSelector
        dataSource={days}
        series={[{ type: 'area', argumentField: 'date', valueField: 'v' }]}
        periods={[
          '1M',
          '3M',
          'YTD',
          'All',
          { label: '2W', range: { weeks: 2 } },
        ]}
        value={range}
        onValueChange={setRange}
        locale="en-US"
      />
    );
  }

  it('renders period buttons that set the window and show as pressed', () => {
    const { container } = render(<Host />);
    const group = container.querySelector('.oge-range-periods');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Zoom period');
    const buttons = () =>
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('.oge-range-period'),
      );
    expect(buttons().map((button) => button.textContent)).toEqual([
      '1M',
      '3M',
      'YTD',
      'All',
      '2W',
    ]);
    expect(buttons()[0].getAttribute('title')).toBe('1 month');
    expect(buttons()[3].getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(buttons()[0]);
    expect(latest).toEqual({
      min: new Date(2026, 0, 4).getTime(),
      max: new Date(2026, 1, 4).getTime(),
    });
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.oge-chart-live')?.textContent).toContain(
      'Selected range',
    );
    fireEvent.click(buttons()[3]);
    expect(latest).toBeNull();
  });
});
