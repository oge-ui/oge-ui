import {
  buildCartesianData,
  buildCartesianScene,
  cartesianActivePoints,
  cartesianCrosshair,
  cartesianDragArgDelta,
  cartesianHoverAt,
  cartesianLabelTransform,
  cartesianPanRange,
  cartesianPinchRange,
  cartesianPlotArgPx,
  cartesianSeriesEnterOrigin,
  cartesianSeriesPane,
  cartesianTooltip,
  cartesianWheelRange,
  cartesianZoomRect,
  chartDragMode,
  chartTouchAction,
  chartTouchGestures,
  type OgeCartesianSceneInput,
} from './cartesian-model';
import type { ChartSeriesInput } from './series-model';

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

const SERIES: ChartSeriesInput<Row>[] = [
  { type: 'bar', argumentField: 'month', valueField: 'sales', name: 'Sales' },
  { type: 'line', argumentField: 'month', valueField: 'cost', name: 'Cost' },
];

function scene(
  overrides: Partial<OgeCartesianSceneInput<Row>> = {},
  series: ChartSeriesInput<Row>[] = SERIES,
  dataSource: Row[] = DATA,
) {
  const data = buildCartesianData({ dataSource, series });
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

const argLabels = (s: ReturnType<typeof scene>) =>
  s.axisLabels.filter((label) => label.axis === 'argument');
const valueLabels = (s: ReturnType<typeof scene>) =>
  s.axisLabels.filter((label) => label.axis === 'value');

describe('rotated chart', () => {
  it('keeps the default layout unchanged', () => {
    const plain = scene();
    expect(plain.rotated).toBe(false);
    expect(plain.frame.transform).toBeNull();
    expect(plain.plot).toEqual({ x: 52, y: 16, w: 536, h: 350 });
    expect(argLabels(plain).map((label) => label.text)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
    ]);
    expect(argLabels(plain)[0]).toMatchObject({ anchor: 'middle', y: 382 });
    expect(valueLabels(plain)[0]).toMatchObject({ x: 44, anchor: 'end' });
  });

  it('runs the argument axis down the left and the values left to right', () => {
    const rotated = scene({ rotated: true });
    expect(rotated.rotated).toBe(true);
    expect(rotated.frame.argLen).toBe(rotated.plot.h);
    expect(rotated.frame.valLen).toBe(rotated.plot.w);
    expect(rotated.frame.transform).toBe(
      `matrix(0 1 -1 0 ${rotated.plot.w} 0)`,
    );
    // argument labels: right-aligned left of the plot, first category on top
    const args = argLabels(rotated);
    expect(args.every((label) => label.anchor === 'end')).toBe(true);
    expect(args.every((label) => label.x === rotated.plot.x - 8)).toBe(true);
    expect(args[0].y).toBeLessThan(args[3].y);
    // value labels: centered under the plot, growing to the right
    const values = valueLabels(rotated);
    expect(
      values.every((label) => label.y > rotated.plot.y + rotated.plot.h),
    ).toBe(true);
    expect(values[0].x).toBeLessThan(values[values.length - 1].x);
    // the argument axis line is the plot's left edge
    expect(rotated.axisLines[0]).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: rotated.plot.h,
    });
    // value labels drawn inside the rotated group start beside the bar end
    expect(rotated.pointLabelAnchor).toBe('start');
    expect(cartesianLabelTransform(rotated, 5, 7)).toBe('rotate(-90 5 7)');
  });

  it('hit-tests, zooms and pans along the vertical argument axis', () => {
    const rotated = scene({ rotated: true });
    const { plot, frame } = rotated;
    const band = frame.argLen / 4;
    // pointer on the third category row, anywhere across
    const hit = cartesianHoverAt(rotated, plot.w * 0.3, band * 2.5);
    expect(hit.position).toBe(2);
    expect(hit.pointerY).toBeCloseTo(plot.w * 0.7);
    expect(cartesianPlotArgPx(rotated, 10, 33)).toBe(33);
    expect(cartesianPlotArgPx(rotated, -1, 33)).toBeNull();
    expect(cartesianDragArgDelta(rotated, 5, 9)).toBe(9);
    // the crosshair's argument line runs horizontally
    const cross = cartesianCrosshair(
      rotated,
      { activeArgPos: 2, pointerY: hit.pointerY, activeSeriesIndex: 0 },
      {},
    );
    expect(cross?.argLine.y1).toBe(cross?.argLine.y2);
    expect(cross?.valueLine?.x1).toBe(cross?.valueLine?.x2);
    // the wheel zooms around the pointer's row
    const zoomed = cartesianWheelRange(rotated, 10, -1, band * 0.5);
    expect(zoomed).not.toBeNull();
    // the first row (value 0, 1/8 down) stays under the cursor: span 4 → 3.2
    expect(zoomed?.min).toBeCloseTo(-0.4);
    expect(zoomed?.max).toBeCloseTo(2.8);
    // a downward drag moves the window back (content follows the pointer)
    const panned = cartesianPanRange(
      rotated,
      { min: 1, max: 2 },
      0,
      frame.argLen / 2,
    );
    expect(panned.min).toBeLessThan(1);
    // the zoom rect spans the value axis
    expect(cartesianZoomRect(rotated, 20, 60)).toEqual({
      x: 0,
      y: 20,
      w: plot.w,
      h: 40,
    });
  });

  it('opens the tooltip beside the argument row', () => {
    const rotated = scene({ rotated: true });
    const state = { activeArgPos: 3, pointerY: 50, activeSeriesIndex: 0 };
    const points = cartesianActivePoints(rotated, state, true);
    const tip = cartesianTooltip(rotated, state, points, {}, false);
    expect(tip).toMatchObject({ alignX: 'start', alignY: 'end' });
    expect(tip?.x).toBe(rotated.plot.x + 8);
  });

  it('rotates stacked and range bars too (geometry stays logical)', () => {
    const stacked = scene({ rotated: true }, [
      { type: 'stackedBar', argumentField: 'month', valueField: 'sales' },
      { type: 'stackedBar', argumentField: 'month', valueField: 'cost' },
    ]);
    const [low, high] = stacked.renderSeries;
    // logical y: the upper segment sits above (smaller v) the lower one
    expect(high.bars[0].y + high.bars[0].h).toBeCloseTo(low.bars[0].y, 0);
    const range = scene({ rotated: true }, [
      {
        type: 'rangeBar',
        argumentField: 'month',
        value1Field: 'cost',
        value2Field: 'sales',
      },
    ]);
    expect(range.renderSeries[0].bars).toHaveLength(4);
  });
});

