import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import type {
  OgeChartAxis,
  OgeChartDataLabels,
  OgeChartGroup,
  OgeChartModel,
  OgeChartSeries,
  OgeSheetChart,
} from '../model/chart';
import {
  ogeChartLabel,
  ogeChartPalette,
  ogeChartScale,
  ogeChartView,
  type OgeChartPathMark,
  type OgeSpreadsheetChartView,
} from './chart-view';

const series = (
  index: number,
  values: readonly (number | null)[],
  extra: Partial<OgeChartSeries> = {},
): OgeChartSeries => ({
  index,
  order: index,
  name: { text: `S${index + 1}` },
  categories: { labels: ['A', 'B', 'C'] },
  values: { values },
  shape: {},
  ...extra,
});

const axis = (
  id: number,
  kind: OgeChartAxis['kind'],
  position: OgeChartAxis['position'],
  extra: Partial<OgeChartAxis> = {},
): OgeChartAxis => ({
  id,
  kind,
  position,
  deleted: false,
  reversed: false,
  shape: {},
  labelPosition: 'nextTo',
  majorTicks: 'none',
  font: {},
  ...extra,
});

const AXES = [
  axis(1, 'category', 'b', { crossAxis: 2 }),
  axis(2, 'value', 'l', { crossAxis: 1, majorGridlines: {} }),
];

const group = (
  kind: OgeChartGroup['kind'],
  list: OgeChartSeries[],
  extra: Partial<OgeChartGroup> = {},
): OgeChartGroup => ({
  kind,
  grouping: kind === 'bar' ? 'clustered' : 'standard',
  varyColors: false,
  axes: [1, 2],
  series: list,
  ...extra,
});

const chart = (
  groups: OgeChartGroup[],
  extra: Partial<OgeChartModel> = {},
): OgeChartModel => ({
  part: 'xl/charts/chart1.xml',
  groups,
  axes: AXES,
  plotVisibleOnly: true,
  blanksAs: 'gap',
  area: {},
  plotArea: {},
  font: {},
  roundedCorners: false,
  style: 2,
  ...extra,
});

const LEGEND = { position: 'b', overlay: false, font: {}, hidden: [] } as const;

const draw = (model: OgeChartModel, zoom = 100) =>
  ogeChartView({
    chart: model,
    width: 4 * zoom,
    height: 3 * zoom,
    zoom,
    theme: OGE_OFFICE_THEME_COLORS,
  });

/** The box of a rectangle's path (`M x y h w v h …`). */
function box(mark: OgeChartPathMark | undefined) {
  const match = /^M([\d.-]+) ([\d.-]+)h([\d.-]+)v([\d.-]+)/.exec(mark?.d ?? '');
  const [x, y, w, h] = (match?.slice(1) ?? []).map(Number);
  return { x: x ?? NaN, y: y ?? NaN, w: w ?? NaN, h: h ?? NaN };
}

