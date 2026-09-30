import {
  buildPolarData,
  buildPolarScene,
  nextPolarSelection,
  polarPointAnnouncement,
  polarPointIndex,
  polarSrRows,
  polarTooltip,
  type OgePolarSceneInput,
} from './polar-model';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';

interface Skill {
  skill: string;
  ada: number | null;
  grace: number;
}

const DATA: Skill[] = [
  { skill: 'TS', ada: 9, grace: 7 },
  { skill: 'CSS', ada: 6, grace: 8 },
  { skill: 'SQL', ada: null, grace: 5 },
  { skill: 'Go', ada: 5, grace: 9 },
];

function scene(
  overrides: Partial<OgePolarSceneInput<Skill>> = {},
  bar = false,
) {
  const data = buildPolarData<Skill>({
    dataSource: DATA,
    series: [
      { type: 'area', valueField: 'ada', name: 'Ada' },
      { type: bar ? 'bar' : 'line', valueField: 'grace', name: 'Grace' },
    ],
    commonSeries: { argumentField: 'skill' },
  });
  return buildPolarScene({
    data,
    spider: false,
    startAngle: 0,
    hiddenSeries: new Set(),
    width: 480,
    height: 360,
    locale: 'en-US',
    ...overrides,
  });
}

describe('polar model', () => {
  it('slots categories around the circle with nice-tick rings', () => {
    const s = scene();
    expect(s.data.categories).toEqual(['TS', 'CSS', 'SQL', 'Go']);
    expect(s.spokes.map((spoke) => spoke.label)).toEqual([
      'TS',
      'CSS',
      'SQL',
      'Go',
    ]);
    expect(s.spokes[0].anchor).toBe('middle');
    expect(s.spokes[1].anchor).toBe('start');
    expect(s.rings.length).toBeGreaterThan(0);
    expect(s.rings.every((ring) => ring.radius > 0)).toBe(true);
    expect(s.valueMax).toBe(9);
    expect(s.radius).toBe(Math.min(480, 360) / 2 - 42);
    expect(s.empty).toBe(false);
  });

  it('draws loops for line/area, sectors for bars, and a gap for nulls', () => {
    const s = scene();
    expect(s.renderSeries[0].areaPathD).not.toBeNull();
    expect(s.renderSeries[0].markers).toHaveLength(3);
    const bars = scene({}, true).renderSeries[1];
    expect(bars.linePathD).toBeNull();
    expect(bars.sectors).toHaveLength(4);
    expect(bars.markers).toHaveLength(0);
  });

  it('hidden series leave the plot and the value max; axis max overrides', () => {
    const hidden = scene({ hiddenSeries: new Set([1]) });
    expect(hidden.renderSeries).toHaveLength(1);
    expect(hidden.legendItems[1].hidden).toBe(true);
    expect(hidden.valueMax).toBe(9);
    expect(
      scene({ valueAxis: { max: 20, labelFormat: (v) => `${String(v)}!` } })
        .rings[0].label,
    ).toMatch(/!$/);
  });

  it('tooltip, announcements, sr rows and selection', () => {
    const s = scene();
    const tip = polarTooltip(s, { seriesIndex: 1, pointIndex: 0 });
    expect(tip).toMatchObject({
      argument: 'TS',
      seriesName: 'Grace',
      valueText: '7',
    });
    expect(polarTooltip(s, { seriesIndex: 0, pointIndex: 2 })).toBeNull();
    expect(polarTooltip(s, null)).toBeNull();
    expect(polarPointAnnouncement(s, OGE_DEFAULT_CHARTS_MESSAGES, 1, 0)).toBe(
      'Ada, CSS: 6',
    );
    expect(polarPointAnnouncement(s, OGE_DEFAULT_CHARTS_MESSAGES, 2, 0)).toBe(
      'Ada, SQL: ',
    );
    expect(polarPointIndex(s, 1, 3)).toBe(3);
    expect(polarPointIndex(s, 9, 3)).toBe(-1);
    expect(polarSrRows(s, 50)[2]).toEqual({ argText: 'SQL', cells: ['', '5'] });
    expect(nextPolarSelection([], 0, 1)).toEqual([
      { seriesIndex: 0, pointIndex: 1 },
    ]);
    expect(
      nextPolarSelection([{ seriesIndex: 0, pointIndex: 1 }], 0, 1),
    ).toEqual([]);
  });
});
