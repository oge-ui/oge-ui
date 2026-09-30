import { StrictMode, createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { OgePolarChart, type OgePolarChartHandle } from './polar-chart';
import type {
  OgeChartPointRef,
  OgeChartSeriesInput,
} from '@oge-ui/charts-engine';

interface Row {
  skill: string;
  ada: number;
  grace: number | null;
}

const DATA: Row[] = [
  { skill: 'TS', ada: 9, grace: 7 },
  { skill: 'CSS', ada: 6, grace: 8 },
  { skill: 'SQL', ada: 7, grace: null },
  { skill: 'Rust', ada: 4, grace: 6 },
  { skill: 'Go', ada: 5, grace: 9 },
];

const SERIES: OgeChartSeriesInput<Row>[] = [
  { type: 'area', valueField: 'ada', name: 'Ada' },
  { type: 'line', valueField: 'grace', name: 'Grace' },
];

function chart(props: Partial<Parameters<typeof OgePolarChart<Row>>[0]> = {}) {
  return (
    <OgePolarChart<Row>
      dataSource={DATA}
      series={SERIES}
      commonSeries={{ argumentField: 'skill' }}
      locale="en-US"
      {...props}
    />
  );
}

describe('<OgePolarChart>', () => {
  it('renders spokes with category labels, rings and radar loops', () => {
    const { container } = render(chart());
    const labels = Array.from(
      container.querySelectorAll('.oge-chart-axis-label'),
    ).map((el) => el.textContent);
    for (const skill of ['TS', 'CSS', 'SQL', 'Rust', 'Go']) {
      expect(labels).toContain(skill);
    }
    expect(container.querySelectorAll('.oge-chart-area')).toHaveLength(1);
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(2);
    const [adaPath, gracePath] = Array.from(
      container.querySelectorAll('.oge-chart-line'),
    ).map((el) => el.getAttribute('d') ?? '');
    expect(adaPath.endsWith('Z')).toBe(true);
    expect(gracePath.includes('Z')).toBe(false); // null value = gap
    expect(container.firstElementChild?.className).toBe(
      'oge-chart oge-polar-chart',
    );
  });

  it('spider mode swaps circular rings for polygons', () => {
    const { container, rerender } = render(chart());
    const circular =
      container.querySelector('.oge-chart-grid')?.getAttribute('d') ?? '';
    expect(circular).toContain('A ');
    rerender(chart({ spider: true }));
    const spider =
      container.querySelector('.oge-chart-grid')?.getAttribute('d') ?? '';
    expect(spider).not.toContain('A ');
  });

  it('legend toggle hides a series, announces, and the sr table carries values', () => {
    const { container } = render(chart());
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    );
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(container.querySelectorAll('.oge-chart-area')).toHaveLength(0);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.oge-chart-live')?.textContent).toBe(
      'Ada hidden',
    );
    const rows = container.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain('TS');
    expect(rows[0].textContent).toContain('9');
  });

  it('keyboard arrows walk categories, announce and Enter selects', () => {
    const selections: (readonly OgeChartPointRef[])[] = [];
    const clicks = vi.fn();
    const { container } = render(
      chart({
        selectionMode: 'point',
        onSelectedPointsChange: (points) => selections.push(points),
        onPointClick: clicks,
      }),
    );
    const wrap = container.querySelector<HTMLElement>('.oge-chart-plot-wrap');
    if (wrap === null) throw new Error('no wrap');
    const live = container.querySelector('.oge-chart-live');
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live?.textContent).toBe('Ada, TS: 9');
    fireEvent.keyDown(wrap, { key: 'ArrowLeft' });
    expect(live?.textContent).toBe('Ada, Go: 5');
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live?.textContent).toBe('Grace, Go: 9');
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(clicks.mock.calls[0][0]).toMatchObject({
      seriesName: 'Grace',
      pointIndex: 4,
    });
    expect(selections.at(-1)).toEqual([{ seriesIndex: 1, pointIndex: 4 }]);
  });

  it('bar series render as sectors; hover shows the tooltip', () => {
    const { container } = render(
      chart({ series: [{ type: 'bar', valueField: 'ada', name: 'Ada' }] }),
    );
    const sectors = container.querySelectorAll('.oge-chart-bar');
    expect(sectors).toHaveLength(5);
    fireEvent.mouseEnter(sectors[1]);
    expect(container.querySelector('.oge-chart-tooltip-arg')?.textContent).toBe(
      'CSS',
    );
    expect(container.querySelector('.oge-chart-tooltip-row')?.textContent).toBe(
      'Ada: 6',
    );
    fireEvent.mouseLeave(sectors[1]);
    expect(container.querySelector('.oge-chart-tooltip')).toBeNull();
  });

  it('the handle focuses the plot and exposes the svg; StrictMode-safe', () => {
    const ref = createRef<OgePolarChartHandle>();
    const { container } = render(
      <StrictMode>
        <OgePolarChart<Row>
          ref={ref}
          dataSource={DATA}
          series={SERIES}
          commonSeries={{ argumentField: 'skill' }}
        />
      </StrictMode>,
    );
    ref.current?.focus();
    expect(document.activeElement).toBe(
      container.querySelector('.oge-chart-plot-wrap'),
    );
    expect(ref.current?.getSvgElement().tagName.toLowerCase()).toBe('svg');
  });
});