describe('ogeChartView', () => {
  it("sizes and spaces bars by the group's gap width and overlap, as Excel does", () => {
    const view = draw(
      chart([
        group('bar', [series(0, [1, 2, 3]), series(1, [3, 2, 1])], {
          direction: 'column',
          gapWidth: 100,
          overlap: -50,
        }),
      ]),
    );
    const plot = view.plot;
    if (!plot) throw new Error('no plot');
    const bars = (color: string) =>
      view.paths.filter((p) => p.fill === color && p.crisp).map(box);
    // a bar is band / (n − (n − 1) · overlap + gap) wide; half a gap opens each band
    const band = plot.width / 3;
    const width = band / (2 + 0.5 + 1);
    const [first] = bars('#4472C4');
    const [second] = bars('#ED7D31');
    expect(first?.x).toBe(Math.round(plot.x + width / 2));
    expect(second?.x).toBe(Math.round(plot.x + width / 2 + width * 1.5));
    expect(first?.w).toBeCloseTo(width, 0);
    // the value 3 reaches the top of a 0–3.5 scale's plot, from the axis at 0
    const third = bars('#4472C4')[2];
    expect(third && third.y + third.h).toBe(Math.round(plot.y + plot.height));
  });

  it('rounds pie percentages to add up to 100%, as Excel does', () => {
    const pie = group(
      'pie',
      [
        series(0, [120, 95, 60, 80], {
          categories: { labels: ['N', 'S', 'E', 'W'] },
          labels: {
            showValue: false,
            showCategory: false,
            showSeries: false,
            showPercent: true,
            position: 'outEnd',
          },
        }),
      ],
      { varyColors: true, axes: [] },
    );
    const view = draw(chart([pie], { axes: [] }));
    // 33.8, 26.8, 16.9 and 22.5: the remainders, largest first, take the lost points
    expect(view.texts.map((t) => t.text)).toEqual(['34%', '27%', '17%', '22%']);
    expect(view.plot?.width).toBe(view.plot?.height);
  });

  it('draws line keys in the legend, and widens the square keys beside them', () => {
    const view = draw(
      chart(
        [
          group('bar', [series(0, [1, 2, 3])]),
          group(
            'line',
            [
              series(1, [2, 1, 3], {
                marker: { symbol: 'circle', size: 5, shape: {} },
              }),
            ],
            { markers: true },
          ),
        ],
        { legend: LEGEND },
      ),
    );
    const plot = view.plot;
    if (!plot) throw new Error('no plot');
    const below = plot.y + plot.height;
    const key = view.paths.find(
      (p) => p.fill === '#4472C4' && p.crisp && box(p).y > below,
    );
    expect(box(key).w).toBeCloseTo(26, 0);
    expect(
      view.paths.some(
        (p) =>
          p.round && p.stroke === '#ED7D31' && /^M[\d.]+ [\d.]+H/.test(p.d),
      ),
    ).toBe(true);
    expect(
      view.texts.filter((t) => t.anchor === 'start').map((t) => t.text),
    ).toEqual(['S1', 'S2']);
  });

  it("puts the plot where the file's manual layout says", () => {
    const view = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        plotLayout: {
          x: 0.1,
          y: 0.2,
          w: 0.5,
          h: 0.4,
          xMode: 'edge',
          yMode: 'edge',
          target: 'inner',
        },
      }),
    );
    expect(view.plot).toEqual({ x: 40, y: 60, width: 200, height: 120 });
  });

  it('draws twice as large at 200%', () => {
    const model = chart([group('bar', [series(0, [1, 2, 3])])], {
      legend: LEGEND,
    });
    const at100 = draw(model, 100).plot;
    const at200 = draw(model, 200).plot;
    expect(Math.abs((at200?.x ?? 0) - 2 * (at100?.x ?? 0))).toBeLessThan(2);
    expect(Math.abs((at200?.y ?? 0) - 2 * (at100?.y ?? 0))).toBeLessThan(2);
    expect(
      Math.abs((at200?.height ?? 0) - 2 * (at100?.height ?? 0)),
    ).toBeLessThan(2);
  });

  it("runs a bar chart's categories up from its bottom", () => {
    const view = draw(
      chart([group('bar', [series(0, [1, 2, 3])], { direction: 'bar' })], {
        axes: [
          axis(1, 'category', 'l', { crossAxis: 2 }),
          axis(2, 'value', 'b', { crossAxis: 1, majorGridlines: {} }),
        ],
      }),
    );
    const y = (text: string) =>
      view.texts.find((t) => t.text === text)?.y ?? NaN;
    expect(y('A')).toBeGreaterThan(y('B'));
    expect(y('B')).toBeGreaterThan(y('C'));
  });

  it('smooths a line and marks its points', () => {
    const view = draw(
      chart([
        group(
          'line',
          [
            series(0, [1, 3, 2], {
              smooth: true,
              marker: { symbol: 'square', size: 5, shape: {} },
            }),
          ],
          { markers: true },
        ),
      ]),
    );
    const line = view.paths.find((p) => p.round && p.stroke === '#4472C4');
    expect(line?.d).toContain('C');
    const markers = view.paths.filter(
      (p) => p.fill === '#4472C4' && !p.crisp && /h[\d.]+v/.test(p.d),
    );
    expect(markers).toHaveLength(3);
  });

  it("titles a chart its own way, or with its only series' name", () => {
    const titled = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        title: { font: {}, overlay: false },
      }),
    );
    expect(titled.label).toBe('S1');
    expect(titled.texts[0]).toMatchObject({ text: 'S1', anchor: 'middle' });
    // Excel's unformatted title: 18 pt Arial
    expect(titled.texts[0]?.style).toMatchObject({ fontSize: '24px' });
    expect(titled.texts[0]?.style['fontFamily']).toContain('Arial');
    const untitled = draw(chart([group('bar', [series(0, [1, 2, 3])])]));
    expect(untitled.texts.some((t) => t.text === 'S1')).toBe(false);
    expect((untitled.plot?.y ?? 0) < (titled.plot?.y ?? 0)).toBe(true);
  });

  it('puts a secondary value axis and its labels on the right', () => {
    const view = draw(
      chart(
        [
          group('bar', [series(0, [10, 20, 30])]),
          group('line', [series(1, [0.1, 0.4, 0.2])], { axes: [3, 4] }),
        ],
        {
          axes: [
            ...AXES,
            axis(3, 'category', 'b', { crossAxis: 4, deleted: true }),
            axis(4, 'value', 'r', {
              crossAxis: 3,
              crosses: 'max',
              format: { code: '0%', sourceLinked: false },
            }),
          ],
        },
      ),
    );
    const plot = view.plot;
    if (!plot) throw new Error('no plot');
    const right = view.texts.filter((t) => t.x > plot.x + plot.width);
    expect(right.map((t) => t.text)).toContain('40%');
    expect(right.every((t) => t.anchor === 'start')).toBe(true);
  });
});

describe('ogeChartLabel', () => {
  const sheetChart = (extra: Partial<OgeSheetChart>): OgeSheetChart => ({
    anchor: { kind: 'absolute', x: 0, y: 0, width: 10, height: 10 },
    chart: chart([group('bar', [series(0, [1]), series(1, [2])])]),
    ...extra,
  });

  it('names a chart by its alt text, else its title, else its name', () => {
    expect(
      ogeChartLabel(sheetChart({ description: 'Alt', name: 'Chart 1' })),
    ).toBe('Alt');
    expect(
      ogeChartLabel(
        sheetChart({
          name: 'Chart 1',
          chart: chart([group('bar', [series(0, [1])])], {
            title: { text: { text: 'Sales' }, font: {}, overlay: false },
          }),
        }),
      ),
    ).toBe('Sales');
    expect(ogeChartLabel(sheetChart({ name: 'Chart 1' }))).toBe('Chart 1');
    expect(ogeChartLabel(sheetChart({}))).toBe('');
  });
});

const NAMES = ['S1', 'S2'];
const twoSeries = (extra: Partial<OgeChartModel> = {}) =>
  draw(
    chart([group('bar', [series(0, [1, 2, 3]), series(1, [2, 3, 1])])], extra),
  );
const entries = (view: OgeSpreadsheetChartView) =>
  view.texts.filter((t) => NAMES.includes(t.text));
const plotOf = (view: OgeSpreadsheetChartView) => {
  if (!view.plot) throw new Error('no plot');
  return view.plot;
};
const labels = (
  extra: Partial<OgeChartDataLabels> = {},
): OgeChartDataLabels => ({
  showValue: true,
  showCategory: false,
  showSeries: false,
  showPercent: false,
  ...extra,
});
const luma = (hex: string) =>
  parseInt(hex.slice(1, 3), 16) * 0.3 +
  parseInt(hex.slice(3, 5), 16) * 0.59 +
  parseInt(hex.slice(5, 7), 16) * 0.11;
/** The y of each point of a path (`M`/`L` commands). */
const ysOf = (d: string) =>
  [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]));

