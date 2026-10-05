import {
  calendarDayDiff,
  planSchedulerPaste,
  schedulerClipboardEntries,
} from './clipboard';
import {
  SchedulerEditHistory,
  invertHistoryOp,
  restorePatch,
  type SchedulerHistoryOp,
} from './history';
import {
  chipSelectKey,
  isSchedulerEditingTarget,
  schedulerSelectGesture,
  schedulerShortcut,
} from './keyboard';
import {
  expandAppointment,
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import { nextSchedulerSelection, pruneSchedulerSelection } from './selection';

interface Item {
  id?: number;
  text: string;
  startDate: Date | string;
  endDate: Date | string;
  room?: string;
  recurrenceRule?: string;
  recurrenceException?: string;
}

const fields = resolveSchedulerFields<Item>({
  textExpr: 'text',
  startDateExpr: 'startDate',
  endDateExpr: 'endDate',
  allDayExpr: 'allDay',
  colorExpr: 'color',
  locationExpr: 'location',
  descriptionExpr: 'description',
  reminderExpr: 'reminder',
  recurrenceRuleExpr: 'recurrenceRule',
  recurrenceExceptionExpr: 'recurrenceException',
  disabledExpr: 'disabled',
});
const appt = (item: Item, key: number): SchedulerAppointment<Item> =>
  normalizeAppointment(item, key, fields) as SchedulerAppointment<Item>;

describe('edit history', () => {
  it('records, groups transactions, undoes and redoes', () => {
    const history = new SchedulerEditHistory<string>(() => 10);
    const applied: SchedulerHistoryOp<string>[][] = [];
    history.record({ kind: 'insert', item: 'a' });
    history.transaction(() => {
      history.record({ kind: 'update', before: 'b', after: 'b2' });
      history.record({ kind: 'insert', item: 'c' });
    });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    // undo replays the last entry reversed; recorded inverse ops form redo
    history.undo((ops) => {
      applied.push([...ops]);
      for (const op of ops) history.record(invertHistoryOp(op));
    });
    expect(applied[0].map((op) => op.kind)).toEqual(['insert', 'update']);
    expect(history.canRedo()).toBe(true);
    history.redo((ops) => {
      applied.push([...ops]);
      for (const op of ops) history.record(invertHistoryOp(op));
    });
    expect(applied[1].map((op) => op.kind)).toEqual(['update', 'remove']);
    expect(history.canRedo()).toBe(false);
    // a new edit after an undo drops the redo stack
    history.undo(() => history.record({ kind: 'insert', item: 'x' }));
    expect(history.canRedo()).toBe(true);
    history.record({ kind: 'insert', item: 'y' });
    expect(history.canRedo()).toBe(false);
  });

  it('honours the limit (0 = off) and clears', () => {
    let limit = 2;
    const history = new SchedulerEditHistory<number>(() => limit);
    for (let index = 0; index < 5; index++) {
      history.record({ kind: 'insert', item: index });
    }
    let undone = 0;
    while (history.undo(() => undefined)) undone++;
    expect(undone).toBe(2);
    limit = 0;
    history.record({ kind: 'insert', item: 9 });
    expect(history.canUndo()).toBe(false);
    limit = 5;
    history.record({ kind: 'insert', item: 9 });
    history.clear();
    expect(history.canUndo() || history.canRedo()).toBe(false);
  });

  it('inverts ops and builds restore patches', () => {
    expect(invertHistoryOp({ kind: 'update', before: 1, after: 2 })).toEqual({
      kind: 'update',
      before: 2,
      after: 1,
    });
    expect(
      restorePatch({ a: 2, extra: 'x' }, { a: 1 } as { a: number; extra?: string }),
    ).toEqual({ a: 1, extra: undefined });
  });
});

describe('clipboard', () => {
  const series = appt(
    {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 3, 9),
      endDate: new Date(2026, 7, 3, 9, 30),
      recurrenceRule: 'FREQ=DAILY',
      room: 'a',
    },
    1,
  );
  const occurrence = expandAppointment(
    series,
    new Date(2026, 7, 5),
    new Date(2026, 7, 6),
  )[0];
  const review = appt(
    {
      id: 2,
      text: 'Review',
      startDate: '2026-08-05T11:00',
      endDate: '2026-08-05T12:00',
    },
    2,
  );

  it('keeps relative offsets, drops keys and series rules', () => {
    const entries = schedulerClipboardEntries([review, occurrence]);
    expect(entries.map((entry) => entry.source.text)).toEqual(['Standup', 'Review']);
    const pasted = planSchedulerPaste(
      entries,
      { date: new Date(2026, 7, 12, 14), allDay: false, values: { room: 'b' } },
      fields,
      'id',
    );
    expect(pasted[0]).toMatchObject({
      text: 'Standup',
      startDate: new Date(2026, 7, 12, 14),
      endDate: new Date(2026, 7, 12, 14, 30),
      room: 'b',
    });
    expect('id' in pasted[0]).toBe(false);
    expect('recurrenceRule' in pasted[0]).toBe(false);
    // string-dated items paste back as strings, two hours later
    expect(pasted[1].startDate).toBe('2026-08-12T16:00');
  });

  it('an all-day target keeps each copy’s time of day', () => {
    const pasted = planSchedulerPaste(
      schedulerClipboardEntries([occurrence]),
      { date: new Date(2026, 7, 20), allDay: true, values: {} },
      fields,
      null,
    );
    expect(pasted[0].startDate).toEqual(new Date(2026, 7, 20, 9));
    expect(pasted[0].id).toBe(1); // no key field to drop
    expect(calendarDayDiff(new Date(2026, 2, 28, 23), new Date(2026, 2, 30, 1))).toBe(2);
  });
});