describe('RTL', () => {
  it('mirrors the argument axis and moves the value axis to the right', () => {
    const rtl = scene({ rtl: true });
    expect(rtl.argScale.inverted).toBe(true);
    const args = argLabels(rtl);
    expect(args[0].x).toBeGreaterThan(args[3].x);
    const values = valueLabels(rtl);
    expect(values[0].anchor).toBe('start');
    expect(values[0].x).toBeGreaterThan(rtl.plot.x + rtl.plot.w);
    expect(rtl.plot.x).toBe(12);
  });

  it('pans and wheel-zooms the mirrored axis in screen terms', () => {
    const rtl = scene({ rtl: true, visualRange: { min: 0.5, max: 2.5 } });
    // dragging right reveals earlier arguments… which are on the right now
    const panned = cartesianPanRange(rtl, { min: 0.5, max: 2.5 }, 100);
    expect(panned.min).toBeGreaterThan(0.5);
    // the wheel focus is the argument under the cursor (near the left = late)
    const zoomed = cartesianWheelRange(rtl, 10, -1);
    expect(zoomed?.max).toBeCloseTo(2.5, 1);
  });

  it('opens the tooltip leftward by default', () => {
    const rtl = scene({ rtl: true });
    const state = { activeArgPos: 1, pointerY: 100, activeSeriesIndex: 0 };
    const tip = cartesianTooltip(
      rtl,
      state,
      cartesianActivePoints(rtl, state, true),
      {},
      false,
    );
    expect(tip?.alignX).toBe('end');
  });

  it('mirrors the rotated chart: values grow to the left, labels on the right', () => {
    const both = scene({ rotated: true, rtl: true });
    expect(both.frame.transform).toBe('matrix(0 1 1 0 0 0)');
    const args = argLabels(both);
    expect(args[0]).toMatchObject({ anchor: 'start' });
    expect(args[0].x).toBe(both.plot.x + both.plot.w + 8);
    const values = valueLabels(both);
    expect(values[0].x).toBeGreaterThan(values[values.length - 1].x);
    expect(both.pointLabelAnchor).toBe('end');
  });
});