describe('ogeChartPalette', () => {
  it('cycles the six accents, then darker, then lighter — Excel’s automatic colours', () => {
    const palette = ogeChartPalette(OGE_OFFICE_THEME_COLORS, 18);
    expect(palette.slice(0, 6)).toEqual([
      '#4472C4',
      '#ED7D31',
      '#A5A5A5',
      '#FFC000',
      '#5B9BD5',
      '#70AD47',
    ]);
    for (let i = 0; i < 6; i++) {
      expect(luma(palette[i + 6] ?? '')).toBeLessThan(luma(palette[i] ?? ''));
      expect(luma(palette[i + 12] ?? '')).toBeGreaterThan(
        luma(palette[i] ?? ''),
      );
    }
    expect(ogeChartPalette(OGE_OFFICE_THEME_COLORS, 2)).toHaveLength(6);
  });
});

describe('ogeChartScale', () => {
  it('scales flat, negative, mixed, narrow and fixed ranges as Excel does', () => {
    expect(ogeChartScale(0, 0, 200, true)).toMatchObject({ min: 0 });
    const flat = ogeChartScale(5, 5, 200, true);
    expect(flat.min).toBe(0);
    expect(flat.max).toBeGreaterThan(5);
    const negative = ogeChartScale(-10, -2, 200, true);
    expect(negative.max).toBe(0);
    expect(negative.min).toBeLessThan(-10);
    expect(ogeChartScale(-3, -3, 200, true).max).toBe(0);
    const mixed = ogeChartScale(-5, 10, 200, true);
    expect(mixed.min).toBeLessThan(-5);
    expect(mixed.max).toBeGreaterThan(10);
    // far from zero: the axis starts half a span below the data
    expect(ogeChartScale(100, 105, 200, true).min).toBeGreaterThan(90);
    expect(ogeChartScale(NaN, Infinity, 200, true)).toMatchObject({ min: 0 });
    expect(
      ogeChartScale(0, 50, 200, true, { min: 10, max: 40, majorUnit: 7 }),
    ).toEqual({ min: 10, max: 40, majorUnit: 7 });
    // a unit the axis can't fit is replaced
    expect(
      ogeChartScale(0, 50, 200, true, { majorUnit: 0 }).majorUnit,
    ).toBeGreaterThan(0);
  });
});

describe('ogeChartView — the chart area, the title and markers', () => {
  it('rounds the chart’s corners, keeps an unfilled area clear, and sizes the title from the chart’s text', () => {
    const rounded = draw(
      chart([group('bar', [series(0, [1])])], { roundedCorners: true }),
    );
    expect(rounded.paths[0]?.d).toContain('A');
    expect(rounded.paths[0]?.crisp).toBeUndefined();
    const clear = draw(
      chart([group('bar', [series(0, [1])])], {
        area: { fill: 'none', line: 'none' },
      }),
    );
    expect(clear.paths[0]).toEqual({ d: expect.any(String), crisp: true });
    const titled = draw(
      chart([group('bar', [series(0, [1])])], {
        font: { size: 12 },
        title: { text: { text: 'T' }, font: {}, overlay: false },
      }),
    );
    // 1.2 times the chart's 12 pt
    expect(titled.texts.find((t) => t.text === 'T')?.style).toMatchObject({
      fontSize: '19.2px',
    });
    // a manually placed title keeps its own spot; an overlay takes no room
    const overlay = draw(
      chart([group('bar', [series(0, [1])])], {
        title: {
          text: { text: 'T' },
          font: {},
          overlay: true,
          layout: {
            x: 0.5,
            y: 0.5,
            xMode: 'edge',
            yMode: 'edge',
            target: 'outer',
          },
        },
      }),
    );
    expect(overlay.texts.find((t) => t.text === 'T')?.y).toBeGreaterThan(150);
    expect(plotOf(overlay).y).toBe(
      plotOf(draw(chart([group('bar', [series(0, [1])])]))).y,
    );
  });

  it('draws every marker symbol: filled shapes, stroked crosses', () => {
    const symbols = [
      'circle',
      'square',
      'diamond',
      'triangle',
      'x',
      'plus',
      'star',
      'dash',
      'dot',
    ];
    const view = draw(
      chart([
        group(
          'line',
          symbols.map((symbol, i) =>
            series(i, [1, 2], {
              shape: { line: 'none' },
              marker: {
                symbol,
                size: 5,
                shape: { fill: '#112233', line: '#445566' },
              },
            }),
          ),
          { markers: true },
        ),
      ]),
    );
    const marks = view.paths.filter((p) => p.stroke === '#445566');
    expect(marks).toHaveLength(symbols.length * 2);
    // x, plus, star and dash have no inside to fill
    expect(marks.filter((p) => p.fill === undefined)).toHaveLength(4 * 2);
    expect(view.paths.some((p) => p.round)).toBe(false);
  });

  it('gives a legacy line chart Excel’s automatic markers, and none when the group turns them off', () => {
    const auto = draw(
      chart([group('line', [series(0, [1, 2, 3])], { markers: true })]),
    );
    // diamonds: four corners each
    const diamonds = auto.paths.filter(
      (p) => p.fill === '#4472C4' && (p.d.match(/L/g) ?? []).length === 3,
    );
    expect(diamonds).toHaveLength(3);
    const off = draw(chart([group('line', [series(0, [1, 2, 3])])]));
    expect(off.paths.filter((p) => p.fill === '#4472C4')).toHaveLength(0);
  });
});

