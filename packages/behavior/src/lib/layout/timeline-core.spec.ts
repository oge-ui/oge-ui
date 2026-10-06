import { describe, expect, it } from 'vitest';
import {
  ogeTimelineDateTimeAttr,
  ogeTimelineHasOpposite,
  ogeTimelineItemSide,
  ogeTimelineTime,
  resolveOgeTimelineConfig,
} from './timeline-core';

describe('ogeTimelineItemSide', () => {
  it('keeps one side for start / end', () => {
    expect([0, 1, 2].map((i) => ogeTimelineItemSide(i, 'start'))).toEqual([
      'start',
      'start',
      'start',
    ]);
    expect(ogeTimelineItemSide(3, 'end')).toBe('end');
  });

  it('alternates from end, or from start when reversed', () => {
    expect([0, 1, 2].map((i) => ogeTimelineItemSide(i, 'alternate'))).toEqual([
      'end',
      'start',
      'end',
    ]);
    expect(
      [0, 1].map((i) => ogeTimelineItemSide(i, 'alternate-reverse')),
    ).toEqual(['start', 'end']);
  });

  it('renders the opposite column only when alternating', () => {
    expect(ogeTimelineHasOpposite('alternate')).toBe(true);
    expect(ogeTimelineHasOpposite('alternate-reverse')).toBe(true);
    expect(ogeTimelineHasOpposite('end')).toBe(false);
  });
});

describe('ogeTimelineTime', () => {
  it('writes the local fields into the datetime attribute', () => {
    const date = new Date(2026, 0, 5, 9, 7, 3);
    expect(ogeTimelineDateTimeAttr(date)).toBe('2026-01-05T09:07:03');
  });

  it('formats a Date through Intl and keeps a string verbatim', () => {
    const date = new Date(2026, 2, 14, 15, 30);
    const time = ogeTimelineTime(date, 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expect(time).toEqual({
      text: 'Mar 14, 2026',
      dateTime: '2026-03-14T15:30:00',
    });
    expect(ogeTimelineTime('Yesterday')).toEqual({
      text: 'Yesterday',
      dateTime: null,
    });
  });

  it('returns null for no time, an empty string or an invalid date', () => {
    expect(ogeTimelineTime(undefined)).toBeNull();
    expect(ogeTimelineTime('  ')).toBeNull();
    expect(ogeTimelineTime(new Date(Number.NaN))).toBeNull();
  });
});

describe('resolveOgeTimelineConfig', () => {
  it('passes the defaults through', () => {
    expect(resolveOgeTimelineConfig(undefined)).toEqual({});
    expect(resolveOgeTimelineConfig({ align: 'alternate' }).align).toBe(
      'alternate',
    );
  });
});
