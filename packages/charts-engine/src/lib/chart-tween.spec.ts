import {
  buildCartesianData,
  buildCartesianScene,
  type OgeCartesianSceneInput,
} from './cartesian-model';
import {
  cartesianShouldTween,
  cartesianTweenFrame,
  chartArgumentKey,
  createChartTweenDriver,
  interpolateChartFrames,
  interpolatePieFrames,
  pieShouldTween,
  pieTweenFrame,
  type OgeChartTweenClock,
  type OgeChartTweenFrame,
} from './chart-tween';
import { buildPieScene, type OgePieSceneInput } from './pie-model';
import type { ChartSeriesInput } from './series-model';

interface Row {
  month: string;
  a: number;
  b: number;
}

const ROWS: Row[] = [
  { month: 'Jan', a: 10, b: 4 },
  { month: 'Feb', a: 20, b: 6 },
  { month: 'Mar', a: 30, b: 8 },
];

const BARS: ChartSeriesInput<Row>[] = [
  { type: 'bar', argumentField: 'month', valueField: 'a', name: 'A' },
];

function scene(
  rows: readonly Row[],
  series: readonly ChartSeriesInput<Row>[] = BARS,
  overrides: Partial<OgeCartesianSceneInput<Row>> = {},
) {
  return buildCartesianScene({
    data: buildCartesianData({ dataSource: rows, series }),
    visualRange: null,
    visibilityOverrides: new Map(),
    width: 600,
    height: 400,
    locale: 'en-US',
    ...overrides,
  });
}

const barsOf = (frame: OgeChartTweenFrame, series = 0) =>
  frame.renderSeries[series].bars;

describe('chartArgumentKey', () => {
  it('keys dates by time and keeps kinds apart', () => {
    expect(chartArgumentKey(new Date(5))).toBe('d5');
    expect(chartArgumentKey(5)).toBe('n5');
    expect(chartArgumentKey('5')).toBe('s5');
  });
});