describe('ogeChartView — the legend', () => {
  it('stands at the right, the left or the top-right corner in a column, the plot beside it', () => {
    const right = twoSeries({ legend: { ...LEGEND, position: 'r' } });
    const r = entries(right);
    expect(r.every((t) => t.x > plotOf(right).x + plotOf(right).width)).toBe(
      true,
    );
    expect(r[1]?.x).toBe(r[0]?.x);
    expect(r[1]?.y ?? 0).toBeGreaterThan(r[0]?.y ?? 0);
    const left = twoSeries({ legend: { ...LEGEND, position: 'l' } });
    expect(entries(left).every((t) => t.x < plotOf(left).x)).toBe(true);
    const corner = twoSeries({ legend: { ...LEGEND, position: 'tr' } });
    expect(entries(corner)[0]?.y ?? 0).toBeLessThan(r[0]?.y ?? 0);
  });

  it('runs along the top and pushes the plot down', () => {
    const top = twoSeries({ legend: { ...LEGEND, position: 't' } });
    const bottom = twoSeries({ legend: LEGEND });
    expect(entries(top).every((t) => t.y < plotOf(top).y)).toBe(true);
    expect(plotOf(top).y).toBeGreaterThan(plotOf(bottom).y);
  });

  it('overlays the plot when told to, goes where a manual layout puts it, and leaves out deleted entries', () => {
    const bare = twoSeries();
    const overlay = twoSeries({ legend: { ...LEGEND, overlay: true } });
    expect(overlay.plot).toEqual(bare.plot);
    const manual = twoSeries({
      legend: {
        ...LEGEND,
        position: 'r',
        layout: {
          x: 0.05,
          y: 0.05,
          xMode: 'edge',
          yMode: 'edge',
          target: 'outer',
        },
      },
    });
    expect(manual.plot).toEqual(bare.plot);
    const first = entries(manual)[0]?.x ?? 0;
    expect(first).toBeGreaterThan(20);
    expect(first).toBeLessThan(50);
    const hidden = twoSeries({ legend: { ...LEGEND, hidden: [0] } });
    expect(entries(hidden).map((t) => t.text)).toEqual(['S2']);
  });

  it('wraps entries that do not fit one row', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      series(i, [1, 2], { name: { text: `A long series name ${i}` } }),
    );
    const view = draw(chart([group('bar', many)], { legend: LEGEND }));
    const keys = view.texts.filter((t) => t.text.startsWith('A long'));
    expect(new Set(keys.map((t) => t.y)).size).toBeGreaterThan(1);
  });

  it('keys a marker-only scatter series with its marker, a dashed line with its dash', () => {
    const xyAxes = [
      axis(1, 'value', 'b', { crossAxis: 2 }),
      axis(2, 'value', 'l', { crossAxis: 1 }),
    ];
    const view = draw(
      chart(
        [
          group(
            'scatter',
            [
              series(0, [1, 2], {
                categories: { labels: [], numbers: [1, 2] },
              }),
              series(1, [2, 1], {
                categories: { labels: [], numbers: [1, 2] },
                shape: { line: '#00B050', dash: 'dot' },
              }),
            ],
            { scatterStyle: 'marker' },
          ),
        ],
        { axes: xyAxes, legend: LEGEND },
      ),
    );
    const dotted = view.paths.filter((p) => p.dash && p.stroke === '#00B050');
    // the series' line and its legend key
    expect(dotted).toHaveLength(2);
    // three diamonds for series 1: two points and the key
    expect(
      view.paths.filter(
        (p) => p.fill === '#4472C4' && (p.d.match(/L/g) ?? []).length === 3,
      ),
    ).toHaveLength(3);
  });
});

describe('ogeChartView — pies and doughnuts', () => {
  const pieOf = (
    values: readonly number[],
    extra: Partial<OgeChartSeries> = {},
    groupExtra: Partial<OgeChartGroup> = {},
    chartExtra: Partial<OgeChartModel> = {},
  ) =>
    draw(
      chart(
        [
          group(
            'pie',
            [
              series(0, values, {
                categories: { labels: ['A', 'B', 'C', 'D'] },
                ...extra,
              }),
            ],
            { varyColors: true, axes: [], ...groupExtra },
          ),
        ],
        { axes: [], ...chartExtra },
      ),
    );
  const fromCentre = (view: OgeSpreadsheetChartView, text: string) => {
    const plot = plotOf(view);
    const t = view.texts.find((x) => x.text === text);
    return Math.hypot(
      (t?.x ?? 0) - (plot.x + plot.width / 2),
      (t?.y ?? 0) - (plot.y + plot.height / 2),
    );
  };

  it('puts labels outside, inside the end, or towards the centre of a slice', () => {
    const at = (position?: string) =>
      pieOf([1, 1], {
        labels: labels({
          showCategory: true,
          ...(position ? { position } : {}),
        }),
      });
    expect(at('outEnd').texts[0]?.text).toBe('A, 1');
    const outside = fromCentre(at('outEnd'), 'A, 1');
    const inside = fromCentre(at('inEnd'), 'A, 1');
    const centre = fromCentre(at('ctr'), 'A, 1');
    expect(outside).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(centre);
    // outside labels make the pie smaller
    expect(plotOf(at('outEnd')).width).toBeLessThan(plotOf(at('ctr')).width);
  });

  it('rings a doughnut, labels its ring, and draws one whole value as a full disc', () => {
    const doughnut = draw(
      chart(
        [
          group(
            'doughnut',
            [series(0, [1, 3], { labels: labels({ showCategory: true }) })],
            { varyColors: true, axes: [], holeSize: 50 },
          ),
        ],
        { axes: [] },
      ),
    );
    const slice = doughnut.paths.find((p) => p.fill === '#ED7D31');
    expect(slice?.d.match(/A/g)).toHaveLength(2);
    const ring = fromCentre(doughnut, 'B, 3');
    const radius = plotOf(doughnut).width / 2;
    expect(ring).toBeGreaterThan(radius / 2);
    expect(ring).toBeLessThan(radius);
    const whole = pieOf([5, 0]);
    const disc = whole.paths.filter((p) => p.fill === '#4472C4');
    expect(disc).toHaveLength(1);
    expect(disc[0]?.d.match(/A/g)).toHaveLength(2);
    // a whole doughnut keeps its hole
    const ringOnly = draw(
      chart(
        [group('doughnut', [series(0, [4])], { varyColors: true, axes: [] })],
        { axes: [] },
      ),
    );
    expect(ringOnly.paths[1]?.d.match(/A/g)).toHaveLength(4);
  });

  it('turns to the first slice angle, keeps one colour when colours do not vary, and follows a manual layout', () => {
    const turned = pieOf([1, 1], {}, { firstSliceAngle: 90 });
    const first = turned.paths.find((p) => p.fill === '#4472C4');
    const plot = plotOf(turned);
    const [, , , edgeX, edgeY] = /^M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/
      .exec(first?.d ?? '')
      ?.map(Number) ?? [0, 0, 0, 0, 0];
    expect(edgeX).toBeCloseTo(plot.x + plot.width, 0);
    expect(edgeY).toBeCloseTo(plot.y + plot.height / 2, 0);
    const plain = pieOf(
      [1, 2, 3],
      { shape: { fill: '#123456' } },
      { varyColors: false },
    );
    expect(plain.paths.filter((p) => p.fill === '#123456')).toHaveLength(3);
    const manual = pieOf(
      [1, 2],
      {},
      {},
      {
        plotLayout: {
          x: 0.25,
          y: 0.1,
          w: 0.5,
          h: 0.8,
          xMode: 'edge',
          yMode: 'edge',
          target: 'inner',
        },
      },
    );
    expect(manual.plot).toEqual({ x: 100, y: 50, width: 200, height: 200 });
    // a point without a fill leaves its slice empty; a pie without series draws none
    const empty = pieOf([1, 1], { points: new Map([[0, { fill: 'none' }]]) });
    expect(
      empty.paths.filter((p) => p.d.includes('A'))[0]?.fill,
    ).toBeUndefined();
    const none = draw(
      chart([group('pie', [], { varyColors: true, axes: [] })], { axes: [] }),
    );
    expect(none.plot).toBeUndefined();
  });
});

