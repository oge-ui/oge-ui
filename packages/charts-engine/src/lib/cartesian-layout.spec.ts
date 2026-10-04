import {
  CHART_PANE_GAP,
  bindChartPaneAxes,
  chartBreakMarker,
  chartOutsideLabelMargins,
  chartPaneAt,
  chartPaneList,
  chartValueAxisSlots,
  layoutChartGuides,
  layoutChartPanes,
  paneChartBarSlots,
  paneChartStacks,
} from './cartesian-layout';
import { createChartFrame } from './chart-frame';
import { buildSeries, type ChartSeries } from './series-model';

const series = (
  input: Parameters<typeof buildSeries>[1],
  index: number,
): ChartSeries<unknown> =>
  buildSeries(
    [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ],
    input,
    index,
    'linear',
    new Map(),
  );

describe('panes', () => {
  it('always has one pane', () => {
    expect(chartPaneList(undefined)).toEqual([{ name: '' }]);
    expect(chartPaneList([])).toEqual([{ name: '' }]);
  });

  it('splits the value axis by height ratios with a gap', () => {
    const panes = layoutChartPanes(
      [{ name: 'price', height: 3 }, { name: 'volume' }],
      400 + CHART_PANE_GAP,
      500,
      false,
    );
    expect(panes.map((pane) => [pane.start, pane.size])).toEqual([
      [0, 300],
      [300 + CHART_PANE_GAP, 100],
    ]);
    expect(panes[1].clip).toEqual({
      x: 0,
      y: 300 + CHART_PANE_GAP,
      w: 500,
      h: 100,
    });
    expect(chartPaneAt(panes, 350)?.name).toBe('volume');
    expect(chartPaneAt(panes, 305)?.name).toBe('price'); // in the gap: nearest
  });

  it('reverses the logical order when rotated (first pane stays on the start side)', () => {
    const panes = layoutChartPanes(
      [{ name: 'a' }, { name: 'b' }],
      200 + CHART_PANE_GAP,
      300,
      true,
    );
    expect(panes[0].start).toBe(100 + CHART_PANE_GAP);
    expect(panes[1].start).toBe(0);
  });

  it('binds series → axis → pane, adding a default axis per pane', () => {
    const binding = bindChartPaneAxes(
      [{ title: 'Price' }],
      [{ name: 'price' }, { name: 'volume' }],
      [
        series({ type: 'line', argumentField: 'x', valueField: 'y' }, 0),
        series(
          { type: 'bar', argumentField: 'x', valueField: 'y', pane: 'volume' },
          1,
        ),
        series(
          { type: 'bar', argumentField: 'x', valueField: 'y', pane: 'volume' },
          2,
        ),
        series(
          {
            type: 'line',
            argumentField: 'x',
            valueField: 'y',
            axis: 0,
            pane: 'volume',
          },
          3,
        ),
      ],
    );
    expect(binding.axes).toEqual([{ title: 'Price' }, { pane: 'volume' }]);
    expect(binding.axisPane).toEqual([0, 1]);
    expect(binding.seriesAxis).toEqual([0, 1, 1, 0]);
    expect(binding.seriesPane).toEqual([0, 1, 1, 0]);
  });

  it('stacks and slots bars per pane', () => {
    const list = [
      series({ type: 'stackedBar', argumentField: 'x', valueField: 'y' }, 0),
      series({ type: 'stackedBar', argumentField: 'x', valueField: 'y' }, 1),
    ];
    // one pane: the second series stacks on the first
    expect(paneChartStacks(list, [0, 0])[1]?.[0]).toEqual({ base: 2, top: 4 });
    // two panes: each starts from zero
    expect(paneChartStacks(list, [0, 1])[1]?.[0]).toEqual({ base: 0, top: 2 });
    const bars = [
      series({ type: 'bar', argumentField: 'x', valueField: 'y' }, 0),
      series({ type: 'bar', argumentField: 'x', valueField: 'y' }, 1),
    ];
    const shared = paneChartBarSlots(bars, [0, 0], 100);
    const split = paneChartBarSlots(bars, [0, 1], 100);
    expect(shared[0]?.widthPx).toBe(40);
    expect(split[0]?.widthPx).toBe(80);
    expect(split[1]?.widthPx).toBe(80);
  });

  it('slots value axes per pane side', () => {
    const slots = chartValueAxisSlots(
      [{}, { position: 'end' }, { pane: 'b' }, {}],
      [0, 0, 1, 0],
    );
    expect(slots.side).toEqual(['start', 'end', 'start', 'start']);
    expect(slots.slot).toEqual([0, 0, 0, 1]);
    expect(slots.startCount).toBe(2);
    expect(slots.endCount).toBe(1);
  });
});

