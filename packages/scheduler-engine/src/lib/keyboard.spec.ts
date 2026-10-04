import {
  chipKey,
  monthCellKey,
  schedulerLogicalKey,
  timeGridCellKey,
  timeGridChipCtrlKey,
  timelineBarCtrlKey,
} from './keyboard';
import type { SchedulerAppointment } from './scheduler-model';

function appt(
  key: number,
  start: Date,
  end: Date,
  extra: Partial<SchedulerAppointment<{ owner?: string }>> = {},
): SchedulerAppointment<{ owner?: string }> {
  return {
    key,
    source: { owner: 'a' },
    text: `A${key}`,
    startDate: start,
    endDate: end,
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
    ...extra,
  };
}

const key = (k: string, ctrlKey = false, shiftKey = false) => ({
  key: k,
  ctrlKey,
  shiftKey,
});

describe('keyboard maps', () => {
  it('time-grid cells move clamped, jump with Home/End and activate', () => {
    expect(timeGridCellKey('ArrowUp', 2, 0, 7, 20)).toEqual({
      kind: 'move',
      col: 2,
      row: 0,
    });
    expect(timeGridCellKey('ArrowDown', 2, 19, 7, 20)).toMatchObject({
      row: 19,
    });
    expect(timeGridCellKey('ArrowRight', 6, 3, 7, 20)).toMatchObject({
      col: 6,
    });
    expect(timeGridCellKey('Home', 4, 3, 7, 20)).toMatchObject({ col: 0 });
    expect(timeGridCellKey('End', 0, 3, 7, 20)).toMatchObject({ col: 6 });
    expect(timeGridCellKey('Enter', 0, 0, 7, 20)).toEqual({
      kind: 'activate',
    });
    expect(timeGridCellKey(' ', 0, 0, 7, 20)).toEqual({ kind: 'activate' });
    expect(timeGridCellKey('a', 0, 0, 7, 20)).toBeNull();
  });

  it('month cells run on the fixed 7 × 6 grid', () => {
    expect(monthCellKey('ArrowDown', 5, 3)).toEqual({
      kind: 'move',
      col: 3,
      row: 5,
    });
    expect(monthCellKey('End', 2, 0)).toEqual({ kind: 'move', col: 6, row: 2 });
  });

  it('chip keys activate, delete, cycle and escape', () => {
    const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
    const b = appt(2, new Date(2026, 7, 6, 11), new Date(2026, 7, 6, 12));
    expect(chipKey('Enter', a, [a, b])).toEqual({ kind: 'activate' });
    expect(chipKey('Backspace', a, [a, b])).toEqual({ kind: 'delete' });
    expect(chipKey('ArrowRight', a, [a, b])).toEqual({ kind: 'focus', key: 2 });
    expect(chipKey('ArrowRight', b, [a, b])).toEqual({ kind: 'focus', key: 2 });
    expect(chipKey('ArrowLeft', b, [a, b])).toEqual({ kind: 'focus', key: 1 });
    expect(chipKey('Escape', a, [a])).toEqual({ kind: 'escape' });
    expect(chipKey('x', a, [a])).toBeNull();
  });

  it('Ctrl+Arrow moves and Ctrl+Shift+Down resizes a time-grid chip', () => {
    const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
    const move = timeGridChipCtrlKey(a, key('ArrowDown', true), 30, true, true);
    expect(move).toMatchObject({ handled: true, commit: { kind: 'move' } });
    if (move.handled && move.commit) {
      expect(move.commit.proposal.startDate).toEqual(
        new Date(2026, 7, 6, 9, 30),
      );
    }
    const right = timeGridChipCtrlKey(
      a,
      key('ArrowRight', true),
      30,
      true,
      true,
    );
    if (right.handled && right.commit) {
      expect(right.commit.proposal.startDate).toEqual(new Date(2026, 7, 7, 9));
    }
    const resize = timeGridChipCtrlKey(
      a,
      key('ArrowDown', true, true),
      30,
      true,
      true,
    );
    expect(resize).toMatchObject({ commit: { kind: 'resize' } });
    if (resize.handled && resize.commit) {
      expect(resize.commit.proposal.endDate).toEqual(
        new Date(2026, 7, 6, 10, 30),
      );
    }
  });

  it('a disabled capability swallows the key without a commit', () => {
    const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
    expect(
      timeGridChipCtrlKey(a, key('ArrowDown', true), 30, false, true),
    ).toEqual({ handled: true });
    expect(
      timeGridChipCtrlKey(a, key('ArrowUp', true, true), 30, true, false),
    ).toEqual({ handled: true });
    // Ctrl+Shift+Left is not a resize key: falls through to the chip keys
    expect(
      timeGridChipCtrlKey(a, key('ArrowLeft', true, true), 30, true, true),
    ).toEqual({ handled: false });
    expect(timeGridChipCtrlKey(a, key('ArrowDown'), 30, true, true)).toEqual({
      handled: false,
    });
  });

  it('timeline bars move by snap, resize and change resource rows', () => {
    const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
    const rows = [{ id: 'a' }, { id: 'b' }, { id: null }];
    const idOf = (item: { owner?: string }) => item.owner;
    const right = timelineBarCtrlKey(
      a,
      key('ArrowRight', true),
      15,
      true,
      rows,
      idOf,
    );
    if (right.handled && right.commit) {
      expect(right.commit.proposal.startDate).toEqual(
        new Date(2026, 7, 6, 9, 15),
      );
    }
    const grow = timelineBarCtrlKey(
      a,
      key('ArrowRight', true, true),
      15,
      true,
      rows,
      idOf,
    );
    if (grow.handled && grow.commit) {
      expect(grow.commit.proposal.endDate).toEqual(
        new Date(2026, 7, 6, 10, 15),
      );
    }
    const down = timelineBarCtrlKey(
      a,
      key('ArrowDown', true),
      15,
      true,
      rows,
      idOf,
    );
    expect(down).toMatchObject({ commit: { resourceId: 'b' } });
    const up = timelineBarCtrlKey(
      a,
      key('ArrowUp', true),
      15,
      true,
      rows,
      idOf,
    );
    expect(up).toEqual({ handled: true });
  });

  describe('RTL mirrors the horizontal arrows', () => {
    it('maps physical to logical arrows only in RTL', () => {
      expect(schedulerLogicalKey('ArrowLeft', true)).toBe('ArrowRight');
      expect(schedulerLogicalKey('ArrowRight', true)).toBe('ArrowLeft');
      expect(schedulerLogicalKey('ArrowUp', true)).toBe('ArrowUp');
      expect(schedulerLogicalKey('ArrowLeft')).toBe('ArrowLeft');
    });

    it('time-grid and month cells: Left moves to the next day', () => {
      expect(timeGridCellKey('ArrowLeft', 2, 3, 7, 20, true)).toEqual({
        kind: 'move',
        col: 3,
        row: 3,
      });
      expect(timeGridCellKey('ArrowRight', 2, 3, 7, 20, true)).toEqual({
        kind: 'move',
        col: 1,
        row: 3,
      });
      // vertical keys and Home/End are logical already
      expect(timeGridCellKey('ArrowDown', 2, 3, 7, 20, true)).toMatchObject({
        col: 2,
        row: 4,
      });
      expect(timeGridCellKey('Home', 4, 3, 7, 20, true)).toMatchObject({
        col: 0,
      });
      expect(monthCellKey('ArrowLeft', 1, 3, true)).toEqual({
        kind: 'move',
        col: 4,
        row: 1,
      });
    });

    it('chips cycle chronologically with the mirrored arrows', () => {
      const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
      const b = appt(2, new Date(2026, 7, 6, 11), new Date(2026, 7, 6, 12));
      expect(chipKey('ArrowLeft', a, [a, b], true)).toEqual({
        kind: 'focus',
        key: 2,
      });
      expect(chipKey('ArrowRight', b, [a, b], true)).toEqual({
        kind: 'focus',
        key: 1,
      });
    });

    it('Ctrl+Left moves a chip to the next day, a timeline bar later', () => {
      const a = appt(1, new Date(2026, 7, 6, 9), new Date(2026, 7, 6, 10));
      const day = timeGridChipCtrlKey(
        a,
        key('ArrowLeft', true),
        30,
        true,
        true,
        true,
      );
      expect(day.handled && day.commit?.proposal.startDate).toEqual(
        new Date(2026, 7, 7, 9),
      );
      const rows = [{ id: 'a' }];
      const idOf = (item: { owner?: string }) => item.owner;
      const later = timelineBarCtrlKey(
        a,
        key('ArrowLeft', true),
        15,
        true,
        rows,
        idOf,
        true,
      );
      expect(later.handled && later.commit?.proposal.startDate).toEqual(
        new Date(2026, 7, 6, 9, 15),
      );
      const grow = timelineBarCtrlKey(
        a,
        key('ArrowLeft', true, true),
        15,
        true,
        rows,
        idOf,
        true,
      );
      expect(grow.handled && grow.commit?.proposal.endDate).toEqual(
        new Date(2026, 7, 6, 10, 15),
      );
    });
  });
});