describe('ogeChartView — bars', () => {
  it('stacks positive and negative values apart, and fills a 100% stack to the top', () => {
    const stacked = draw(
      chart([
        group('bar', [series(0, [2, -1]), series(1, [3, -2])], {
          grouping: 'stacked',
          overlap: 100,
        }),
      ]),
    );
    const bars = (view: OgeSpreadsheetChartView, color: string) =>
      view.paths.filter((p) => p.fill === color && p.crisp).map(box);
    const [blueUp, blueDown] = bars(stacked, '#4472C4');
    const [orangeUp, orangeDown] = bars(stacked, '#ED7D31');
    expect((orangeUp?.y ?? 0) + (orangeUp?.h ?? 0)).toBe(blueUp?.y);
    expect(orangeDown?.y).toBe((blueDown?.y ?? 0) + (blueDown?.h ?? 0));
    const full = draw(
      chart([
        group('bar', [series(0, [1, 3]), series(1, [3, 1])], {
          grouping: 'percentStacked',
        }),
      ]),
    );
    const tops = bars(full, '#ED7D31').map((b) => b.y);
    expect(Math.min(...tops)).toBe(Math.round(plotOf(full).y));
    expect(full.texts.map((t) => t.text)).toContain('100%');
    expect(full.texts.map((t) => t.text)).not.toContain('110%');
  });

  it('labels columns above or below their end, inside it, at the base or in the middle', () => {
    const at = (position?: string) =>
      draw(
        chart([
          group('bar', [
            series(0, [3.7, -3.7], {
              labels: labels(position ? { position } : {}),
            }),
          ]),
        ]),
      );
    const label = (view: OgeSpreadsheetChartView, text: string) =>
      view.texts.find((t) => t.text === text && t.anchor === 'middle');
    const column = (view: OgeSpreadsheetChartView, i: number) =>
      view.paths.filter((p) => p.fill === '#4472C4' && p.crisp).map(box)[i];
    const out = at();
    expect(label(out, '3.7')?.y ?? 0).toBeLessThan(column(out, 0)?.y ?? 0);
    const negative = column(out, 1);
    expect(label(out, '-3.7')?.y ?? 0).toBeGreaterThan(
      (negative?.y ?? 0) + (negative?.h ?? 0),
    );
    const inEnd = at('inEnd');
    const inBase = at('inBase');
    const middle = at('ctr');
    expect(label(inEnd, '3.7')?.y ?? 0).toBeGreaterThan(
      column(inEnd, 0)?.y ?? 0,
    );
    expect(label(inBase, '3.7')?.y ?? 0).toBeGreaterThan(
      label(middle, '3.7')?.y ?? 0,
    );
    expect(label(middle, '3.7')?.y ?? 0).toBeGreaterThan(
      label(inEnd, '3.7')?.y ?? 0,
    );
    expect(label(inEnd, '-3.7')?.y ?? 0).toBeGreaterThan(
      label(inBase, '-3.7')?.y ?? 0,
    );
    // a stack's labels sit in the middle of each piece by default
    const stacked = draw(
      chart([
        group('bar', [series(0, [3.7], { labels: labels() })], {
          grouping: 'stacked',
        }),
      ]),
    );
    const piece = column(stacked, 0);
    const y = label(stacked, '3.7')?.y ?? 0;
    expect(y).toBeGreaterThan(piece?.y ?? 0);
    expect(y).toBeLessThan((piece?.y ?? 0) + (piece?.h ?? 0));
  });

  it('labels sideways bars beyond, inside or on them, mirrored for a negative', () => {
    const at = (position?: string) =>
      draw(
        chart(
          [
            group(
              'bar',
              [
                series(0, [3.7, -3.7], {
                  labels: labels(position ? { position } : {}),
                }),
              ],
              { direction: 'bar' },
            ),
          ],
          {
            axes: [
              axis(1, 'category', 'l', { crossAxis: 2 }),
              axis(2, 'value', 'b', { crossAxis: 1 }),
            ],
          },
        ),
      );
    const anchors = (view: OgeSpreadsheetChartView) =>
      ['3.7', '-3.7'].map(
        (text) => view.texts.find((t) => t.text === text)?.anchor,
      );
    expect(anchors(at())).toEqual(['start', 'end']);
    expect(anchors(at('inEnd'))).toEqual(['end', 'start']);
    expect(anchors(at('inBase'))).toEqual(['start', 'end']);
    expect(anchors(at('ctr'))).toEqual(['middle', 'middle']);
  });

  it('grows bars from where the category axis crosses the values', () => {
    const view = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2, crossesAt: 2 }),
          axis(2, 'value', 'l', { crossAxis: 1 }),
        ],
      }),
    );
    const bars = view.paths
      .filter((p) => p.fill === '#4472C4' && p.crisp)
      .map(box);
    // the value 2 has no height; 1 hangs down from the crossing, 3 stands on it
    expect(bars).toHaveLength(2);
    expect(bars[0]?.y).toBe((bars[1]?.y ?? 0) + (bars[1]?.h ?? 0));
    const top = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2, crosses: 'max' }),
          axis(2, 'value', 'l', { crossAxis: 1 }),
        ],
      }),
    );
    // bars hang from the top of the scale
    const hanging = top.paths
      .filter((p) => p.fill === '#4472C4' && p.crisp)
      .map(box);
    expect(new Set(hanging.map((b) => b.y)).size).toBe(1);
  });
});