describe('cartesian tween frames', () => {
  it('matches bars by category, not by position', () => {
    const before = cartesianTweenFrame(scene(ROWS));
    // same categories, reordered data and one value changed
    const after = cartesianTweenFrame(
      scene([ROWS[2], { ...ROWS[1], a: 40 }, ROWS[0]]),
    );
    expect(before.series[0].barKeys).toEqual(['sJan', 'sFeb', 'sMar']);
    const tween = interpolateChartFrames(before, after);
    const mid = barsOf(tween(0.5));
    const feb = after.series[0].barKeys.indexOf('sFeb');
    const febBefore = barsOf(before)[1];
    const febAfter = barsOf(after)[feb];
    expect(mid[feb].h).toBeCloseTo((febBefore.h + febAfter.h) / 2, 5);
    expect(tween(1)).toBe(after);
  });

  it('grows new marks from the baseline and shrinks removed ones to it', () => {
    const before = cartesianTweenFrame(scene(ROWS.slice(0, 2)));
    const after = cartesianTweenFrame(scene(ROWS.slice(1)));
    const baseline = after.series[0].baseline;
    const tween = interpolateChartFrames(before, after);
    const start = tween(0);
    const keys = start.series[0].barKeys;
    // live bars first (Feb, Mar), then the leaving one (Jan)
    expect(keys).toEqual(['sFeb', 'sMar', 'sJan']);
    const bars = barsOf(start);
    expect(bars[1].h).toBe(0);
    expect(bars[1].y).toBe(baseline);
    // the leaving bar never collides with a live point index
    expect(bars[2].pointIndex).toBeLessThan(0);
    const late = barsOf(tween(0.999));
    expect(late[2].h).toBeLessThan(1);
    expect(late[2].y).toBeCloseTo(baseline, 0);
    expect(tween(1).series[0].barKeys).toEqual(['sFeb', 'sMar']);
  });

  it('fades a hidden series out while the value axis re-scales', () => {
    const series: ChartSeriesInput<Row>[] = [
      { type: 'line', argumentField: 'month', valueField: 'a', name: 'A' },
      { type: 'line', argumentField: 'month', valueField: 'b', name: 'B' },
    ];
    const shown = scene(ROWS, series);
    const hidden = scene(ROWS, series, {
      visibilityOverrides: new Map([[0, false]]),
    });
    expect(cartesianShouldTween(shown, hidden)).toBe(true);
    const tween = interpolateChartFrames(
      cartesianTweenFrame(shown),
      cartesianTweenFrame(hidden),
    );
    const mid = tween(0.5);
    const leaving = mid.renderSeries.find((rs) => rs.name === 'A');
    expect(leaving?.fade).toBeCloseTo(0.5, 5);
    // B keeps a full fade and its line morphs towards the new scale
    const b = mid.renderSeries.find((rs) => rs.name === 'B');
    expect(b?.fade).toBeUndefined();
    expect(b?.linePathD).not.toBe(shown.renderSeries[1].linePathD);
    expect(b?.linePathD).not.toBe(hidden.renderSeries[0].linePathD);
    // value ticks: shared ones slide, the rest fade
    const opacities = mid.axisLabels
      .filter((label) => label.axis === 'value')
      .map((label) => label.opacity);
    expect(opacities.some((o) => o !== undefined && o < 1)).toBe(true);
    expect(mid.gridLines.every((line) => line.opacity !== undefined)).toBe(
      true,
    );
    // showing it again reverses: it fades back in from 0
    const back = interpolateChartFrames(
      cartesianTweenFrame(hidden),
      cartesianTweenFrame(shown),
    );
    expect(back(0).renderSeries.find((rs) => rs.name === 'A')?.fade).toBe(0);
  });

  it('slides a kept tick along the re-scaled axis and fades new ones in from their old place', () => {
    const before = cartesianTweenFrame(scene(ROWS));
    const after = cartesianTweenFrame(
      scene(ROWS.map((row) => ({ ...row, a: row.a * 2 }))),
    );
    const zeroBefore = before.axisLabels.find((l) => l.value === 0);
    const tenBefore = before.axisLabels.find((l) => l.value === 10);
    const tenAfter = after.axisLabels.find((l) => l.value === 10);
    expect(zeroBefore && tenBefore).toBeTruthy();
    const mid = interpolateChartFrames(before, after)(0.5);
    const ten = mid.axisLabels.find((l) => l.value === 10);
    if (tenAfter !== undefined && tenBefore !== undefined) {
      expect(ten?.y).toBeCloseTo((tenBefore.y + tenAfter.y) / 2, 5);
    }
    const added = after.axisLabels.find(
      (l) =>
        l.axis === 'value' &&
        !before.axisLabels.some(
          (b) => b.axis === 'value' && b.value === l.value,
        ),
    );
    expect(added).toBeDefined();
    const addedMid = mid.axisLabels.find((l) => l.value === added?.value);
    expect(addedMid?.opacity).toBeCloseTo(0.5, 5);
  });

  it('morphs lines point by point and resamples a grown series', () => {
    const lines: ChartSeriesInput<Row>[] = [
      { type: 'area', argumentField: 'month', valueField: 'a', name: 'A' },
    ];
    const before = cartesianTweenFrame(scene(ROWS.slice(0, 2), lines));
    const after = cartesianTweenFrame(scene(ROWS, lines));
    const mid = interpolateChartFrames(before, after)(0.5).renderSeries[0];
    expect(mid.linePathD).toMatch(/^M /);
    expect(mid.areaPathD).toMatch(/Z$/);
    expect(interpolateChartFrames(before, after)(1).renderSeries[0]).toBe(
      after.renderSeries[0],
    );
  });

  it('grows scatter markers from the baseline with an explicit radius', () => {
    const scatter: ChartSeriesInput<Row>[] = [
      { type: 'scatter', argumentField: 'month', valueField: 'a', name: 'S' },
    ];
    const before = cartesianTweenFrame(scene(ROWS.slice(0, 2), scatter));
    const after = cartesianTweenFrame(scene(ROWS, scatter));
    expect(after.series[0].render.markers[0].r).toBe(4);
    const start = interpolateChartFrames(before, after)(0);
    const mar = start.renderSeries[0].markers[2];
    expect(mar.r).toBe(0);
    expect(mar.y).toBe(after.series[0].baseline);
  });

  it('retargets mid-tween from the frame on screen', () => {
    const a = cartesianTweenFrame(scene(ROWS));
    const b = cartesianTweenFrame(scene(ROWS.map((r) => ({ ...r, a: 5 }))));
    const c = cartesianTweenFrame(scene(ROWS.map((r) => ({ ...r, a: 25 }))));
    const onScreen = interpolateChartFrames(a, b)(0.4);
    const retarget = interpolateChartFrames(onScreen, c);
    // no jump: the first frame of the new tween is the frame on screen
    expect(barsOf(retarget(0)).map((bar) => bar.h)).toEqual(
      barsOf(onScreen).map((bar) => bar.h),
    );
    expect(retarget(1)).toBe(c);
  });

  it('enters a new series with a fade and grows it', () => {
    const one = cartesianTweenFrame(scene(ROWS));
    const two = cartesianTweenFrame(
      scene(ROWS, [
        ...BARS,
        { type: 'bar', argumentField: 'month', valueField: 'b', name: 'B' },
      ]),
    );
    const start = interpolateChartFrames(one, two)(0);
    const b = start.renderSeries.find((rs) => rs.name === 'B');
    expect(b?.fade).toBe(0);
    expect(b?.bars.every((bar) => bar.h === 0)).toBe(true);
  });

  it('only tweens data and visibility updates of the same-sized chart', () => {
    const base = scene(ROWS);
    expect(cartesianShouldTween(null, base)).toBe(false);
    expect(cartesianShouldTween(base, base)).toBe(false);
    expect(cartesianShouldTween(base, scene(ROWS.slice(1)))).toBe(true);
    // resize, zoom: immediate
    expect(cartesianShouldTween(base, scene(ROWS, BARS, { width: 300 }))).toBe(
      false,
    );
    const data = buildCartesianData({ dataSource: ROWS, series: BARS });
    const input = {
      data,
      visibilityOverrides: new Map<number, boolean>(),
      width: 600,
      height: 400,
    };
    expect(
      cartesianShouldTween(
        buildCartesianScene({ ...input, visualRange: null }),
        buildCartesianScene({ ...input, visualRange: { start: 0, end: 1 } }),
      ),
    ).toBe(false);
  });
});

