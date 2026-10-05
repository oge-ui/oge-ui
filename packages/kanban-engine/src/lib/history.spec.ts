import {
  KanbanHistory,
  invertKanbanOp,
  isKanbanEditingTarget,
  kanbanHistoryShortcut,
  type KanbanHistoryOp,
} from './history';

const update = (n: number): KanbanHistoryOp<{ v: number }> => ({
  kind: 'update',
  key: 1,
  before: { v: n },
  after: { v: n + 1 },
});

describe('kanban history', () => {
  it('inverts every operation kind', () => {
    expect(invertKanbanOp({ kind: 'insert', key: 1, item: 'x', index: 2 })).toEqual(
      { kind: 'remove', key: 1, item: 'x', index: 2 },
    );
    expect(invertKanbanOp(update(1))).toEqual({
      kind: 'update',
      key: 1,
      before: { v: 2 },
      after: { v: 1 },
    });
    const from = { column: 'a', index: 0, swimlane: null };
    const to = { column: 'b', index: 3, swimlane: 'x' };
    expect(invertKanbanOp({ kind: 'move', key: 1, from, to })).toEqual({
      kind: 'move',
      key: 1,
      from: to,
      to: from,
    });
  });

  it('undoes and redoes steps, clearing redo on a new record', () => {
    const history = new KanbanHistory<{ v: number }>();
    history.record(update(1));
    history.record(update(2));
    expect(history.canUndo).toBe(true);
    expect(history.undo()).toEqual([invertKanbanOp(update(2))]);
    expect(history.canRedo).toBe(true);
    expect(history.redo()).toEqual([update(2)]);
    history.undo();
    history.record(update(9));
    expect(history.canRedo).toBe(false);
  });

  it('groups a transaction into one step, replayed in reverse', () => {
    const history = new KanbanHistory<{ v: number }>();
    history.transaction(() => {
      history.record(update(1));
      history.transaction(() => history.record(update(2)));
    });
    const ops = history.undo();
    expect(ops).toEqual([invertKanbanOp(update(2)), invertKanbanOp(update(1))]);
    expect(history.canUndo).toBe(false);
    // an empty transaction records nothing
    history.transaction(() => undefined);
    expect(history.canUndo).toBe(false);
  });

  it('ignores changes while replaying and honours the limit', () => {
    const history = new KanbanHistory<{ v: number }>(2);
    history.replay(() => history.record(update(1)));
    expect(history.canUndo).toBe(false);
    history.record(update(1));
    history.record(update(2));
    history.record(update(3));
    history.undo();
    history.undo();
    expect(history.undo()).toBeNull();
    history.setLimit(0);
    history.record(update(4));
    expect(history.canUndo).toBe(false);
  });

  it('maps keyboard shortcuts', () => {
    const key = (k: string, mods: Record<string, boolean> = {}) => ({
      key: k,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...mods,
    });
    expect(kanbanHistoryShortcut(key('z', { ctrlKey: true }))).toBe('undo');
    expect(kanbanHistoryShortcut(key('Z', { ctrlKey: true, shiftKey: true }))).toBe(
      'redo',
    );
    expect(kanbanHistoryShortcut(key('y', { metaKey: true }))).toBe('redo');
    expect(kanbanHistoryShortcut(key('z'))).toBeNull();
  });

  it('recognizes editing targets', () => {
    const input = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isKanbanEditingTarget(input)).toBe(true);
    expect(isKanbanEditingTarget(checkbox)).toBe(false);
    expect(isKanbanEditingTarget(document.createElement('textarea'))).toBe(true);
    expect(isKanbanEditingTarget(document.createElement('div'))).toBe(false);
    expect(isKanbanEditingTarget(null)).toBe(false);
  });
});