describe('ogeChartView — lines, areas and points', () => {
  it('breaks a line at a blank, bridges it, or drops it to zero', () => {
    const line = (blanksAs: OgeChartModel['blanksAs']) =>
      draw(
        chart([group('line', [series(0, [1, null, 3])])], { blanksAs }),
      ).paths.find((p) => p.round && p.stroke === '#4472C4')?.d ?? '';
    expect(line('gap').match(/M/g)).toHaveLength(2);
    expect(line('span').match(/M/g)).toHaveLength(1);
    expect(line('span').match(/L/g)).toHaveLength(1);
    expect(line('zero').match(/L/g)).toHaveLength(2);
  });

  it('stacks lines and areas, and fills a 100% stack to the top', () => {
    const lines = draw(
      chart([
        group('line', [series(0, [1, 1, 1]), series(1, [1, 1, 1])], {
          grouping: 'stacked',
        }),
      ]),
    );
    const lineYs = ['#4472C4', '#ED7D31'].map((color) =>
      ysOf(lines.paths.find((p) => p.round && p.stroke === color)?.d ?? ''),
    );
    expect(lineYs[1]?.[0] ?? 0).toBeLessThan(lineYs[0]?.[0] ?? 0);
    const full = draw(
      chart([
        group('area', [series(0, [1, 2, 3]), series(1, [3, 2, 1])], {
          grouping: 'percentStacked',
        }),
      ]),
    );
    const top = ysOf(full.paths.find((p) => p.fill === '#ED7D31')?.d ?? '');
    expect(new Set(top.slice(0, 3)).size).toBe(1);
    expect(top[0] ?? 0).toBeCloseTo(plotOf(full).y, 0);
    const plain = draw(chart([group('area', [series(0, [1, 2, 3])])]));
    const area = ysOf(plain.paths.find((p) => p.fill === '#4472C4')?.d ?? '');
    // the lower edge runs along the axis
    expect(new Set(area.slice(3)).size).toBe(1);
    const percentLines = draw(
      chart([
        group('line', [series(0, [1, 3]), series(1, [3, 1])], {
          grouping: 'percentStacked',
        }),
      ]),
    );
    expect(percentLines.texts.map((t) => t.text)).toContain('100%');
  });

  it('labels points above, below, beside or on them', () => {
    const at = (position?: string) =>
      draw(
        chart([
          group('line', [
            series(0, [2, 2, 2], {
              labels: labels({
                showValue: false,
                showSeries: true,
                ...(position ? { position } : {}),
              }),
            }),
          ]),
        ]),
      ).texts.filter((t) => t.text === 'S1')[1];
    expect(at('t')?.y ?? 0).toBeLessThan(at('b')?.y ?? 0);
    expect(at('l')?.anchor).toBe('end');
    expect(at('r')?.anchor).toBe('start');
    expect(at()?.anchor).toBe('start');
    expect(at('ctr')?.anchor).toBe('middle');
  });

  it('joins scatter points when the style says so, smooths them, and sizes bubbles by area', () => {
    const xyAxes = [
      axis(1, 'value', 'b', {
        crossAxis: 2,
        majorGridlines: { line: '#AAAAAA' },
      }),
      axis(2, 'value', 'l', { crossAxis: 1, majorGridlines: {} }),
    ];
    const xy = (style: string) =>
      draw(
        chart(
          [
            group(
              'scatter',
              [
                series(0, [1, 4, 2], {
                  categories: { labels: [], numbers: [1, 2, 3] },
                }),
              ],
              { scatterStyle: style },
            ),
          ],
          { axes: xyAxes },
        ),
      );
    expect(xy('marker').paths.some((p) => p.round)).toBe(false);
    expect(xy('lineMarker').paths.find((p) => p.round)?.d).not.toContain('C');
    expect(xy('smoothMarker').paths.find((p) => p.round)?.d).toContain('C');
    expect(xy('line').paths.some((p) => p.round)).toBe(true);
    // the x axis' gridlines stand at its ticks
    const marker = xy('marker');
    const vertical = marker.paths.filter((p) => p.stroke === '#AAAAAA');
    expect(vertical.length).toBeGreaterThan(2);
    expect(vertical.every((p) => /V/.test(p.d))).toBe(true);
    const bubbles = draw(
      chart(
        [
          group('bubble', [
            series(0, [1, 2, 3], {
              categories: { labels: [], numbers: [1, 2, 3] },
              sizes: { values: [1, 4, 0] },
            }),
          ]),
        ],
        { axes: xyAxes },
      ),
    );
    const circles = bubbles.paths.filter((p) => p.fill === '#4472C4');
    expect(circles).toHaveLength(2);
    const radius = (d: string | undefined) =>
      Number(/a([\d.]+) /.exec(d ?? '')?.[1] ?? 0);
    expect(radius(circles[1]?.d) / radius(circles[0]?.d)).toBeCloseTo(2, 1);
  });

  it("puts an area's points on the category crossings when its value axis says midCat", () => {
    const view = draw(
      chart([group('area', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2 }),
          axis(2, 'value', 'l', { crossAxis: 1, crossBetween: 'midCat' }),
        ],
      }),
    );
    const area = view.paths.find((p) => p.fill === '#4472C4');
    expect(Number(/^M([\d.]+)/.exec(area?.d ?? '')?.[1])).toBeCloseTo(
      plotOf(view).x,
      0,
    );
  });
});

