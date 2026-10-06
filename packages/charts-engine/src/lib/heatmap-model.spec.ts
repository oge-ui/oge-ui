import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import {
  buildHeatmapScene,
  heatmapAnnouncement,
  heatmapCell,
  heatmapSrTable,
  heatmapTooltip,
} from './heatmap-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;
const data = [
  { day: 'Mon', hour: '9', load: 10 },
  { day: 'Mon', hour: '10', load: 30 },
  { day: 'Tue', hour: '9', load: 20 },
];
const input = {
  dataSource: data,
  xField: 'hour',
  yField: 'day',
  valueField: 'load',
  showLabels: true,
  cellGap: 2,
  width: 300,
  height: 200,
  locale: 'en-US',
  messages,
};

describe('buildHeatmapScene', () => {
  it('derives categories in order of appearance and fills a full grid', () => {
    const scene = buildHeatmapScene(input);
    expect(scene.xCategories).toEqual(['9', '10']);
    expect(scene.yCategories).toEqual(['Mon', 'Tue']);
    expect(scene.cells).toHaveLength(4);
    const empty = heatmapCell(scene, 1, 1);
    expect(empty?.empty).toBe(true);
    expect(empty?.valueText).toBe('no data');
    expect(empty?.fill).toBe('var(--oge-chart-empty)');
    expect(heatmapCell(scene, 0, 1)?.fill).toBe('var(--oge-chart-heat-high)');
    expect(scene.ariaLabel).toBe('heatmap, 2 rows by 2 columns');
  });

  it('honours explicit category orders (unknown items are skipped)', () => {
    const scene = buildHeatmapScene({
      ...input,
      yCategories: ['Tue', 'Mon'],
      xCategories: ['10'],
    });
    expect(scene.yCategories).toEqual(['Tue', 'Mon']);
    expect(scene.columns).toBe(1);
    expect(heatmapCell(scene, 1, 0)?.payload.value).toBe(30);
  });

  it('cells tile the grid; RTL mirrors the columns', () => {
    const ltr = buildHeatmapScene(input);
    const rtl = buildHeatmapScene({ ...input, rtl: true });
    const a = heatmapCell(ltr, 0, 0);
    const b = heatmapCell(ltr, 0, 1);
    expect((b?.x ?? 0) > (a?.x ?? 0)).toBe(true);
    const ra = heatmapCell(rtl, 0, 0);
    const rb = heatmapCell(rtl, 0, 1);
    expect((ra?.x ?? 0) > (rb?.x ?? 0)).toBe(true);
    expect(rtl.yLabels[0].anchor).toBe('start');
  });

  it('labels drop where they do not fit', () => {
    const tiny = buildHeatmapScene({ ...input, width: 60, height: 30 });
    expect(tiny.cells.every((cell) => cell.labelText === null)).toBe(true);
    expect(buildHeatmapScene(input).cells[0].labelText).toBe('10');
  });

  it('tooltip, announcement and a 2-D sr table', () => {
    const scene = buildHeatmapScene(input);
    expect(heatmapTooltip(scene, '0:1', 300)?.label).toBe('Mon · 10');
    const cell = heatmapCell(scene, 1, 0);
    if (cell === undefined) throw new Error('no cell');
    expect(heatmapAnnouncement(scene, cell, messages)).toBe('Tue, 9: 20');
    const table = heatmapSrTable(scene, messages, 50);
    expect(table.headers).toEqual(['Argument', '9', '10']);
    expect(table.rows[1]).toEqual({ argText: 'Tue', cells: ['20', 'no data'] });
    expect(heatmapSrTable(scene, messages, 1).rows).toHaveLength(1);
  });

  it('a segmented colour scale reaches the legend', () => {
    const scene = buildHeatmapScene({
      ...input,
      colorScale: {
        type: 'segmented',
        ranges: [
          { start: 0, end: 15, color: 'green' },
          { start: 15, end: 40, color: 'red' },
        ],
      },
    });
    expect(heatmapCell(scene, 0, 0)?.fill).toBe('green');
    expect(scene.legend.segments).toHaveLength(2);
  });
});