describe('pie tween', () => {
  interface Share {
    name: string;
    v: number;
  }
  const pie = (rows: Share[]) =>
    buildPieScene({
      dataSource: rows,
      argumentField: 'name',
      valueField: 'v',
      type: 'doughnut',
      innerRadius: 0.5,
      startAngle: 0,
      smallValuesGrouping: null,
      othersLabel: 'Others',
      showLabels: true,
      width: 400,
      height: 300,
    } satisfies OgePieSceneInput<Share>);
  const A = { name: 'A', v: 50 };
  const B = { name: 'B', v: 25 };
  const C = { name: 'C', v: 25 };

  it('sweeps matched slices to their new angles', () => {
    const before = pieTweenFrame(pie([A, B, C]));
    const after = pieTweenFrame(pie([{ ...A, v: 25 }, { ...B, v: 50 }, C]));
    const mid = interpolatePieFrames(before, after)(0.5);
    const a = mid.slices.find((s) => s.key === '0|sA');
    expect(a?.endAngle).toBeCloseTo((Math.PI + Math.PI / 2) / 2, 5);
    expect(mid.sliceVms[0].path).not.toBe(before.sliceVms[0].path);
    expect(interpolatePieFrames(before, after)(1)).toBe(after);
  });

  it('opens a new slice from its seam and closes a removed one onto it', () => {
    const before = pieTweenFrame(pie([A, C]));
    const after = pieTweenFrame(pie([A, B, C]));
    const start = interpolatePieFrames(before, after)(0);
    const b = start.slices.find((s) => s.key === '0|sB');
    const aOld = before.slices[0];
    expect(b?.startAngle).toBeCloseTo(aOld.endAngle, 5);
    expect(b?.endAngle).toBeCloseTo(aOld.endAngle, 5);
    // a zero-sweep slice is not drawn yet
    expect(start.sliceVms).toHaveLength(2);
    const removal = interpolatePieFrames(after, before);
    const late = removal(0.999).slices.find((s) => s.key === '0|sB');
    expect(late && late.endAngle - late.startAngle).toBeLessThan(0.01);
    const leaving = removal(0.5).sliceVms.find((vm) => vm.key.startsWith('~'));
    expect(leaving?.slice.index).toBeLessThan(0);
  });

  it('tweens only when the pie keeps its centre and radius', () => {
    const a = pie([A, B]);
    expect(pieShouldTween(null, a)).toBe(false);
    expect(pieShouldTween(a, pie([A, C]))).toBe(true);
    const wider = buildPieScene({
      dataSource: [A, C],
      argumentField: 'name',
      valueField: 'v',
      type: 'pie',
      innerRadius: 0,
      startAngle: 0,
      smallValuesGrouping: null,
      othersLabel: 'Others',
      showLabels: true,
      width: 800,
      height: 300,
    });
    expect(pieShouldTween(a, wider)).toBe(false);
  });
});

