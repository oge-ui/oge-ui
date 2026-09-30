import {
  buildRangeSelectorData,
  buildRangeSelectorScene,
  commitRangeSelection,
  detectRangeSelectorKind,
  rangeCenteredAt,
  rangeHandleDragRange,
  rangeSelectorAnnouncement,
  rangeSelectorDeltaValue,
  rangeSelectorEffective,
  rangeSelectorLabel,
  rangeSelectorWindowPx,
  rangeWindowDragRange,
} from './range-selector-model';
import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';

const DATA = Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: i % 3 }));

function scene() {
  const data = buildRangeSelectorData({
    dataSource: DATA,
    series: [{ type: 'area', argumentField: 'x', valueField: 'y' }],
  });
  return buildRangeSelectorScene({
    data,
    width: 500,
    height: 90,
    locale: 'en-US',
  });
}

describe('range selector model', () => {
  it('detects time vs linear (never category)', () => {
    expect(
      detectRangeSelectorKind(
        [{ x: 'Jan' }],
        [{ argumentField: 'x' }],
        undefined,
      ),
    ).toBe('linear');
    expect(
      detectRangeSelectorKind(
        [{ x: new Date(2026, 0, 1) }],
        [{ argumentField: 'x' }],
        undefined,
      ),
    ).toBe('time');
    expect(
      detectRangeSelectorKind([{ x: 1 }], [{ argumentField: 'x' }], 'time'),
    ).toBe('time');
  });

  it('draws the mini series over the bounds with thinned ticks', () => {
    const s = scene();
    expect(s.data.bounds).toEqual({ min: 0, max: 100 });
    expect(s.plotH).toBe(72);
    expect(s.backgroundSeries[0].areaPathD).not.toBeNull();
    expect(s.ticks.length).toBeLessThanOrEqual(8);
  });

  it('effective window and pixel edges', () => {
    const s = scene();
    expect(rangeSelectorEffective(s.data, null)).toEqual({ min: 0, max: 100 });
    expect(rangeSelectorEffective(s.data, { min: -5, max: 50 }).min).toBe(0);
    expect(rangeSelectorWindowPx(s, { min: 0, max: 50 })).toEqual({
      start: 0,
      end: 250,
    });
  });

  it('window arithmetic: commit clamp, handle and window drags, track centering', () => {
    const bounds = { min: 0, max: 100 };
    expect(
      commitRangeSelection({ min: 50, max: 50 }, bounds).max,
    ).toBeGreaterThan(50);
    expect(rangeHandleDragRange('start', { min: 20, max: 60 }, 50)).toEqual({
      min: 60,
      max: 60,
    });
    expect(rangeHandleDragRange('end', { min: 20, max: 60 }, -50)).toEqual({
      min: 20,
      max: 20,
    });
    expect(rangeWindowDragRange({ min: 20, max: 60 }, 10)).toEqual({
      min: 30,
      max: 70,
    });
    expect(rangeCenteredAt({ min: 20, max: 60 }, 50)).toEqual({
      min: 30,
      max: 70,
    });
    expect(rangeSelectorDeltaValue(scene().scale, 50)).toBeCloseTo(10);
  });

  it('labels and announcements', () => {
    expect(rangeSelectorLabel('linear', 1234, 'en-US')).toBe('1,234');
    expect(
      rangeSelectorLabel('time', new Date(2026, 0, 5).getTime(), 'en-US'),
    ).toBe('Jan 5, 2026');
    expect(
      rangeSelectorAnnouncement(
        OGE_DEFAULT_CHARTS_MESSAGES,
        'linear',
        { min: 1, max: 2 },
        'en-US',
      ),
    ).toBe('Selected range: 1 – 2');
  });
});
