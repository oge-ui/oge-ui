import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import { buildChartHierarchy, chartHierarchyDescendants } from './hierarchy';
import {
  buildSunburstScene,
  sunburstSegmentAt,
  sunburstTooltip,
} from './sunburst-model';
import {
  buildTreemapScene,
  chartHierarchySrTable,
  chartHierarchyValueText,
  fitChartText,
  treemapTooltip,
} from './treemap-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;
const data = [
  {
    name: 'Europe',
    items: [
      { name: 'Germany', value: 40 },
      { name: 'France', value: 30 },
    ],
  },
  { name: 'Asia', items: [{ name: 'Japan', value: 30 }] },
  { name: 'Other', value: 10 },
];
const hierarchy = buildChartHierarchy({ dataSource: data, rootLabel: 'All' });
const base = {
  hierarchy,
  rootKey: '',
  layoutAlgorithm: 'squarified' as const,
  maxDepth: Infinity,
  showLabels: true,
  width: 400,
  height: 300,
  locale: 'en-US',
  messages,
};

describe('fitChartText', () => {
  it('cuts with an ellipsis, gives up below three characters', () => {
    expect(fitChartText('Germany', 200)).toBe('Germany');
    expect(fitChartText('Germany', 40)).toBe('Germ…');
    expect(fitChartText('Germany', 20)).toBeNull();
  });
});

describe('buildTreemapScene', () => {
  it('nests groups with headers and their children inside', () => {
    const scene = buildTreemapScene(base);
    const europe = scene.tiles.find((t) => t.node.name === 'Europe');
    const germany = scene.tiles.find((t) => t.node.name === 'Germany');
    if (europe === undefined || germany === undefined)
      throw new Error('missing');
    expect(europe.nested).toBe(true);
    expect(germany.level).toBe(2);
    expect(germany.x).toBeGreaterThanOrEqual(europe.x);
    expect(germany.y).toBeGreaterThanOrEqual(europe.y + 20 - 0.01);
    expect(germany.y + germany.height).toBeLessThanOrEqual(
      europe.y + europe.height + 0.01,
    );
    expect(scene.breadcrumb).toEqual([{ key: '', name: 'All' }]);
    expect(scene.ariaLabel).toBe('treemap, 6 tiles');
  });

  it('maxDepth 1 draws groups as plain tiles', () => {
    const scene = buildTreemapScene({ ...base, maxDepth: 1 });
    expect(scene.tiles.map((t) => t.node.name).sort()).toEqual([
      'Asia',
      'Europe',
      'Other',
    ]);
    expect(scene.tiles.every((t) => !t.nested)).toBe(true);
    expect(scene.tiles.find((t) => t.node.name === 'Europe')?.isGroup).toBe(
      true,
    );
  });

  it('drilled: the root changes and the breadcrumb grows', () => {
    const scene = buildTreemapScene({ ...base, rootKey: '0' });
    expect(scene.tiles.map((t) => t.node.name)).toEqual(['Germany', 'France']);
    expect(scene.breadcrumb.map((c) => c.name)).toEqual(['All', 'Europe']);
  });

  it('a colour scale colours the leaves by value and adds a legend', () => {
    const scene = buildTreemapScene({
      ...base,
      maxDepth: 1,
      colorScale: { colors: ['a', 'b'] },
    });
    expect(scene.legend?.type).toBe('linear');
    expect(scene.tiles.find((t) => t.node.name === 'Europe')?.fill).toBe('b');
    expect(scene.tiles.find((t) => t.node.name === 'Other')?.fill).toBe('a');
  });

  it('RTL mirrors the tiles', () => {
    const ltr = buildTreemapScene({ ...base, maxDepth: 1 });
    const rtl = buildTreemapScene({ ...base, maxDepth: 1, rtl: true });
    const a = ltr.tiles.find((t) => t.node.name === 'Europe');
    const b = rtl.tiles.find((t) => t.node.name === 'Europe');
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeCloseTo(400 - (a?.x ?? 0), 0);
  });

  it('tooltip, value text and sr table', () => {
    const scene = buildTreemapScene(base);
    const tip = treemapTooltip(scene, '0/1', 400, 'en-US');
    expect(tip?.label).toBe('Europe / France');
    expect(tip?.valueText).toBe('30 (42.9%)');
    expect(
      chartHierarchyValueText(
        hierarchy.byKey.get('2') ?? hierarchy.root,
        messages,
        'en-US',
      ),
    ).toBe('Other: 10 (9.1%)');
    const table = chartHierarchySrTable(
      chartHierarchyDescendants(hierarchy.root),
      hierarchy.root,
      messages,
      'en-US',
      50,
    );
    expect(table.headers).toEqual(['Argument', 'Value', 'Share']);
    expect(table.rows[1]).toEqual({
      argText: 'Europe / Germany',
      cells: ['40', '57.1%'],
    });
  });
});

describe('buildSunburstScene', () => {
  const sunburst = {
    hierarchy,
    rootKey: '',
    maxDepth: Infinity,
    innerRadius: 0.25,
    startAngle: 0,
    showLabels: true,
    width: 300,
    height: 300,
    locale: 'en-US',
    messages,
  };

  it('one ring per level, angles proportional within the parent', () => {
    const scene = buildSunburstScene(sunburst);
    expect(scene.segments).toHaveLength(6);
    const europe = scene.segments.find((s) => s.node.name === 'Europe');
    const germany = scene.segments.find((s) => s.node.name === 'Germany');
    if (europe === undefined || germany === undefined)
      throw new Error('missing');
    expect(europe.endAngle - europe.startAngle).toBeCloseTo(
      (Math.PI * 2 * 70) / 110,
    );
    expect(germany.startAngle).toBeCloseTo(europe.startAngle);
    expect(germany.innerR).toBeGreaterThanOrEqual(europe.outerR);
    expect(scene.center).toEqual({ name: 'All', value: '110' });
    expect(scene.ariaLabel).toBe('sunburst chart, 6 segments');
  });

  it('hit-tests by angle and radius', () => {
    const scene = buildSunburstScene(sunburst);
    const europe = scene.segments.find((s) => s.node.name === 'Europe');
    if (europe === undefined) throw new Error('missing');
    const mid = (europe.startAngle + europe.endAngle) / 2;
    const r = (europe.innerR + europe.outerR) / 2;
    const hit = sunburstSegmentAt(
      scene,
      scene.cx + r * Math.sin(mid),
      scene.cy - r * Math.cos(mid),
    );
    expect(hit?.key).toBe('0');
    expect(sunburstSegmentAt(scene, scene.cx, scene.cy)).toBeNull();
    expect(sunburstTooltip(scene, '0', 'en-US')?.valueText).toBe('70 (63.6%)');
  });

  it('drilling re-roots the rings', () => {
    const scene = buildSunburstScene({ ...sunburst, rootKey: '0' });
    expect(scene.segments.map((s) => s.node.name)).toEqual([
      'Germany',
      'France',
    ]);
    expect(scene.breadcrumb.map((c) => c.name)).toEqual(['All', 'Europe']);
    expect(scene.segments[0].innerR).toBeCloseTo(scene.holeRadius + 1);
  });
});
