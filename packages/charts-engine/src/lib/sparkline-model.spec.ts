import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import {
  buildSparklineScene,
  sparklineIndexAt,
  sparklineTooltip,
} from './sparkline-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;
const base = { width: 100, height: 30, locale: 'en-US', messages } as const;

describe('buildSparklineScene', () => {
  it('line: one path through every point, gaps split it', () => {
    const scene = buildSparklineScene({
      ...base,
      dataSource: [1, 3, null, 2, 5],
    });
    expect(scene.linePath.match(/M/g)).toHaveLength(2);
    expect(scene.points[2].y).toBeNull();
    expect(scene.ariaLabel).toBe(
      'sparkline, 4 points: first 1, last 5, low 1, high 5',
    );
  });

  it('reads items through valueField / argumentField', () => {
    const scene = buildSparklineScene({
      ...base,
      dataSource: [
        { m: 'Jan', v: 4 },
        { m: 'Feb', v: 8 },
      ],
      valueField: 'v',
      argumentField: 'm',
      title: 'Sales',
    });
    expect(scene.points.map((p) => p.argument)).toEqual(['Jan', 'Feb']);
    expect(scene.ariaLabel.startsWith('Sales sparkline, 2 points')).toBe(true);
  });

  it('one point reads singular', () => {
    const scene = buildSparklineScene({ ...base, dataSource: [7] });
    expect(scene.ariaLabel).toContain('1 point:');
  });

  it('area closes down to the zero baseline', () => {
    const scene = buildSparklineScene({
      ...base,
      dataSource: [-2, 4],
      type: 'area',
    });
    expect(scene.areaPath.endsWith('Z')).toBe(true);
  });

  it('bar: includes zero, negatives hang below it', () => {
    const scene = buildSparklineScene({
      ...base,
      dataSource: [3, -3],
      type: 'bar',
    });
    expect(scene.bars.map((b) => b.kind)).toEqual(['positive', 'negative']);
    expect(scene.bars[1].y).toBeGreaterThanOrEqual(
      scene.bars[0].y + scene.bars[0].height - 0.01,
    );
  });

  it('winloss: equal-height ticks around the middle, ties flat', () => {
    const scene = buildSparklineScene({
      ...base,
      dataSource: [5, -1, 0],
      type: 'winloss',
    });
    expect(scene.bars.map((b) => b.kind)).toEqual([
      'positive',
      'negative',
      'draw',
    ]);
    expect(scene.bars[0].height).toBe(scene.bars[1].height);
    expect(scene.bars[2].height).toBe(2);
  });

  it('markers: max, min, first, last without duplicates', () => {
    const scene = buildSparklineScene({
      ...base,
      dataSource: [2, 9, 1, 4],
      markers: true,
    });
    expect(scene.markers.map((m) => `${m.kind}:${m.index}`)).toEqual([
      'max:1',
      'min:2',
      'first:0',
      'last:3',
    ]);
    const some = buildSparklineScene({
      ...base,
      dataSource: [2, 9, 1, 4],
      markers: { last: true },
    });
    expect(some.markers.map((m) => m.kind)).toEqual(['last']);
  });

  it('RTL mirrors the argument direction', () => {
    const ltr = buildSparklineScene({ ...base, dataSource: [1, 2] });
    const rtl = buildSparklineScene({ ...base, dataSource: [1, 2], rtl: true });
    expect(rtl.points[0].x).toBeCloseTo(100 - ltr.points[0].x);
  });

  it('hover: nearest non-null point and its tooltip', () => {
    const scene = buildSparklineScene({ ...base, dataSource: [1, null, 3] });
    expect(sparklineIndexAt(scene, 52)).not.toBe(1);
    expect(sparklineTooltip(scene, 2, 100, 'en-US')?.text).toBe('3: 3');
    expect(sparklineTooltip(scene, 1, 100, 'en-US')).toBeNull();
  });

  it('stays out of the cartesian chart (the tiny-bundle promise)', () => {
    const source = readFileSync(join(__dirname, 'sparkline-model.ts'), 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['./charts-config', '@oge-ui/core']);
    // the catalog import is type-only, so no runtime code comes with it
    expect(source).toMatch(
      /import type \{ OgeChartsMessages \} from '\.\/charts-config'/,
    );
  });
});
