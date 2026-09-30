import {
  buildCartesianData,
  buildCartesianScene,
  cartesianActivePoints,
  cartesianAriaLabel,
  cartesianCrosshair,
  cartesianExportData,
  cartesianHoverAt,
  cartesianNearestSeries,
  cartesianPanRange,
  cartesianPointAnnouncement,
  cartesianSelectionRange,
  cartesianSrRows,
  cartesianTooltip,
  cartesianWheelRange,
  chartArgumentText,
  chartDragMode,
  chartMarkerRadius,
  chartSeriesGroupOpacity,
  chartValueAxesList,
  chartValueText,
  chartWheelZoomEnabled,
  chartZoomSelectionRect,
  detectArgumentKind,
  isChartPointSelected,
  nextChartSelection,
  type OgeCartesianSceneInput,
} from './cartesian-model';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import { OGE_CHART_PALETTE } from './charts-types';
import type { ChartSeriesInput } from './series-model';

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

const SERIES: ChartSeriesInput<Row>[] = [
  { type: 'line', argumentField: 'month', valueField: 'sales', name: 'Sales' },
  { type: 'bar', argumentField: 'month', valueField: 'cost', name: 'Cost' },
];

function scene(overrides: Partial<OgeCartesianSceneInput<Row>> = {}) {
  const data = buildCartesianData({ dataSource: DATA, series: SERIES });
  return buildCartesianScene({
    data,
    visualRange: null,
    visibilityOverrides: new Map(),
    width: 600,
    height: 400,
    locale: 'en-US',
    ...overrides,
  });
}

describe('cartesian model — data stage', () => {
  it('detects the argument kind from the first plottable argument', () => {
    expect(
      detectArgumentKind([{ x: 1 }], [{ argumentField: 'x' }], undefined),
    ).toBe('linear');
    expect(
      detectArgumentKind(
        [{ x: new Date(2026, 0, 1) }],
        [{ argumentField: 'x' }],
        undefined,
      ),
    ).toBe('time');
    expect(
      detectArgumentKind(
        [{ x: '2026-01-05' }],
        [{ argumentField: 'x' }],
        undefined,
      ),
    ).toBe('time');
    expect(
      detectArgumentKind([{ x: 'Jan' }], [{ argumentField: 'x' }], undefined),
    ).toBe('category');
    expect(
      detectArgumentKind(
        [{ x: null }, { x: 'Jan' }],
        [{ argumentField: 'x' }],
        undefined,
      ),
    ).toBe('category');
    expect(
      detectArgumentKind([{ x: 'Jan' }], [{ argumentField: 'x' }], 'linear'),
    ).toBe('linear');
    expect(detectArgumentKind([{ x: 'Jan' }], [{}], undefined)).toBe('linear');
  });

  it('merges commonSeries under each series and indexes the arguments', () => {
    const data = buildCartesianData({
      dataSource: DATA,
      series: [{ valueField: 'sales', name: 'S' }],
      commonSeries: { argumentField: 'month', type: 'bar' },
    });
    expect(data.seriesList[0].type).toBe('bar');
    expect(data.categories).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
    expect(data.sortedArgs).toEqual([0, 1, 2, 3]);
    expect(data.hasBars).toBe(true);
  });
});

