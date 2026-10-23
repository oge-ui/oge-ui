import {
  ogeDrawSparkline,
  ogeSparklineAxis,
  ogeSparklineMarkerSize,
  type OgeSparklineDrawing,
  type OgeSparklinePaintColors,
  type OgeSparklineSpec,
  type OgeSparklineValue,
} from './sparkline';

/** Every part its own colour, as in the corpus workbook. */
const COLORS: OgeSparklinePaintColors = {
  series: '#0000FF',
  negative: '#FF0000',
  axis: '#00FF00',
  markers: '#FF00FF',
  first: '#00FFFF',
  last: '#FFFF00',
  high: '#800000',
  low: '#008000',
};

function spec(
  values: readonly OgeSparklineValue[],
  options: Partial<OgeSparklineSpec> = {},
): OgeSparklineSpec {
  const numbers = values.filter((v): v is number => typeof v === 'number');
  return {
    type: 'line',
    values,
    axis: ogeSparklineAxis(numbers),
    lineWeight: 0.75,
    markers: false,
    high: false,
    low: false,
    first: false,
    last: false,
    negative: false,
    displayXAxis: false,
    rightToLeft: false,
    colors: COLORS,
    ...options,
  };
}

/** Bars as `[x0, x1, y0, y1, colour]`, ends exclusive. */
const bars = (drawing: OgeSparklineDrawing) =>
  drawing.bars.map((b) => [b.x0, b.x1, b.y0, b.y1, b.color]);
/** Markers as `[cx, cy, colour]`. */
const markers = (drawing: OgeSparklineDrawing) =>
  drawing.markers.map((m) => [m.cx, m.cy, m.color]);

// Excel's pixels of a 20-character column and a 30 pt row (a 140 × 40 box,
// its last column and row the gridline), read off its screen
const W = 140;
const H = 40;
const UP = [1, 3, 2, 5, 4, 6];
const CROSSING = [3, -2, 4, -1, 2, -3];

describe('ogeSparklineAxis', () => {
  it('moves the end data stays away from zero a hair under 1/99 of the span', () => {
    expect(ogeSparklineAxis(UP)).toEqual({ lo: 1 - 5 * 0.010101010101, hi: 6 });
    expect(ogeSparklineAxis([-3, -1])).toEqual({
      lo: -3,
      hi: -1 + 2 * 0.010101010101,
    });
  });

  it('keeps data that reaches zero as it is', () => {
    expect(ogeSparklineAxis(CROSSING)).toEqual({ lo: -3, hi: 4 });
    expect(ogeSparklineAxis([0, 5])).toEqual({ lo: 0, hi: 5 });
  });

  it('spans equal values from zero, and leaves all zeros flat', () => {
    expect(ogeSparklineAxis([3, 3, 3])).toEqual({ lo: 0, hi: 3 });
    expect(ogeSparklineAxis([-3, -3])).toEqual({ lo: -3, hi: 0 });
    expect(ogeSparklineAxis([0, 0])).toEqual({ lo: 0, hi: 0 });
  });

  it('takes custom and group ends, without stretching a custom one', () => {
    expect(
      ogeSparklineAxis([3, 2, 4], { minAxisType: 'custom', manualMin: 0 }),
    ).toEqual({ lo: 0, hi: 4 });
    expect(
      ogeSparklineAxis([3, 2, 4], { minAxisType: 'custom', manualMin: 0.5 }),
    ).toEqual({ lo: 0.5, hi: 4 });
    expect(
      ogeSparklineAxis([4, 5, 6], {
        minAxisType: 'group',
        maxAxisType: 'group',
        groupMin: -2,
        groupMax: 6,
      }),
    ).toEqual({ lo: -2, hi: 6 });
  });

  it('has no scale without numbers, a custom end without its value, or crossed ends', () => {
    expect(ogeSparklineAxis([])).toBeNull();
    expect(ogeSparklineAxis(UP, { minAxisType: 'custom' })).toBeNull();
    expect(ogeSparklineAxis(UP, { maxAxisType: 'custom' })).toBeNull();
    expect(
      ogeSparklineAxis(UP, { minAxisType: 'custom', manualMin: 10 }),
    ).toBeNull();
  });
});