describe('guides', () => {
  const frame = createChartFrame(false, false, 400, 300);
  const linear = (value: number | Date | string): number | null =>
    typeof value === 'number' ? value * 4 : null;

  it('lays out value constant lines and strips across the plot', () => {
    const guides = layoutChartGuides(frame, 400, 300, {
      axis: 'value',
      toPx: (value) => (typeof value === 'number' ? 300 - value * 3 : null),
      crossStart: 0,
      crossEnd: 400,
      alongStart: 0,
      alongEnd: 300,
      strips: [{ start: 20, end: 40, label: 'Band', color: 'red' }],
      constantLines: [
        { value: 50, label: 'Target', dash: 'dot', width: 2 },
        { value: 99, label: 'Top' },
        { value: 500, label: 'Off the chart' },
      ],
    });
    expect(guides).toHaveLength(3);
    const [band, target, top] = guides;
    expect(band.kind).toBe('band');
    expect(band.rect).toEqual({ x: 0, y: 180, w: 400, h: 60 });
    expect(band.label).toMatchObject({ x: 4, anchor: 'start', y: 192 });
    expect(target.line).toEqual({ x1: 0, y1: 150, x2: 400, y2: 150 });
    expect(target.dashArray).toBe('2 3');
    expect(target.strokeWidth).toBe(2);
    expect(target.label).toMatchObject({ x: 396, y: 146, anchor: 'end' });
    // too close to the top edge: the label drops below the line
    expect(top.label?.y).toBeGreaterThan(top.line.y1);
  });

  it('puts outside labels past the end edge, mirrored in RTL', () => {
    const spec = {
      axis: 'value' as const,
      toPx: () => 100,
      crossStart: 0,
      crossEnd: 400,
      alongStart: 0,
      alongEnd: 300,
      strips: [],
      constantLines: [
        { value: 1, label: 'Goal', position: 'outside' as const },
      ],
    };
    expect(layoutChartGuides(frame, 400, 300, spec)[0].label).toMatchObject({
      x: 406,
      anchor: 'start',
      outside: true,
    });
    const rtl = createChartFrame(false, true, 400, 300);
    expect(layoutChartGuides(rtl, 400, 300, spec)[0].label).toMatchObject({
      x: -6,
      anchor: 'end',
    });
    expect(
      chartOutsideLabelMargins([], spec.constantLines, false).end,
    ).toBeGreaterThan(0);
    expect(chartOutsideLabelMargins([], spec.constantLines, true)).toEqual({
      end: 0,
      top: true,
    });
  });

  it('flips a vertical line label before the line near the end edge', () => {
    const guides = layoutChartGuides(frame, 400, 300, {
      axis: 'argument',
      toPx: linear,
      crossStart: 0,
      crossEnd: 300,
      alongStart: 0,
      alongEnd: 400,
      strips: [],
      constantLines: [
        { value: 10, label: 'Launch' },
        { value: 99, label: 'Release' },
      ],
      stripLines: [{ start: 50, end: 60, label: 'Freeze' }, { start: 20 }],
    });
    const byLabel = (text: string) =>
      guides.find((guide) => guide.label?.text === text);
    expect(byLabel('Launch')?.label).toMatchObject({ x: 44, anchor: 'start' });
    expect(byLabel('Release')?.label).toMatchObject({ x: 392, anchor: 'end' });
    expect(byLabel('Freeze')?.rect).toEqual({ x: 200, y: 0, w: 40, h: 300 });
    expect(guides.filter((guide) => guide.variant === 'strip')).toHaveLength(2);
  });
});

describe('chartBreakMarker', () => {
  it('draws two zig-zag edges around the break center', () => {
    const marker = chartBreakMarker(
      createChartFrame(false, false, 40, 200),
      100,
    );
    expect(marker.lineD.match(/M/g)).toHaveLength(2);
    expect(marker.fillD.endsWith('Z')).toBe(true);
    const ys = (marker.lineD.match(/-?[\d.]+/g) ?? [])
      .map(Number)
      .filter((_, index) => index % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThan(90);
    expect(Math.max(...ys)).toBeLessThan(110);
  });
});
