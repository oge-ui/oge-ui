import { layoutDayColumn } from './layout';
import type { SchedulerAppointment } from './scheduler-model';
import type { AppointmentSegment } from './view-model';

function segment(
  key: number,
  startMinutes: number,
  endMinutes: number,
): AppointmentSegment<{ id: number }> {
  const appointment: SchedulerAppointment<{ id: number }> = {
    key,
    source: { id: key },
    text: `A${key}`,
    startDate: new Date(2026, 7, 6),
    endDate: new Date(2026, 7, 6),
    allDay: false,
    displayAllDay: false,
    color: undefined,
    location: undefined,
    description: undefined,
    reminderMinutes: undefined,
    recurrenceRule: undefined,
    recurrenceException: undefined,
    disabled: false,
    seriesKey: null,
  };
  return {
    appointment,
    dayIndex: 0,
    startMinutes,
    endMinutes,
    clippedStart: false,
    clippedEnd: false,
  };
}

const WINDOW = { start: 480, end: 1080 }; // 08:00–18:00

function layout(segments: AppointmentSegment<{ id: number }>[]) {
  return layoutDayColumn(segments, WINDOW.start, WINDOW.end, 15);
}

function byKey(
  result: ReturnType<typeof layout>,
  key: number,
): ReturnType<typeof layout>[number] {
  const found = result.find((item) => item.appointment.key === key);
  if (!found) throw new Error(`segment ${key} missing`);
  return found;
}

describe('layoutDayColumn', () => {
  it('gives a lone segment the full width', () => {
    const result = layout([segment(1, 540, 600)]);
    expect(result).toHaveLength(1);
    expect(result[0].leftFraction).toBe(0);
    expect(result[0].widthFraction).toBe(1);
    expect(result[0].topFraction).toBeCloseTo((540 - 480) / 600);
    expect(result[0].heightFraction).toBeCloseTo(60 / 600);
  });

  it('splits two overlapping segments into equal columns', () => {
    const result = layout([segment(1, 540, 660), segment(2, 600, 720)]);
    expect(byKey(result, 1).widthFraction).toBeCloseTo(0.5);
    expect(byKey(result, 2).widthFraction).toBeCloseTo(0.5);
    expect(byKey(result, 1).columnIndex).toBe(0);
    expect(byKey(result, 2).columnIndex).toBe(1);
    expect(byKey(result, 1).columnCount).toBe(2);
  });

  it('does not cluster back-to-back segments (half-open ranges)', () => {
    const result = layout([segment(1, 540, 600), segment(2, 600, 660)]);
    expect(byKey(result, 1).widthFraction).toBe(1);
    expect(byKey(result, 2).widthFraction).toBe(1);
    expect(byKey(result, 2).columnIndex).toBe(0);
  });

  it('propagates cluster width through transitive overlap chains', () => {
    // 1 overlaps 2, 2 overlaps 3, 1 does not overlap 3 — all share a cluster
    const result = layout([
      segment(1, 540, 620),
      segment(2, 600, 700),
      segment(3, 660, 740),
    ]);
    // 3 reuses column 0 (1 ended at 620 ≤ 660) → cluster has 2 columns
    expect(byKey(result, 1).columnCount).toBe(2);
    expect(byKey(result, 2).columnCount).toBe(2);
    expect(byKey(result, 3).columnCount).toBe(2);
    expect(byKey(result, 3).columnIndex).toBe(0);
  });

  it('handles identical start times deterministically (longer first)', () => {
    const result = layout([segment(1, 540, 600), segment(2, 540, 720)]);
    expect(byKey(result, 2).columnIndex).toBe(0); // longer segment first
    expect(byKey(result, 1).columnIndex).toBe(1);
  });

  it('closes a cluster and resets the column count after a gap', () => {
    const result = layout([
      segment(1, 500, 560),
      segment(2, 520, 580),
      segment(3, 900, 960),
    ]);
    expect(byKey(result, 1).columnCount).toBe(2);
    expect(byKey(result, 3).columnCount).toBe(1);
    expect(byKey(result, 3).widthFraction).toBe(1);
  });

  it('applies the minimum render height and clusters accordingly', () => {
    // zero-length reminder at 09:00 renders 15min tall, overlapping a 09:00 meeting
    const result = layout([segment(1, 540, 540), segment(2, 540, 600)]);
    expect(byKey(result, 1).heightFraction).toBeCloseTo(15 / 600);
    expect(byKey(result, 1).columnCount).toBe(2);
  });

  it('clamps the minimum height at the window bottom', () => {
    const result = layout([segment(1, 1075, 1080)]);
    expect(result[0].topFraction).toBeCloseTo((1065 - 480) / 600);
    expect(result[0].heightFraction).toBeCloseTo(15 / 600);
    expect(result[0].topFraction + result[0].heightFraction).toBeLessThanOrEqual(
      1,
    );
  });

  it('is deterministic across input order', () => {
    const a = layout([segment(1, 540, 660), segment(2, 600, 720)]);
    const b = layout([segment(2, 600, 720), segment(1, 540, 660)]);
    expect(byKey(a, 1).columnIndex).toBe(byKey(b, 1).columnIndex);
    expect(byKey(a, 2).columnIndex).toBe(byKey(b, 2).columnIndex);
  });

  it('returns [] for an empty or inverted window', () => {
    expect(layoutDayColumn([], 480, 1080, 15)).toEqual([]);
    expect(layoutDayColumn([segment(1, 540, 600)], 1080, 480, 15)).toEqual([]);
  });
});