describe('selection and shortcuts', () => {
  const items = ['a', 'b', 'c', 'd'].map(
    (text, index) =>
      appt(
        {
          text,
          startDate: new Date(2026, 7, 3, 9 + index),
          endDate: new Date(2026, 7, 3, 10 + index),
        },
        index,
      ),
  );

  it('replaces, toggles and extends ranges over the chip order', () => {
    const source = (index: number) => items[index].source;
    expect(nextSchedulerSelection([], items[1], 'replace', items, null)).toEqual([
      source(1),
    ]);
    const toggled = nextSchedulerSelection([source(1)], items[3], 'toggle', items, null);
    expect(toggled).toEqual([source(1), source(3)]);
    expect(nextSchedulerSelection(toggled, items[3], 'toggle', items, null)).toEqual([
      source(1),
    ]);
    expect(
      nextSchedulerSelection([source(0)], items[2], 'range', items, source(0)),
    ).toEqual([source(0), source(1), source(2)]);
    expect(pruneSchedulerSelection([source(0), source(1)], [source(1)])).toEqual([
      source(1),
    ]);
  });

  it('maps keys and gestures', () => {
    const key = (k: string, mods: Partial<Record<'ctrlKey' | 'shiftKey' | 'metaKey' | 'altKey', boolean>> = {}) => ({
      key: k,
      ctrlKey: false,
      shiftKey: false,
      ...mods,
    });
    expect(schedulerShortcut(key('z', { ctrlKey: true }), false)).toBe('undo');
    expect(schedulerShortcut(key('Z', { ctrlKey: true, shiftKey: true }), false)).toBe('redo');
    expect(schedulerShortcut(key('y', { metaKey: true }), false)).toBe('redo');
    expect(schedulerShortcut(key('c', { ctrlKey: true }), false)).toBe('copy');
    expect(schedulerShortcut(key('v', { ctrlKey: true }), false)).toBe('paste');
    expect(schedulerShortcut(key('v', { ctrlKey: true }), true)).toBeNull();
    expect(schedulerShortcut(key('z'), false)).toBeNull();
    expect(chipSelectKey(key(' ', { ctrlKey: true }))).toBe('toggle');
    expect(chipSelectKey(key(' ', { shiftKey: true }))).toBe('range');
    expect(chipSelectKey(key(' '))).toBeNull();
    expect(schedulerSelectGesture({ ctrlKey: false, shiftKey: true })).toBe('range');
    expect(schedulerSelectGesture({ ctrlKey: false, metaKey: true, shiftKey: false })).toBe('toggle');
  });

  it('recognises editing targets', () => {
    const input = document.createElement('input');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inner = document.createElement('button');
    dialog.appendChild(inner);
    expect(isSchedulerEditingTarget(input)).toBe(true);
    expect(isSchedulerEditingTarget(inner)).toBe(true);
    expect(isSchedulerEditingTarget(document.createElement('div'))).toBe(false);
    expect(isSchedulerEditingTarget(null)).toBe(false);
  });
});
