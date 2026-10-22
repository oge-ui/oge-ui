import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readOgeXlsx } from '../codec/read-xlsx';
import { OGE_OFFICE_THEME_COLORS } from '../color/color';
import { ogeChartScale, ogeChartView } from './chart-view';

/**
 * What Excel did with the corpus's charts (`testing/corpus/charts.excel.json`,
 * captured by `capture.ps1` on Excel LTSC 2024): the scales it chose for the
 * value axes, where it laid the plot out, the series it drew and their
 * colours — the Data sheet's charts from bare parts, the Styled sheet's
 * inserted by Excel itself.
 */
const corpus = resolve(__dirname, '../../../testing/corpus');
const excel = JSON.parse(
  readFileSync(resolve(corpus, 'charts.excel.json'), 'utf8'),
) as {
  sheets: {
    name: string;
    charts: {
      name: string;
      width: number;
      height: number;
      plot: { left: number; top: number; width: number; height: number };
      title?: string;
      axes: {
        group: number;
        kind: number;
        min?: number;
        max?: number;
        major?: number;
      }[];
      series: {
        name: string;
        type: number;
        values?: number[];
        fill?: string;
        line?: string;
      }[];
    }[];
  }[];
};

async function workbook() {
  const bytes = readFileSync(resolve(corpus, 'charts.xlsx'));
  return (await readOgeXlsx(new Uint8Array(bytes))).workbook;
}

describe('charts against Excel', () => {
  it('reads every chart with its series and the values Excel cached', async () => {
    const book = await workbook();
    for (const recorded of excel.sheets) {
      const sheet = book.sheets.find((s) => s.name === recorded.name);
      expect(sheet?.charts.map((c) => c.name)).toEqual(
        recorded.charts.map((c) => c.name),
      );
      recorded.charts.forEach((chart, i) => {
        const series =
          sheet?.charts[i]?.chart.groups.flatMap((g) => g.series) ?? [];
        expect(
          series.map((s) => s.name?.text),
          chart.name,
        ).toEqual(chart.series.map((s) => s.name));
        series.forEach((s, j) => {
          const values = chart.series[j]?.values;
          if (values)
            expect(s.values.values, `${chart.name} ${j}`).toEqual(values);
        });
      });
    }
  });

  it("chooses the value scales Excel chose, given Excel's plot area", async () => {
    const book = await workbook();
    let checked = 0;
    for (const recorded of excel.sheets) {
      const sheet = book.sheets.find((s) => s.name === recorded.name);
      recorded.charts.forEach((chart, i) => {
        const model = sheet?.charts[i]?.chart;
        if (!model) return;
        for (const axis of chart.axes) {
          // category axes have no scale (null)
          if (axis.min == null || axis.major == null) continue;
          // the series on this axis group (2: the groups on a secondary value axis), stacked when they stack
          const scatter = model.groups.some((g) => g.kind === 'scatter');
          const groups = model.groups.filter((g) => {
            const value = model.axes.find(
              (a) =>
                g.axes.includes(a.id) &&
                a.kind === 'value' &&
                (!scatter || a.position === 'l' || a.position === 'r'),
            );
            const secondary = value?.position === 'r';
            return axis.group === 2 ? secondary : !secondary;
          });
          const values: number[] = [];
          for (const g of groups) {
            const totals: number[] = [];
            for (const s of g.series) {
              const source =
                axis.kind === 1 && scatter
                  ? (s.categories?.numbers ?? [])
                  : s.values.values;
              source.forEach((v, p) => {
                if (v === null) return;
                values.push(v);
                if (g.grouping === 'stacked') totals[p] = (totals[p] ?? 0) + v;
              });
            }
            values.push(...totals.filter((t) => t !== undefined));
          }
          const vertical =
            axis.kind === 2
              ? !model.groups.some(
                  (g) => g.kind === 'bar' && g.direction === 'bar',
                )
              : false;
          const scale = ogeChartScale(
            Math.min(...values),
            Math.max(...values),
            vertical ? chart.plot.height : chart.plot.width,
            vertical,
          );
          expect(
            [scale.min, scale.max, scale.majorUnit],
            `${recorded.name} ${chart.name} axis ${axis.group}/${axis.kind}`,
          ).toEqual([
            axis.min,
            Number(axis.max?.toPrecision(12)),
            Number(axis.major.toPrecision(12)),
          ]);
          checked++;
        }
      });
    }
    expect(checked).toBeGreaterThanOrEqual(16);
  });

  it('lays the plot out where Excel does, within 2 px', async () => {
    const book = await workbook();
    let checked = 0;
    for (const recorded of excel.sheets) {
      const sheet = book.sheets.find((s) => s.name === recorded.name);
      recorded.charts.forEach((chart, i) => {
        const model = sheet?.charts[i]?.chart;
        if (!model) return;
        const { plot } = ogeChartView({
          chart: model,
          width: chart.width,
          height: chart.height,
          zoom: 100,
          theme: OGE_OFFICE_THEME_COLORS,
        });
        // Excel reports a chart's parts from a point 5 px inside its box:
        // its pictures draw the plot 5 px right of and below InsideLeft/Top
        const excelBox = [
          chart.plot.left + 5,
          chart.plot.top + 5,
          chart.plot.width,
          chart.plot.height,
        ];
        const ours = [plot?.x, plot?.y, plot?.width, plot?.height];
        ours.forEach((value, k) =>
          expect(
            Math.abs((value ?? NaN) - (excelBox[k] ?? NaN)),
            `${recorded.name} ${chart.name} plot[${k}]: ${value} vs ${excelBox[k]}`,
          ).toBeLessThanOrEqual(2),
        );
        checked++;
      });
    }
    expect(checked).toBe(16);
  });

  it("draws the series in Excel's colours", async () => {
    const book = await workbook();
    const styled = excel.sheets.find((s) => s.name === 'Styled');
    const sheet = book.sheets.find((s) => s.name === 'Styled');
    styled?.charts.forEach((chart, i) => {
      const model = sheet?.charts[i]?.chart;
      if (!model) return;
      const view = ogeChartView({
        chart: model,
        width: chart.width,
        height: chart.height,
        zoom: 100,
        theme: OGE_OFFICE_THEME_COLORS,
      });
      const painted = new Set(
        view.paths.flatMap((p) => [p.fill, p.stroke]).filter(Boolean),
      );
      for (const series of chart.series) {
        // a marker-only scatter reports no colour through COM
        const color =
          series.fill && series.fill !== '000000' ? series.fill : series.line;
        if (!color || series.type === -4169) continue;
        expect(painted.has(`#${color}`), `${chart.name} ${series.name}`).toBe(
          true,
        );
      }
    });
  });
});