describe('cartesian model — scene stage', () => {
  it('lays out the plot, one line, per-point bars and markers', () => {
    const s = scene();
    expect(s.plot).toEqual({
      x: 52,
      y: 16,
      w: 600 - 52 - 12,
      h: 400 - 16 - 34,
    });
    const [line, bars] = s.renderSeries;
    expect(line.linePathD).not.toBeNull();
    expect(line.markers).toHaveLength(3); // the null point is a gap
    expect(bars.bars).toHaveLength(4);
    expect(s.argTicks.map((tick) => tick.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
    ]);
    expect(s.legendItems.map((item) => item.name)).toEqual(['Sales', 'Cost']);
    expect(s.colors).toEqual([OGE_CHART_PALETTE[0], OGE_CHART_PALETTE[1]]);
    expect(s.empty).toBe(false);
  });

  it('visibility overrides beat the series flag and rescale the axes', () => {
    const hidden = scene({ visibilityOverrides: new Map([[0, false]]) });
    expect(hidden.renderSeries).toHaveLength(1);
    expect(hidden.legendItems[0].hidden).toBe(true);
    const data = buildCartesianData({
      dataSource: DATA,
      series: [{ ...SERIES[0], visible: false }],
    });
    const base = {
      data,
      visualRange: null,
      width: 600,
      height: 400,
    };
    expect(
      buildCartesianScene({ ...base, visibilityOverrides: new Map() }).empty,
    ).toBe(true);
    expect(
      buildCartesianScene({
        ...base,
        visibilityOverrides: new Map([[0, true]]),
      }).renderSeries,
    ).toHaveLength(1);
  });

  it('a visual range clamps into the bounds and switches category ticks to the window', () => {
    const s = scene({ visualRange: { min: 0.5, max: 2.5 } });
    expect(s.zoomed).toBe(true);
    expect(s.effectiveRange).toEqual({ min: 0.5, max: 2.5 });
    expect(s.argTicks.map((tick) => tick.label)).toEqual(['Feb', 'Mar']);
    expect(
      scene({ visualRange: { min: -10, max: 99 } }).effectiveRange,
    ).toEqual(s.argBounds);
  });

  it('value axes: one default, right-hand axes and titles', () => {
    expect(chartValueAxesList(undefined)).toEqual([{}]);
    expect(chartValueAxesList([])).toEqual([{}]);
    const s = scene({
      valueAxis: [{ title: 'Left' }, { position: 'end', title: 'Right' }],
      argumentAxis: { title: 'Months' },
    });
    expect(s.valueAxes[1].anchor).toBe('start');
    expect(s.valueAxes[0].anchor).toBe('end');
    expect(s.valueAxes[1].titleTransform).toContain('rotate(90)');
    expect(s.plot.h).toBe(400 - 16 - 34 - 14);
    expect(s.plot.w).toBe(600 - 52 - 52);
  });

  it('strip lines and annotations resolve on the argument axis', () => {
    const s = scene({
      stripLines: [
        { start: 'Feb', end: 'Mar', label: 'Band' },
        { start: 'Jan' },
        { start: 'Nope' },
      ],
      annotations: [
        { type: 'point', text: 'Peak', argument: 'Apr', value: 40 },
        { type: 'text', text: 'Note', argument: 'Jan' },
      ],
    });
    expect(s.stripRects).toHaveLength(2);
    expect(s.stripRects[0].widthPx).toBeGreaterThan(0);
    expect(s.stripRects[1].widthPx).toBe(0);
    expect(s.annotations.map((note) => note.isPoint)).toEqual([true, false]);
    expect(s.annotations[1].y).toBe(14);
  });

  it('big line series downsample the path, not the data', () => {
    const big = Array.from({ length: 20_000 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 100),
    }));
    const data = buildCartesianData({
      dataSource: big,
      series: [{ type: 'line', argumentField: 'x', valueField: 'y' }],
    });
    const s = buildCartesianScene({
      data,
      visualRange: null,
      visibilityOverrides: new Map(),
      width: 600,
      height: 400,
    });
    const commands = (s.renderSeries[0].linePathD?.match(/[ML] /g) ?? [])
      .length;
    expect(commands).toBeLessThan(2_000);
    expect(s.renderSeries[0].markers).toHaveLength(0); // over markerThreshold
    expect(data.sortedArgs).toHaveLength(20_000);
  });

  it('marker radius defaults per type', () => {
    expect(
      chartMarkerRadius(
        { x: 0, y: 0, seriesIndex: 0, pointIndex: 0 },
        'scatter',
      ),
    ).toBe(4);
    expect(
      chartMarkerRadius({ x: 0, y: 0, seriesIndex: 0, pointIndex: 0 }, 'line'),
    ).toBe(3.5);
    expect(
      chartMarkerRadius(
        { x: 0, y: 0, seriesIndex: 0, pointIndex: 0, r: 9 },
        'bubble',
      ),
    ).toBe(9);
  });
});