describe('createChartTweenDriver', () => {
  function manualClock() {
    let time = 0;
    let pending: ((time: number) => void) | null = null;
    const clock: OgeChartTweenClock = {
      now: () => time,
      request: (callback) => {
        pending = callback;
        return 1;
      },
      cancel: () => {
        pending = null;
      },
    };
    return {
      clock,
      advance(ms: number) {
        time += ms;
        const callback = pending;
        pending = null;
        callback?.(time);
      },
      get pending() {
        return pending !== null;
      },
    };
  }
  const lerpNumbers = (a: number, b: number) => (t: number) => a + (b - a) * t;
  const linear = { duration: 100, easing: (t: number) => t };

  it('emits the first frame at once, steps on each frame and ends with null', () => {
    const frames: (number | null)[] = [];
    const time = manualClock();
    const driver = createChartTweenDriver(
      lerpNumbers,
      (f) => frames.push(f),
      time.clock,
    );
    driver.run(0, 100, linear);
    expect(frames).toEqual([0]);
    expect(driver.running).toBe(true);
    time.advance(50);
    expect(frames[1]).toBe(50);
    time.advance(60);
    expect(frames[2]).toBeNull();
    expect(driver.running).toBe(false);
    expect(time.pending).toBe(false);
  });

  it('retargets from the frame on screen — no jump', () => {
    const frames: (number | null)[] = [];
    const time = manualClock();
    const driver = createChartTweenDriver(
      lerpNumbers,
      (f) => frames.push(f),
      time.clock,
    );
    driver.run(0, 100, linear);
    time.advance(40);
    expect(frames.at(-1)).toBe(40);
    // `from` is ignored while running: the tween continues from 40
    driver.run(100, 0, linear);
    expect(frames.at(-1)).toBe(40);
    time.advance(50);
    expect(frames.at(-1)).toBe(20);
  });

  it('cancels cleanly and no-ops without requestAnimationFrame', () => {
    const frames: (number | null)[] = [];
    const time = manualClock();
    const driver = createChartTweenDriver(
      lerpNumbers,
      (f) => frames.push(f),
      time.clock,
    );
    driver.run(0, 100, linear);
    driver.cancel();
    expect(frames).toEqual([0, null]);
    expect(time.pending).toBe(false);
    const ssr: (number | null)[] = [];
    createChartTweenDriver(lerpNumbers, (f) => ssr.push(f), null).run(
      0,
      1,
      linear,
    );
    expect(ssr).toEqual([null]);
  });
});
