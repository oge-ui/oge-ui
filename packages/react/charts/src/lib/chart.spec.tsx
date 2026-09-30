import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeChart, type OgeChartHandle } from './chart';
import { OgeChartsConfigProvider } from './charts-config';
import type {
  OgeChartAnnotation,
  OgeChartLegendClickEvent,
  OgeChartPointRef,
  OgeChartRange,
  OgeChartSeriesInput,
  OgeChartTooltipShowingEvent,
} from '@oge-ui/charts-engine';

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

const SERIES: OgeChartSeriesInput<Row>[] = [
  { type: 'line', argumentField: 'month', valueField: 'sales', name: 'Sales' },
  { type: 'bar', argumentField: 'month', valueField: 'cost', name: 'Cost' },
];

/** jsdom has no PointerEvent: RTL's pointer helpers drop the coordinates. */
function pointer(
  type: string,
  init: {
    clientX?: number;
    clientY?: number;
    button?: number;
    shiftKey?: boolean;
  } = {},
): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

/** rAF runs on the next macrotask, like a browser frame. */
function stubFrames(): void {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function q<E extends Element>(root: ParentNode, selector: string): E {
  const element = root.querySelector<E>(selector);
  if (element === null) throw new Error(`missing ${selector}`);
  return element;
}

describe('<OgeChart>', () => {
  beforeEach(stubFrames);
  afterEach(() => vi.unstubAllGlobals());

  it('renders one line path, per-point bars, markers and the legend', () => {
    const { container } = render(
      <OgeChart dataSource={DATA} series={SERIES} title="Revenue" />,
    );
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(1);
    expect(container.querySelectorAll('.oge-chart-bar')).toHaveLength(4);
    expect(container.querySelectorAll('.oge-chart-marker')).toHaveLength(3);
    const legend = container.querySelectorAll('.oge-chart-legend-btn');
    expect(legend).toHaveLength(2);
    expect(legend[0].textContent).toContain('Sales');
    const d = q(container, '.oge-chart-line').getAttribute('d') ?? '';
    expect((d.match(/M /g) ?? []).length).toBe(2); // the null point is a gap
    expect(q(container, '.oge-chart-title').textContent).toBe('Revenue');
    expect(q(container, '.oge-chart-svg').getAttribute('aria-label')).toBe(
      'Revenue chart with 2 series. Use arrow keys to inspect points, Enter to select',
    );
    // the same host class the Angular component carries on <oge-chart>
    expect(container.firstElementChild?.className).toBe('oge-chart');
  });

  it('category axis labels render and the sr table carries the data', () => {
    const { container } = render(
      <OgeChart dataSource={DATA} series={SERIES} locale="en-US" />,
    );
    const labels = Array.from(
      container.querySelectorAll('.oge-chart-arg-label'),
    ).map((el) => el.textContent);
    expect(labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
    const rows = container.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('Jan');
    expect(rows[0].textContent).toContain('10');
  });

  it('legend click hides the series and is cancelable', () => {
    const clicks: OgeChartLegendClickEvent[] = [];
    let veto = false;
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        onLegendClick={(event) => {
          clicks.push({ ...event });
          event.cancel = veto;
        }}
      />,
    );
    const button = container.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    )[0];
    fireEvent.click(button);
    expect(clicks[0].willHide).toBe(true);
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(0);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(q(container, '.oge-chart-live').textContent).toBe('Sales hidden');
    veto = true;
    fireEvent.click(button);
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(0);
    veto = false;
    fireEvent.click(button);
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(1);
  });

  it('a non-interactive legend disables its buttons', () => {
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        legend={{ interactive: false, position: 'top' }}
      />,
    );
    expect(
      q<HTMLButtonElement>(container, '.oge-chart-legend-btn').disabled,
    ).toBe(true);
    expect(container.querySelector('.oge-chart-legend-top')).not.toBeNull();
  });

  it('visualRange is controlled; the handle zooms and resetZoom announces', () => {
    const ref = createRef<OgeChartHandle<Row>>();
    const ranges: (OgeChartRange | null)[] = [];
    function Host() {
      const [range, setRange] = useState<OgeChartRange | null>(null);
      return (
        <OgeChart
          ref={ref}
          dataSource={DATA}
          series={SERIES}
          visualRange={range}
          onVisualRangeChange={(next) => {
            ranges.push(next);
            setRange(next);
          }}
        />
      );
    }
    const { container } = render(<Host />);
    act(() => ref.current?.zoomToRange({ min: 0.5, max: 2.5 }));
    expect(ranges.at(-1)).toEqual({ min: 0.5, max: 2.5 });
    const labels = Array.from(
      container.querySelectorAll('.oge-chart-arg-label'),
    ).map((el) => el.textContent);
    expect(labels).toEqual(['Feb', 'Mar']);
    act(() => ref.current?.resetZoom());
    expect(ranges.at(-1)).toBeNull();
    expect(q(container, '.oge-chart-live').textContent).toBe('Zoom reset');
  });

  it('keyboard arrows walk the arguments, announce, and Enter selects', () => {
    const selections: (readonly OgeChartPointRef[])[] = [];
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        selectionMode="point"
        onSelectedPointsChange={(points) => selections.push(points)}
      />,
    );
    const wrap = q<HTMLElement>(container, '.oge-chart-plot-wrap');
    const live = q(container, '.oge-chart-live');
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live.textContent).toBe('Sales, Jan: 10');
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live.textContent).toBe('Cost, Jan: 4');
    fireEvent.keyDown(wrap, { key: 'End' });
    expect(live.textContent).toBe('Cost, Apr: 9');
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(selections.at(-1)).toEqual([{ seriesIndex: 1, pointIndex: 3 }]);
    expect(live.textContent).toBe('Cost, Apr selected');
    expect(
      container.querySelectorAll('.oge-chart-bar.oge-chart-point-selected'),
    ).toHaveLength(1);
  });

  it('Escape resets a zoom window from the keyboard', () => {
    const onChange = vi.fn();
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        defaultVisualRange={{ min: 0.5, max: 2.5 }}
        onVisualRangeChange={onChange}
      />,
    );
    fireEvent.keyDown(q(container, '.oge-chart-plot-wrap'), { key: 'Escape' });
    expect(onChange).toHaveBeenCalledWith(null);
    expect(container.querySelectorAll('.oge-chart-arg-label')).toHaveLength(4);
  });

  it('annotations render dots, connectors and label boxes; renderAnnotation swaps the label', () => {
    const notes: OgeChartAnnotation[] = [
      { type: 'point', text: 'Peak', argument: 'Apr', value: 40 },
      { type: 'text', text: 'Note', argument: 'Jan' },
    ];
    const { container, rerender } = render(
      <OgeChart dataSource={DATA} series={SERIES} annotations={notes} />,
    );
    expect(
      container.querySelectorAll('.oge-chart-annotation-dot'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('.oge-chart-annotation-connector'),
    ).toHaveLength(1);
    expect(
      Array.from(container.querySelectorAll('.oge-chart-annotation-text')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['Peak', 'Note']);
    rerender(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        annotations={notes}
        renderAnnotation={(note) => <b className="custom-note">{note.text}!</b>}
      />,
    );
    expect(container.querySelectorAll('.oge-chart-annotation-fo')).toHaveLength(
      2,
    );
    expect(q(container, '.custom-note').textContent).toBe('Peak!');
  });

  it('strip lines draw a band and a line; renderLegendItem replaces the entry', () => {
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        stripLines={[
          { start: 'Feb', end: 'Mar', label: 'Window' },
          { start: 'Apr', color: '#dc2626' },
        ]}
        renderLegendItem={(item) => (
          <span className="custom-legend">
            {item.name}:{String(item.hidden)}
          </span>
        )}
      />,
    );
    expect(container.querySelectorAll('.oge-chart-strip')).toHaveLength(1);
    expect(q(container, '.oge-chart-strip-line').getAttribute('stroke')).toBe(
      '#dc2626',
    );
    expect(q(container, '.oge-chart-strip-label').textContent).toBe('Window');
    expect(q(container, '.custom-legend').textContent).toBe('Sales:false');
  });

  it('series types: stepLine steps, bubble sizes, rangeBar spans, labels show', () => {
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={[
          { type: 'stepLine', argumentField: 'month', valueField: 'cost' },
          {
            type: 'bubble',
            argumentField: 'month',
            valueField: 'cost',
            sizeField: 'sales',
          },
          {
            type: 'rangeBar',
            argumentField: 'month',
            value1Field: 'cost',
            value2Field: 'sales',
            showLabels: true,
          },
        ]}
      />,
    );
    const radii = Array.from(
      container.querySelectorAll('.oge-chart-bubble'),
    ).map((el) => Number(el.getAttribute('r')));
    expect(new Set(radii).size).toBeGreaterThan(1);
    expect(container.querySelectorAll('.oge-chart-bar')).toHaveLength(3);
    expect(
      container.querySelectorAll('.oge-chart-point-label').length,
    ).toBeGreaterThan(0);
  });

  it('a series with visible:false starts hidden and the legend re-shows it', () => {
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={[{ ...SERIES[0], visible: false }]}
      />,
    );
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(0);
    const button = q<HTMLButtonElement>(container, '.oge-chart-legend-btn');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(1);
  });

  it('hover shows the crosshair and tooltip; onTooltipShowing can veto it', async () => {
    let cancel = false;
    const showing: OgeChartTooltipShowingEvent<Row>[] = [];
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        tooltip={{ shared: true }}
        onTooltipShowing={(event) => {
          showing.push(event);
          event.cancel = cancel;
        }}
      />,
    );
    const svg = q<SVGSVGElement>(container, '.oge-chart-svg');
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 400 }) as DOMRect;
    // Feb sits at 3/8 of the 536px plot, which starts at x = 52
    fireEvent(
      svg,
      pointer('pointermove', { clientX: 52 + 536 * 0.375, clientY: 100 }),
    );
    await flush();
    expect(showing).toHaveLength(1);
    expect(showing[0].points.map((point) => point.seriesName)).toEqual([
      'Sales',
      'Cost',
    ]);
    expect(container.querySelector('.oge-chart-crosshair')).not.toBeNull();
    const tip = q(container, '.oge-chart-tooltip');
    expect(q(tip, '.oge-chart-tooltip-arg').textContent).toBe('Feb');
    expect(tip.querySelectorAll('.oge-chart-tooltip-row')).toHaveLength(2);
    fireEvent.pointerLeave(q(container, '.oge-chart-plot-wrap'));
    expect(container.querySelector('.oge-chart-tooltip')).toBeNull();
    cancel = true;
    fireEvent(
      svg,
      pointer('pointermove', { clientX: 52 + 536 * 0.625, clientY: 100 }),
    );
    await flush();
    expect(showing).toHaveLength(2);
    expect(container.querySelector('.oge-chart-tooltip')).toBeNull();
    expect(container.querySelector('.oge-chart-crosshair')).not.toBeNull();
  });

  it('renderTooltip replaces the balloon content and a click fires the point events', async () => {
    const pointClicks = vi.fn();
    const seriesClicks = vi.fn();
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        onPointClick={pointClicks}
        onSeriesClick={seriesClicks}
        renderTooltip={(points) => (
          <em className="custom-tip">{points[0].seriesName}</em>
        )}
      />,
    );
    const svg = q<SVGSVGElement>(container, '.oge-chart-svg');
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 400 }) as DOMRect;
    fireEvent(
      svg,
      pointer('pointermove', { clientX: 52 + 536 * 0.125, clientY: 100 }),
    );
    await flush();
    expect(q(container, '.custom-tip').textContent).toBe('Sales');
    fireEvent.click(svg);
    expect(pointClicks).toHaveBeenCalledTimes(1);
    expect(pointClicks.mock.calls[0][0]).toMatchObject({
      seriesName: 'Sales',
      pointIndex: 0,
    });
    expect(seriesClicks.mock.calls[0][0]).toMatchObject({ seriesIndex: 0 });
  });

  it('wheel zoom (a non-passive native listener) narrows the window', () => {
    const onChange = vi.fn();
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES}
        zoomEnabled="wheel"
        onVisualRangeChange={onChange}
      />,
    );
    const svg = q<SVGSVGElement>(container, '.oge-chart-svg');
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 400 }) as DOMRect;
    const event = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 300,
      cancelable: true,
      bubbles: true,
    });
    act(() => {
      svg.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    const range = onChange.mock.calls[0][0] as OgeChartRange;
    expect(range.max - range.min).toBeLessThan(4);
    expect(q(container, '.oge-chart-live').textContent).toBe('Zoomed');
  });

  it('getExportData, getSvgElement and onDrawn', () => {
    const ref = createRef<OgeChartHandle<Row>>();
    const drawn = vi.fn();
    render(
      <OgeChart
        ref={ref}
        dataSource={DATA}
        series={SERIES}
        title="Revenue"
        onDrawn={drawn}
      />,
    );
    const data = ref.current?.getExportData();
    expect(data?.title).toBe('Revenue');
    expect(data?.series.map((entry) => entry.name)).toEqual(['Sales', 'Cost']);
    expect(data?.argumentKind).toBe('category');
    expect(ref.current?.getSvgElement().tagName.toLowerCase()).toBe('svg');
    expect(drawn).toHaveBeenCalled();
  });

  it('config messages and locale flow through the provider', () => {
    const { container } = render(
      <OgeChartsConfigProvider
        config={{ locale: 'de', messages: { noData: 'Keine Daten' } }}
      >
        <OgeChart dataSource={[]} series={[]} />
      </OgeChartsConfigProvider>,
    );
    expect(q(container, '.oge-chart-no-data').textContent).toBe('Keine Daten');
  });

  it('the provider re-resolves when its config prop changes', () => {
    function Host({ noData }: { noData: string }) {
      return (
        <OgeChartsConfigProvider config={{ messages: { noData } }}>
          <OgeChart dataSource={[]} series={[]} />
        </OgeChartsConfigProvider>
      );
    }
    const { container, rerender } = render(<Host noData="Keine Daten" />);
    rerender(<Host noData="Veri yok" />);
    expect(q(container, '.oge-chart-no-data').textContent).toBe('Veri yok');
  });

  it('inline option objects stay stable across hover renders (no rebuild)', async () => {
    const drawn = vi.fn();
    const { container } = render(
      <OgeChart
        dataSource={DATA}
        series={SERIES.map((entry) => ({ ...entry }))}
        argumentAxis={{ grid: true }}
        onDrawn={drawn}
      />,
    );
    const before = drawn.mock.calls.length;
    const svg = q<SVGSVGElement>(container, '.oge-chart-svg');
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 400 }) as DOMRect;
    fireEvent(svg, pointer('pointermove', { clientX: 200, clientY: 100 }));
    await flush();
    expect(drawn.mock.calls.length).toBe(before);
  });

  it('survives a StrictMode remount: the keyboard and the size observer still work', () => {
    const observed: Element[] = [];
    const disconnects = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(element: Element): void {
          observed.push(element);
        }
        disconnect = disconnects;
      },
    );
    const { container } = render(
      <StrictMode>
        <OgeChart dataSource={DATA} series={SERIES} />
      </StrictMode>,
    );
    // cleanup → mount ran once more: one observer disconnected, one live
    expect(disconnects).toHaveBeenCalledTimes(1);
    expect(observed).toHaveLength(2);
    const wrap = q<HTMLElement>(container, '.oge-chart-plot-wrap');
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(q(container, '.oge-chart-live').textContent).toBe('Sales, Jan: 10');
    fireEvent.click(q(container, '.oge-chart-legend-btn'));
    expect(container.querySelectorAll('.oge-chart-line')).toHaveLength(0);
  });
});
