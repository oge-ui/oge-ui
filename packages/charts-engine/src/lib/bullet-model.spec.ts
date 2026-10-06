import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import { buildBulletScene, bulletRangeShade } from './bullet-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;
const base = { width: 300, height: 60, locale: 'en-US', messages } as const;

describe('buildBulletScene', () => {
  it('derives a nice scale from the data and draws bar, target and bands', () => {
    const scene = buildBulletScene({
      ...base,
      value: 270,
      target: 250,
      ranges: [
        { start: 0, end: 150 },
        { start: 150, end: 225 },
        { start: 225, end: 300 },
      ],
      title: 'Revenue',
    });
    expect(scene.labels.at(-1)?.text).toBe('300');
    expect(scene.ranges).toHaveLength(3);
    expect(scene.ranges[0].color).toBe(bulletRangeShade(0, 3));
    expect(scene.bar).not.toBeNull();
    expect(scene.target).not.toBeNull();
    // the bar is thinner than the bands, the target longer than the bar
    expect(scene.bar?.height ?? 0).toBeLessThan(scene.ranges[0].height);
    expect(
      Math.abs((scene.target?.y2 ?? 0) - (scene.target?.y1 ?? 0)),
    ).toBeGreaterThan(scene.bar?.height ?? 0);
    expect(scene.ariaLabel).toBe('Revenue bullet chart: value 270, target 250');
    expect(scene.srRows[1]).toEqual({ header: 'Target', cell: '250' });
    expect(scene.targetText).toBe('target 250');
  });

  it('darkest band first', () => {
    expect(bulletRangeShade(0, 3)).toContain('38%');
    expect(bulletRangeShade(2, 3)).toContain('12%');
  });

  it('RTL mirrors, vertical stands the bar up', () => {
    const ltr = buildBulletScene({
      ...base,
      value: 50,
      scale: { min: 0, max: 100 },
    });
    const rtl = buildBulletScene({
      ...base,
      value: 50,
      scale: { min: 0, max: 100 },
      rtl: true,
    });
    expect((rtl.bar?.x ?? 0) + (rtl.bar?.width ?? 0)).toBeCloseTo(
      300 - (ltr.bar?.x ?? 0),
      0,
    );
    const vertical = buildBulletScene({
      ...base,
      width: 80,
      height: 300,
      value: 50,
      scale: { min: 0, max: 100 },
      orientation: 'vertical',
    });
    expect((vertical.bar?.height ?? 0) > (vertical.bar?.width ?? 0)).toBe(true);
  });

  it('a negative value grows the other way from zero', () => {
    const scene = buildBulletScene({
      ...base,
      value: -20,
      scale: { min: -50, max: 50 },
    });
    const zeroLabel = scene.labels.find((label) => label.value === 0);
    expect((scene.bar?.x ?? 0) + (scene.bar?.width ?? 0)).toBeCloseTo(
      zeroLabel?.x ?? 0,
      0,
    );
  });

  it('a missing target and value read as no data', () => {
    const scene = buildBulletScene({ ...base, value: null });
    expect(scene.bar).toBeNull();
    expect(scene.target).toBeNull();
    expect(scene.ariaLabel).toContain('value no data');
  });
});
