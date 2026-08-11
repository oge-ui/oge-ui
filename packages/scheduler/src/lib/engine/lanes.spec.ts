import { packLanes, type LaneInput } from './lanes';
import type { SchedulerAppointment } from './scheduler-model';

function item(
  key: number,
  startDayIndex: number,
  endDayIndex: number,
): LaneInput<{ id: number }> {
  const appointment: SchedulerAppointment<{ id: number }> = {
    key,
    source: { id: key },
    text: `A${key}`,
    startDate: new Date(2026, 7, 6),
    endDate: new Date(2026, 7, 7),
    allDay: true,
    displayAllDay: true,
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
    startDayIndex,
    endDayIndex,
    clippedStart: false,
    clippedEnd: false,
  };
}

describe('packLanes', () => {
  it('packs non-overlapping spans into one lane', () => {
    const layout = packLanes([item(1, 0, 1), item(2, 2, 3), item(3, 4, 6)], null);
    expect(layout.laneCount).toBe(1);
    expect(layout.visible.every((entry) => entry.lane === 0)).toBe(true);
  });

  it('stacks overlapping spans into separate lanes', () => {
    const layout = packLanes([item(1, 0, 3), item(2, 2, 5), item(3, 4, 6)], null);
    expect(layout.laneCount).toBe(2);
    expect(layout.visible.find((e) => e.appointment.key === 1)?.lane).toBe(0);
    expect(layout.visible.find((e) => e.appointment.key === 2)?.lane).toBe(1);
    expect(layout.visible.find((e) => e.appointment.key === 3)?.lane).toBe(0);
  });

  it('sorts longer spans first at equal start days', () => {
    const layout = packLanes([item(1, 0, 0), item(2, 0, 4)], null);
    expect(layout.visible.find((e) => e.appointment.key === 2)?.lane).toBe(0);
    expect(layout.visible.find((e) => e.appointment.key === 1)?.lane).toBe(1);
  });

  it('caps lanes and counts overflow for every covered day', () => {
    const layout = packLanes(
      [item(1, 0, 2), item(2, 0, 2), item(3, 1, 3)],
      2,
    );
    expect(layout.laneCount).toBe(2);
    expect(layout.visible).toHaveLength(2);
    expect(layout.overflowByDay.get(1)).toBe(1);
    expect(layout.overflowByDay.get(2)).toBe(1);
    expect(layout.overflowByDay.get(3)).toBe(1);
    expect(layout.overflowByDay.get(0)).toBeUndefined();
    expect(layout.hiddenByDay.get(2)?.[0]?.key).toBe(3);
  });

  it('still fills free space in existing lanes when the cap is reached', () => {
    const layout = packLanes(
      [item(1, 0, 1), item(2, 0, 1), item(3, 3, 4)],
      2,
    );
    // item 3 fits into lane 0 after item 1 — the cap must not hide it
    expect(layout.visible).toHaveLength(3);
    expect(layout.visible.find((e) => e.appointment.key === 3)?.lane).toBe(0);
  });

  it('returns an empty layout for no items', () => {
    const layout = packLanes([], 3);
    expect(layout.visible).toEqual([]);
    expect(layout.laneCount).toBe(0);
    expect(layout.overflowByDay.size).toBe(0);
  });
});