describe('ogeChartView — axes', () => {
  it('draws tick marks out, in or across, category gridlines and the plot area’s own fill', () => {
    const view = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', {
            crossAxis: 2,
            majorTicks: 'out',
            majorGridlines: { line: '#AAAAAA' },
          }),
          axis(2, 'value', 'l', {
            crossAxis: 1,
            majorTicks: 'cross',
            majorGridlines: {},
          }),
        ],
        plotArea: { fill: '#F2F2F2', line: '#BFBFBF' },
      }),
    );
    const plot = plotOf(view);
    expect(
      view.paths.some((p) => p.fill === '#F2F2F2' && p.stroke === '#BFBFBF'),
    ).toBe(true);
    // a gridline at each category boundary: three categories, four lines
    expect(view.paths.filter((p) => p.stroke === '#AAAAAA')).toHaveLength(4);
    const marks = view.paths.filter(
      (p) => p.stroke === '#000000' && (p.d.match(/M/g) ?? []).length > 2,
    );
    expect(marks).toHaveLength(2);
    const down = marks.find((p) => p.d.includes('V'));
    const ends = [...(down?.d.matchAll(/V([\d.]+)/g) ?? [])].map((m) =>
      Number(m[1]),
    );
    // out: below the axis
    expect(Math.min(...ends)).toBeGreaterThan(plot.y + plot.height);
    const across = marks.find((p) => p.d.includes('H'));
    const [, from, to] =
      /^M([\d.]+) [\d.]+H([\d.]+)/.exec(across?.d ?? '')?.map(Number) ?? [];
    // cross: both sides of the axis
    expect(Math.max(from ?? 0, to ?? 0)).toBeGreaterThan(plot.x);
    expect(Math.min(from ?? 0, to ?? 0)).toBeLessThan(plot.x);
    const inward = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2 }),
          axis(2, 'value', 'l', { crossAxis: 1, majorTicks: 'in' }),
        ],
      }),
    );
    const inMarks = inward.paths.find(
      (p) => p.stroke === '#000000' && (p.d.match(/M/g) ?? []).length > 2,
    );
    const [, a, b] =
      /^M([\d.]+) [\d.]+H([\d.]+)/.exec(inMarks?.d ?? '')?.map(Number) ?? [];
    expect(Math.min(a ?? 0, b ?? 0)).toBeGreaterThanOrEqual(
      Math.floor(plotOf(inward).x),
    );
  });

  it('reverses axes, hides a deleted one’s labels and an axis set to none', () => {
    const reversed = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2, reversed: true }),
          axis(2, 'value', 'l', { crossAxis: 1, reversed: true }),
        ],
      }),
    );
    const x = (text: string) =>
      reversed.texts.find((t) => t.text === text)?.x ?? 0;
    expect(x('A')).toBeGreaterThan(x('C'));
    const zero = reversed.texts.find(
      (t) => t.text === '0' && t.anchor === 'end',
    );
    expect(zero?.y ?? 999).toBeLessThan(plotOf(reversed).y + 10);
    const hidden = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2, labelPosition: 'none' }),
          axis(2, 'value', 'l', { crossAxis: 1, deleted: true }),
        ],
      }),
    );
    expect(hidden.texts).toHaveLength(0);
  });

  it('titles both axes, the value one turned up the side', () => {
    const titled = (text: string) => ({
      text: { text },
      font: {},
      overlay: false,
    });
    const view = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        axes: [
          axis(1, 'category', 'b', { crossAxis: 2, title: titled('Quarter') }),
          axis(2, 'value', 'l', { crossAxis: 1, title: titled('Units') }),
        ],
      }),
    );
    const plot = plotOf(view);
    const units = view.texts.find((t) => t.text === 'Units');
    expect(units?.transform).toMatch(/^rotate\(-90 /);
    expect(units?.x ?? 999).toBeLessThan(plot.x);
    const quarter = view.texts.find((t) => t.text === 'Quarter');
    expect(quarter?.y ?? 0).toBeGreaterThan(plot.y + plot.height);
  });

  it('formats date categories with their source format, and keeps an outer manual layout’s labels inside it', () => {
    const dates = draw(
      chart(
        [
          group('line', [
            series(0, [1, 2], {
              categories: {
                labels: ['45292', '45293'],
                numbers: [45292, 45293],
                format: 'd/m',
              },
            }),
          ]),
        ],
        {
          axes: [
            axis(1, 'date', 'b', { crossAxis: 2 }),
            axis(2, 'value', 'l', { crossAxis: 1 }),
          ],
        },
      ),
    );
    expect(dates.texts.map((t) => t.text)).toContain('1/1');
    const outer = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        plotLayout: {
          x: 0.5,
          y: 0.1,
          w: 0.45,
          h: 0.5,
          xMode: 'edge',
          yMode: 'edge',
          target: 'outer',
        },
      }),
    );
    expect(plotOf(outer).x).toBeGreaterThanOrEqual(200);
    expect(plotOf(outer).height).toBeLessThanOrEqual(150);
  });
});