describe('constant lines and strips', () => {
  it('draws value-axis lines and strips across the plot', () => {
    const s = scene({
      valueAxis: {
        constantLines: [{ value: 20, label: 'Target', color: 'red' }],
        strips: [{ start: 30, end: 40, label: 'Stretch' }],
      },
      argumentAxis: { constantLines: [{ value: 'Mar', label: 'Launch' }] },
    });
    const target = s.guides.find((guide) => guide.label?.text === 'Target');
    const y = s.valueScales[0].toPx(20);
    expect(target?.line).toEqual({ x1: 0, y1: y, x2: s.plot.w, y2: y });
    expect(target?.color).toBe('red');
    expect(target?.dashArray).toBe('6 4');
    const stretch = s.guides.find((guide) => guide.label?.text === 'Stretch');
    expect(stretch?.kind).toBe('band');
    expect(stretch?.rect.w).toBe(s.plot.w);
    const launch = s.guides.find((guide) => guide.label?.text === 'Launch');
    const x = s.argScale.toPx(2);
    expect(launch?.line).toEqual({ x1: x, y1: 0, x2: x, y2: s.plot.h });
  });

  it('reserves the margins outside labels need', () => {
    const plain = scene();
    const outside = scene({
      valueAxis: {
        constantLines: [{ value: 20, label: 'Budget', position: 'outside' }],
      },
      argumentAxis: {
        constantLines: [{ value: 'Feb', label: 'Go', position: 'outside' }],
      },
    });
    expect(outside.plot.w).toBeLessThan(plain.plot.w);
    expect(outside.plot.y).toBeGreaterThan(plain.plot.y);
    const budget = outside.guides.find(
      (guide) => guide.label?.text === 'Budget',
    );
    expect(budget?.label?.x).toBeGreaterThan(outside.plot.w);
  });

  it('turns with the rotated chart', () => {
    const s = scene({
      rotated: true,
      valueAxis: { constantLines: [{ value: 20, label: 'Target' }] },
    });
    const target = s.guides.find((guide) => guide.label?.text === 'Target');
    expect(target?.line.x1).toBe(target?.line.x2);
    expect(target?.line.y2).toBe(s.plot.h);
  });
});

describe('panes', () => {
  const panes = [
    { name: 'price', height: 3 },
    { name: 'volume', height: 1 },
  ];
  const series: ChartSeriesInput<Row>[] = [
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
  ];

  it('stacks plot areas with their own value axes over one argument axis', () => {
    const s = scene({ panes }, series);
    expect(s.panes).toHaveLength(2);
    const [price, volume] = s.panes;
    expect(price.start).toBe(0);
    expect(volume.start).toBeGreaterThan(price.start + price.size);
    expect(s.valueAxesOptions).toHaveLength(2);
    expect(s.seriesAxis).toEqual([0, 1]);
    expect(s.seriesPane).toEqual([0, 1]);
    expect(cartesianSeriesPane(s, 1)).toBe(1);
    // each axis maps into its own band
    const priceScale = s.valueScales[0];
    const volumeScale = s.valueScales[1];
    expect(priceScale.toPx(priceScale.max)).toBeCloseTo(price.start);
    expect(volumeScale.toPx(0)).toBeCloseTo(volume.start + volume.size);
    // the volume bars live inside their pane
    for (const bar of s.renderSeries[1].bars) {
      expect(bar.y).toBeGreaterThanOrEqual(volume.start - 0.5);
      expect(bar.y + bar.h).toBeLessThanOrEqual(
        volume.start + volume.size + 0.5,
      );
    }
    // the bound axis is visible through scene.data too
    expect(s.data.seriesList[1].input.axis).toBe(1);
    // one argument axis line per pane bottom; labels only under the last pane
    expect(s.axisLines).toHaveLength(2);
    const args = argLabels(s);
    expect(args[0].y).toBeGreaterThan(s.plot.y + volume.start + volume.size);
    // grid lines stay in their pane
    expect(s.gridLines.length).toBeGreaterThan(0);
  });

  it('shares the crosshair and limits the horizontal line to the hovered pane', () => {
    const s = scene({ panes }, series);
    const volume = s.panes[1];
    const v = volume.start + volume.size / 2;
    const cross = cartesianCrosshair(
      s,
      { activeArgPos: 1, pointerY: v, activeSeriesIndex: 0 },
      {},
    );
    expect(cross?.argLine).toMatchObject({ y1: 0, y2: s.plot.h });
    expect(cross?.valueLine).toMatchObject({ y1: v, y2: v });
    const gap = cartesianCrosshair(
      s,
      {
        activeArgPos: 1,
        pointerY: s.panes[0].size + 4,
        activeSeriesIndex: 0,
      },
      {},
    );
    expect(gap?.valueLine).toBeNull();
  });

  it('grows each series from its own pane baseline', () => {
    const s = scene({ panes }, series);
    const volume = s.panes[1];
    expect(cartesianSeriesEnterOrigin(s, 1)).toBe(
      `0px ${Math.round((volume.start + volume.size) * 100) / 100}px`,
    );
  });
});