describe('cartesian model — text, hover and interaction', () => {
  it('formats arguments and values (OHLC, ranges, plain)', () => {
    const base = {
      argument: 'x',
      argNumeric: 0,
      value: null,
      value2: null,
      size: null,
      open: null,
      high: null,
      low: null,
      close: null,
      source: {},
      index: 0,
    };
    expect(chartValueText({ ...base, value: 1234.5 }, 'en-US')).toBe('1,234.5');
    expect(chartValueText({ ...base, value: 5, value2: 2 }, 'en-US')).toBe(
      '2 – 5',
    );
    expect(
      chartValueText({ ...base, open: 1, high: 3, low: 0, close: 2 }, 'en-US'),
    ).toBe('O 1 H 3 L 0 C 2');
    expect(chartArgumentText('category', base, 'en-US')).toBe('x');
    expect(
      chartArgumentText(
        'time',
        { ...base, argNumeric: new Date(2026, 0, 5).getTime() },
        'en-US',
      ),
    ).toBe('Jan 5, 2026');
  });

  it('builds the aria label, the sr table and point announcements', () => {
    const s = scene();
    expect(cartesianAriaLabel(OGE_DEFAULT_CHARTS_MESSAGES, 'Revenue', 2)).toBe(
      'Revenue chart with 2 series. Use arrow keys to inspect points, Enter to select',
    );
    expect(cartesianAriaLabel(OGE_DEFAULT_CHARTS_MESSAGES, '', 1)).toContain(
      'Data chart',
    );
    const rows = cartesianSrRows(s, 50);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ argText: 'Jan', cells: ['10', '4'] });
    expect(rows[2].cells).toEqual(['', '5']);
    expect(cartesianSrRows(s, 2)).toHaveLength(2);
    expect(
      cartesianPointAnnouncement(s, OGE_DEFAULT_CHARTS_MESSAGES, 0, 0),
    ).toBe('Sales, Jan: 10');
    expect(
      cartesianPointAnnouncement(s, OGE_DEFAULT_CHARTS_MESSAGES, 0, 9),
    ).toBeNull();
  });

  it('hover: nearest series, active points, crosshair and tooltip', () => {
    const s = scene();
    const hover = cartesianHoverAt(s, s.argScale.toPx(1), 10);
    expect(hover.position).toBe(1);
    expect(cartesianHoverAt(s, -5, 10)).toEqual({
      position: null,
      pointerY: null,
    });
    const state = {
      activeArgPos: 1,
      pointerY: s.valueScales[0].toPx(6),
      activeSeriesIndex: 0,
    };
    expect(cartesianNearestSeries(s, state)).toBe(1);
    const single = cartesianActivePoints(s, state, false);
    expect(single.map((point) => point.seriesName)).toEqual(['Cost']);
    const shared = cartesianActivePoints(s, state, true);
    expect(shared).toHaveLength(2);
    expect(cartesianCrosshair(s, state, {})?.y).toBe(state.pointerY);
    expect(cartesianCrosshair(s, state, { enabled: false })).toBeNull();
    const tip = cartesianTooltip(s, state, shared, {}, false);
    expect(tip?.argumentText).toBe('Feb');
    expect(cartesianTooltip(s, state, shared, {}, true)).toBeNull();
    expect(
      cartesianTooltip(s, state, shared, { enabled: false }, false),
    ).toBeNull();
    expect(
      cartesianActivePoints(s, { ...state, activeArgPos: null }, true),
    ).toEqual([]);
  });

  it('zoom: wheel, drag modes, pan and the drag-select threshold', () => {
    const s = scene();
    expect(chartWheelZoomEnabled('both')).toBe(true);
    expect(chartWheelZoomEnabled('drag')).toBe(false);
    const zoomed = cartesianWheelRange(s, s.plot.w / 2, -1);
    expect(zoomed).not.toBeNull();
    expect(zoomed!.max - zoomed!.min).toBeLessThan(
      s.argBounds.max - s.argBounds.min,
    );
    expect(cartesianWheelRange(s, -1, -1)).toBeNull();
    expect(chartDragMode('both', true, true)).toBe('pan');
    expect(chartDragMode('drag', false, false)).toBe('zoom');
    expect(chartDragMode('wheel', false, false)).toBeNull();
    expect(chartDragMode('both', false, true)).toBeNull();
    expect(cartesianSelectionRange(s, 10, 15)).toBeNull();
    expect(cartesianSelectionRange(s, 10, 200)).not.toBeNull();
    const panned = cartesianPanRange(s, { min: 0, max: 1 }, -s.plot.w / 4);
    expect(panned.min).toBeGreaterThan(0);
    expect(chartZoomSelectionRect(40, 10)).toEqual({ x: 10, w: 30 });
  });

  it('selection: point toggle, Ctrl multi, series mode, off', () => {
    const target = { seriesIndex: 0, pointIndex: 2 };
    expect(nextChartSelection('none', [], target, 4, false)).toBeNull();
    expect(nextChartSelection('point', [], target, 4, false)).toEqual([target]);
    expect(nextChartSelection('point', [target], target, 4, false)).toEqual([]);
    const other = { seriesIndex: 1, pointIndex: 0 };
    expect(nextChartSelection('point', [other], target, 4, true)).toEqual([
      other,
      target,
    ]);
    expect(nextChartSelection('point', [other], target, 4, false)).toEqual([
      target,
    ]);
    expect(nextChartSelection('series', [], target, 3, false)).toHaveLength(3);
    expect(
      nextChartSelection(
        'series',
        [{ seriesIndex: 0, pointIndex: 0 }],
        target,
        3,
        false,
      ),
    ).toEqual([]);
    expect(isChartPointSelected([target], 0, 2)).toBe(true);
    expect(isChartPointSelected([target], 0, 1)).toBe(false);
    expect(chartSeriesGroupOpacity(null, 1)).toBe(1);
    expect(chartSeriesGroupOpacity(0, 1)).toBe(0.25);
  });

  it('export data snapshots names, colors, visibility and the range', () => {
    const data = cartesianExportData(scene(), 'Revenue');
    expect(data.title).toBe('Revenue');
    expect(data.series.map((entry) => entry.visible)).toEqual([true, true]);
    expect(data.argumentKind).toBe('category');
  });
});
