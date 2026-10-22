import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import type {
  OgeChartAxis,
  OgeChartGroup,
  OgeChartModel,
  OgeChartSeries,
  OgeSheetChart,
} from '../model/chart';
import {
  ogeChartLabel,
  ogeChartView,
  type OgeChartPathMark,
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