describe('ogeSparklineMarkerSize', () => {
  it('steps with the line weight and scales with the zoom (measured)', () => {
    expect(ogeSparklineMarkerSize(0.75, 1)).toBe(2);
    expect(ogeSparklineMarkerSize(1.5, 1)).toBe(2);
    expect(ogeSparklineMarkerSize(2.5, 1)).toBe(4);
    expect(ogeSparklineMarkerSize(6.5, 1)).toBe(6);
    expect(ogeSparklineMarkerSize(10, 1)).toBe(10);
    expect(ogeSparklineMarkerSize(0.75, 2)).toBe(4);
    expect(ogeSparklineMarkerSize(0.25, 0.1)).toBe(1);
  });
});

describe('ogeDrawSparkline', () => {
  it('stands columns on the moved axis end, 5/7 of their band wide', () => {
    const drawing = ogeDrawSparkline(
      spec(UP, { type: 'column', first: true }),
      W,
      H,
    );
    expect(bars(drawing)).toEqual([
      [5, 21, 35, 36, COLORS.first],
      [28, 44, 23, 36, COLORS.series],
      [50, 66, 29, 36, COLORS.series],
      [73, 89, 10, 36, COLORS.series],
      [95, 111, 17, 36, COLORS.series],
      [118, 134, 4, 36, COLORS.series],
    ]);
    expect(drawing.axis).toBeNull();
    expect(drawing.lines).toEqual([]);
  });

  it('hangs negative columns from zero, under the axis, right to left', () => {
    const drawing = ogeDrawSparkline(
      spec(CROSSING, {
        type: 'column',
        first: true,
        displayXAxis: true,
        rightToLeft: true,
      }),
      W,
      H,
    );
    // the axis covers the negative bars' first row
    expect(bars(drawing)).toEqual([
      [118, 134, 9, 22, COLORS.first],
      [95, 111, 22, 31, COLORS.series],
      [73, 89, 4, 22, COLORS.series],
      [50, 66, 22, 27, COLORS.series],
      [28, 44, 13, 22, COLORS.series],
      [5, 21, 22, 36, COLORS.series],
    ]);
    // a 1 px axis ending on half pixels: Excel paints those half
    expect(drawing.axis).toEqual({
      x0: 2.5,
      x1: 137.5,
      y0: 22,
      y1: 23,
      color: COLORS.axis,
    });
  });

  it('draws win/loss from the middle, the axis on it', () => {
    const drawing = ogeDrawSparkline(
      spec(CROSSING, { type: 'stacked', first: true, displayXAxis: true }),
      W,
      H,
    );
    expect(bars(drawing)).toEqual([
      [5, 21, 4, 20, COLORS.first],
      [28, 44, 20, 36, COLORS.series],
      [50, 66, 4, 20, COLORS.series],
      [73, 89, 20, 36, COLORS.series],
      [95, 111, 4, 20, COLORS.series],
      [118, 134, 20, 36, COLORS.series],
    ]);
    expect(drawing.axis).toMatchObject({ y0: 20, y1: 21 });
    // a zero is no bar
    expect(
      ogeDrawSparkline(spec([1, 0, -1], { type: 'stacked' }), W, H).bars,
    ).toHaveLength(2);
  });

  it('places plain markers on the rounded point, highlighted ones a half pixel up and left', () => {
    const drawing = ogeDrawSparkline(
      spec(UP, { markers: true, first: true }),
      W,
      H,
    );
    expect(markers(drawing)).toEqual([
      [13, 35, COLORS.first],
      [36, 23, COLORS.markers],
      [58, 29, COLORS.markers],
      [81, 10, COLORS.markers],
      [103, 17, COLORS.markers],
      [126, 4, COLORS.markers],
    ]);
    expect(drawing.markers[0].d).toBe(2);
    // an odd-width line runs through pixel centres
    expect(drawing.lineWidth).toBe(1);
    expect(drawing.lines).toEqual([
      [
        [13.5, 35.5],
        [35.5, 23.5],
        [58.5, 29.5],
        [80.5, 10.5],
        [103.5, 16.5],
        [125.5, 4.5],
      ],
    ]);
  });

  it('reverses the points right to left', () => {
    const drawing = ogeDrawSparkline(
      spec(UP, { markers: true, first: true, rightToLeft: true }),
      W,
      H,
    );
    expect(markers(drawing)[0]).toEqual([125, 35, COLORS.first]);
    expect(markers(drawing)[5]).toEqual([13, 4, COLORS.markers]);
  });

  it('colours a point high, low, first, last, then negative', () => {
    const all = {
      markers: true,
      high: true,
      low: true,
      first: true,
      last: true,
      negative: true,
    };
    const colours = (values: readonly number[], options = all) =>
      markers(ogeDrawSparkline(spec(values, options), W, H)).map(
        ([, , color]) => color,
      );
    expect(colours([-2, 3, -4, 1])).toEqual([
      COLORS.first,
      COLORS.high,
      COLORS.low,
      COLORS.last,
    ]);
    expect(
      colours([2, -1, -1, 2], {
        ...all,
        high: false,
        first: false,
        last: false,
        low: false,
      }),
    ).toEqual([
      COLORS.markers,
      COLORS.negative,
      COLORS.negative,
      COLORS.markers,
    ]);
  });

  it('breaks the line at a gap and joins over a left-out point', () => {
    const gap = ogeDrawSparkline(spec([1, 3, 'gap', 5, 4]), W, H);
    expect(gap.lines.map((run) => run.length)).toEqual([2, 2]);
    const joined = ogeDrawSparkline(spec([1, 3, 'join', 5, 4]), W, H);
    expect(joined.lines.map((run) => run.length)).toEqual([4]);
    // an isolated point between gaps is no line
    expect(ogeDrawSparkline(spec(['gap', 2, 'gap']), W, H).lines).toEqual([]);
  });

  it('widens the line with its weight and the zoom; even widths sit on pixel corners', () => {
    expect(
      ogeDrawSparkline(spec(UP, { lineWeight: 2.25 }), W, H).lineWidth,
    ).toBe(3);
    const even = ogeDrawSparkline(spec(UP, { lineWeight: 1.5 }), W, H);
    expect(even.lineWidth).toBe(2);
    expect(even.lines[0][0]).toEqual([13, 36]);
    expect(ogeDrawSparkline(spec(UP), 2 * W, 2 * H, 200).lineWidth).toBe(2);
  });

  it('cuts a line that runs past a custom axis end at the plot', () => {
    const drawing = ogeDrawSparkline(
      spec([1, 10, 1], { axis: { lo: 0, hi: 5 } }),
      W,
      H,
    );
    expect(drawing.lines).toHaveLength(2);
    for (const run of drawing.lines)
      for (const [, y] of run) expect(y).toBeGreaterThanOrEqual(4);
  });

  it('places points by their dates on a date axis', () => {
    const drawing = ogeDrawSparkline(
      spec([1, 2, 3], { markers: true, dates: [10, 11, 20] }),
      W,
      H,
    );
    // the smallest gap (a day) is the band, half of it the margin at each end
    const span = 20 - 10 + 1;
    expect(drawing.markers.map((m) => m.cx)).toEqual(
      [0.5, 1.5, 10.5].map((d) => Math.floor(2 + (d / span) * 135 + 0.5)),
    );
  });

  it('draws nothing it cannot scale or place', () => {
    const shapes = (drawing: OgeSparklineDrawing) =>
      drawing.bars.length + drawing.lines.length + drawing.markers.length;
    expect(shapes(ogeDrawSparkline(spec([]), W, H))).toBe(0);
    expect(shapes(ogeDrawSparkline(spec(['gap', 'join']), W, H))).toBe(0);
    expect(shapes(ogeDrawSparkline(spec(UP, { axis: null }), W, H))).toBe(0);
    expect(shapes(ogeDrawSparkline(spec(UP), 4, 4))).toBe(0);
    // all zero: a flat line at mid-height, no columns
    const flat = ogeDrawSparkline(spec([0, 0, 0]), W, H);
    expect(flat.lines[0].map(([, y]) => y)).toEqual([20.5, 20.5, 20.5]);
    expect(
      ogeDrawSparkline(spec([0, 0, 0], { type: 'column' }), W, H).bars,
    ).toEqual([]);
  });

  it('lets the columns touch once the gap would drop under 2 px', () => {
    // 24 points in a 10-character column: one block from 2 to 66 on Excel's screen
    const many = Array.from({ length: 24 }, (_, i) => 1 + (i % 2));
    const drawing = ogeDrawSparkline(spec(many, { type: 'column' }), 70, H);
    expect(drawing.bars[0].x0).toBe(2);
    expect(drawing.bars[23].x1).toBe(67);
    for (let i = 1; i < drawing.bars.length; i++)
      expect(drawing.bars[i].x0).toBe(drawing.bars[i - 1].x1);
  });
});