describe('ogeChartView — fonts, palettes, layouts and series styles', () => {
  it('derives the darker and lighter rounds of any theme accent', () => {
    const theme = {
      ...OGE_OFFICE_THEME_COLORS,
      accent1: 'FF0080',
      accent2: '00FF80',
      accent3: '8000FF',
      accent4: '336699',
      accent5: 'CC3300',
      accent6: '2B2B2B',
    };
    const palette = ogeChartPalette(theme, 18);
    expect(palette[0]).toBe('#FF0080');
    for (let i = 0; i < 6; i++) {
      expect(palette[i + 6]).toMatch(/^#[0-9A-F]{6}$/);
      expect(luma(palette[i + 6] ?? '')).toBeLessThanOrEqual(
        luma(palette[i] ?? ''),
      );
      expect(luma(palette[i + 12] ?? '')).toBeGreaterThanOrEqual(
        luma(palette[i] ?? ''),
      );
    }
  });

  it('writes the chart’s text in its own face — italic, an unknown face with Calibri’s metrics', () => {
    const view = draw(
      chart([group('bar', [series(0, [1, 2, 3])])], {
        font: {
          family: 'Some Face',
          italic: true,
          bold: true,
          color: '#7F7F7F',
        },
        area: {
          fill: '#FFFFFF',
          fillOpacity: 0.5,
          line: '#D9D9D9',
          lineWidth: 2,
        },
        plotArea: { line: '#BFBFBF' },
      }),
    );
    expect(view.paths[0]).toMatchObject({
      fill: '#FFFFFF',
      fillOpacity: 0.5,
      stroke: '#D9D9D9',
      strokeWidth: 2,
    });
    expect(view.paths.some((p) => p.stroke === '#BFBFBF' && !p.fill)).toBe(
      true,
    );
    const label = view.texts.find((t) => t.text === 'A');
    expect(label?.style).toMatchObject({
      fontStyle: 'italic',
      fontWeight: '700',
      fill: '#7F7F7F',
    });
    expect(label?.style['fontFamily']).toContain('Some Face');
  });

  it('keys a single series of varying colours by point, names an unnamed series Excel’s way, and puts a top legend under the title', () => {
    const varied = draw(
      chart(
        [
          group('bar', [series(0, [1, 2, 3], { name: undefined })], {
            varyColors: true,
          }),
        ],
        {
          legend: { ...LEGEND, position: 't' },
          title: { text: { text: 'Title' }, font: {}, overlay: false },
        },
      ),
    );
    const keyTexts = varied.texts.filter((t) => t.anchor === 'start');
    expect(keyTexts.map((t) => t.text)).toEqual(['A', 'B', 'C']);
    const title = varied.texts.find((t) => t.text === 'Title');
    expect(keyTexts[0]?.y ?? 0).toBeGreaterThan(title?.y ?? 0);
    // each bar its own colour
    const fills = new Set(
      varied.paths
        .filter((p) => p.crisp && p.fill && p.fill !== '#FFFFFF')
        .map((p) => p.fill),
    );
    expect(fills.size).toBeGreaterThanOrEqual(3);
    const unnamed = draw(
      chart([group('line', [series(0, [1, 2], { name: undefined })])], {
        legend: LEGEND,
      }),
    );
    expect(unnamed.texts.map((t) => t.text)).toContain('Series1');
  });

  it('offsets the title, the legend and the plot by a factor of the chart’s size', () => {
    const factor = {
      xMode: 'factor',
      yMode: 'factor',
      target: 'inner',
    } as const;
    const moved = draw(
      chart([group('bar', [series(0, [1, 2]), series(1, [2, 1])])], {
        title: {
          text: { text: 'T' },
          font: {},
          overlay: false,
          layout: { ...factor, x: 0.1, y: 0.1 },
        },
        legend: { ...LEGEND, layout: { ...factor, y: -0.1 } },
        plotLayout: { ...factor, w: 0.5, h: 0.5 },
      }),
    );
    const still = draw(
      chart([group('bar', [series(0, [1, 2]), series(1, [2, 1])])], {
        title: { text: { text: 'T' }, font: {}, overlay: false },
        legend: LEGEND,
      }),
    );
    const t = (view: OgeSpreadsheetChartView) =>
      view.texts.find((x) => x.text === 'T');
    // a factor moves from where Excel would put it
    expect((t(moved)?.x ?? 0) - (t(still)?.x ?? 0)).toBeCloseTo(40, 0);
    expect((t(moved)?.y ?? 0) - (t(still)?.y ?? 0)).toBeCloseTo(30, 0);
    const s1 = (view: OgeSpreadsheetChartView) =>
      view.texts.find((x) => x.text === 'S1')?.y ?? 0;
    expect(s1(still) - s1(moved)).toBeCloseTo(30, 0);
    expect(plotOf(moved).width).toBeCloseTo(200, 0);
    expect(plotOf(moved).height).toBeCloseTo(150, 0);
  });

  it('rounds pie percentages to the format’s places, and leaves other formats alone', () => {
    const pie = (format: string) =>
      draw(
        chart(
          [
            group('pie', [series(0, [1, 1, 1])], {
              varyColors: true,
              axes: [],
              labels: labels({
                showValue: false,
                showPercent: true,
                format,
                font: { size: 9 },
              }),
            }),
          ],
          { axes: [] },
        ),
      ).texts.map((t) => t.text);
    // 33.3 + 33.3 + 33.3: one tenth goes to the first
    expect(pie('0.0%')).toEqual(['33.4%', '33.3%', '33.3%']);
    expect(pie('0.000')).toEqual(['0.333', '0.333', '0.333']);
  });

  it('draws scatter lines without markers for the line styles, a dotted series, and a series without markers', () => {
    const xyAxes = [
      axis(1, 'value', 'b', { crossAxis: 2 }),
      axis(2, 'value', 'l', { crossAxis: 1 }),
    ];
    const xy = (style: string, extra: Partial<OgeChartSeries> = {}) =>
      draw(
        chart(
          [
            group(
              'scatter',
              [
                series(0, [1, 4, 2], {
                  categories: { labels: [], numbers: [1, 2, 3] },
                  ...extra,
                }),
              ],
              { scatterStyle: style },
            ),
          ],
          { axes: xyAxes },
        ),
      );
    const markers = (view: OgeSpreadsheetChartView) =>
      view.paths.filter((p) => p.fill === '#4472C4').length;
    expect(markers(xy('line'))).toBe(0);
    expect(markers(xy('smooth'))).toBe(0);
    expect(xy('smooth').paths.find((p) => p.round)?.d).toContain('C');
    // a line the series draws itself joins the points even in the marker style
    const own = xy('marker', {
      shape: { line: '#FF0000', dash: 'dot', lineWidth: 2 },
    });
    const line = own.paths.find((p) => p.round);
    expect(line).toMatchObject({ stroke: '#FF0000', dash: '2 2' });
    expect(markers(xy('marker', { marker: { symbol: 'none' } }))).toBe(0);
    // a blank x or y leaves its point out
    const gaps = xy('lineMarker', {
      categories: { labels: [], numbers: [1, null, 3] },
    });
    expect(gaps.paths.find((p) => p.round)?.d.match(/M/g)).toHaveLength(2);
  });
});