describe('axis options', () => {
  const numeric = Array.from({ length: 11 }, (_, i) => ({
    month: String(i),
    x: i * 10,
    sales: i < 5 ? i * 10 : 1000 + i,
    cost: i,
  }));
  const numericSeries: ChartSeriesInput<(typeof numeric)[number]>[] = [
    { type: 'line', argumentField: 'x', valueField: 'sales', name: 'S' },
  ];
  const numericScene = (
    overrides: Partial<OgeCartesianSceneInput<(typeof numeric)[number]>>,
  ) =>
    buildCartesianScene({
      data: buildCartesianData({ dataSource: numeric, series: numericSeries }),
      visualRange: null,
      visibilityOverrides: new Map(),
      width: 600,
      height: 400,
      locale: 'en-US',
      ...overrides,
    });

  it('skips a value range with a break marker', () => {
    const s = numericScene({
      valueAxis: { breaks: [{ start: 60, end: 990 }] },
    });
    expect(s.valueScales[0].breaks).toHaveLength(1);
    expect(s.breakMarkers).toHaveLength(1);
    const labels = valueLabels(s).map((label) => Number(label.text));
    expect(labels.some((value) => value > 60 && value < 990)).toBe(false);
  });

  it('applies tickInterval, minor ticks and whole-number ticks', () => {
    const s = numericScene({
      argumentAxis: { tickInterval: 25, minorTicks: true, grid: true },
      valueAxis: { allowDecimals: false },
    });
    expect(argLabels(s).map((label) => label.text)).toEqual([
      '0',
      '25',
      '50',
      '75',
      '100',
    ]);
    expect(s.tickMarks.length).toBeGreaterThan(0);
    expect(s.gridLines.some((line) => line.minor)).toBe(true);
  });

  it('formats labels with Intl options and a template', () => {
    const s = numericScene({
      argumentAxis: {
        tickInterval: 50,
        label: { format: { minimumFractionDigits: 1 }, template: '{value} km' },
      },
      valueAxis: { label: { template: '${value}' } },
    });
    expect(argLabels(s).map((label) => label.text)).toEqual([
      '0.0 km',
      '50.0 km',
      '100.0 km',
    ]);
    expect(valueLabels(s)[0].text.startsWith('$')).toBe(true);
  });

  it('staggers or hides crowded argument labels', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      month: `Category ${i}`,
      sales: i,
      cost: i,
    }));
    const stagger = scene(
      { argumentAxis: { label: { overlap: 'stagger' } } },
      SERIES,
      many,
    );
    const ys = new Set(argLabels(stagger).map((label) => label.y));
    expect(ys.size).toBe(2);
    const hide = scene(
      { argumentAxis: { label: { overlap: 'hide' } } },
      SERIES,
      many,
    );
    const kept = argLabels(hide);
    expect(kept.length).toBeLessThan(30);
    for (let i = 1; i < kept.length; i++) {
      expect(kept[i].x - kept[i - 1].x).toBeGreaterThan(60);
    }
    const hidden = scene({ argumentAxis: { label: { visible: false } } });
    expect(argLabels(hidden)).toHaveLength(0);
  });
});

describe('touch', () => {
  it('maps touch drags and declares the touch-action', () => {
    expect(chartDragMode('both', true, false, 'touch')).toBe('pan');
    expect(chartDragMode('both', false, false, 'touch')).toBe('zoom');
    expect(chartDragMode('both', true, false, 'mouse')).toBe('zoom');
    expect(chartTouchGestures('none', false)).toBe(false);
    expect(chartTouchAction(scene(), 'both', false)).toBe('pan-y');
    expect(chartTouchAction(scene({ rotated: true }), 'none', true)).toBe(
      'pan-x',
    );
    expect(chartTouchAction(scene(), 'none', false)).toBeNull();
  });

  it('pinch-zooms around the fingers and pans with them', () => {
    const s = scene({ argumentAxis: { type: 'linear' } }, [
      { type: 'line', argumentField: 'sales', valueField: 'cost' },
    ]);
    const start = s.effectiveRange;
    const w = s.frame.argLen;
    const span = start.max - start.min;
    // spread the fingers from the middle half to the whole width: zoom 2×
    const zoomed = cartesianPinchRange(
      s,
      start,
      { x: w * 0.25, y: 10 },
      { x: w * 0.75, y: 10 },
      { x: 0, y: 10 },
      { x: w, y: 10 },
    );
    expect(zoomed?.max).toBeCloseTo(start.min + span * 0.75);
    expect(zoomed?.min).toBeCloseTo(start.min + span * 0.25);
    // both fingers move left together: a pan to later arguments
    const panned = cartesianPinchRange(
      s,
      { min: 15, max: 25 },
      { x: w * 0.25, y: 0 },
      { x: w * 0.75, y: 0 },
      { x: w * 0.15, y: 0 },
      { x: w * 0.65, y: 0 },
    );
    expect(panned?.min).toBeCloseTo(16);
    // fingers too close together: no change
    expect(
      cartesianPinchRange(
        s,
        start,
        { x: 5, y: 0 },
        { x: 8, y: 0 },
        { x: 5, y: 0 },
        { x: 9, y: 0 },
      ),
    ).toBeNull();
  });
});
