import { describe, expect, it } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OgeGridEditHistory } from './grid-edit-history';

const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

describe('grid edit history', () => {
  it('undoes and redoes batches in order', () => {
    const history = new OgeGridEditHistory(rx);
    expect(history.canUndo()).toBe(false);
    history.record({
      source: 'edit',
      records: [{ key: 1, field: 'a', before: 1, after: 2 }],
    });
    history.record({
      source: 'paste',
      records: [{ key: 2, field: 'a', before: 'x', after: 'y' }],
    });
    expect(history.takeUndo()?.source).toBe('paste');
    expect(history.canRedo()).toBe(true);
    expect(history.takeUndo()?.source).toBe('edit');
    expect(history.takeUndo()).toBeNull();
    expect(history.takeRedo()?.source).toBe('edit');
    expect(history.canUndo()).toBe(true);
  });

  it('drops no-op records and clears redo on a new step', () => {
    const history = new OgeGridEditHistory(rx);
    history.record({
      source: 'edit',
      records: [
        {
          key: 1,
          field: 'd',
          before: new Date(2026, 0, 1),
          after: new Date(2026, 0, 1),
        },
      ],
    });
    expect(history.canUndo()).toBe(false);
    history.record({
      source: 'edit',
      records: [{ key: 1, field: 'a', before: 1, after: 2 }],
    });
    history.takeUndo();
    history.record({
      source: 'fill',
      records: [{ key: 1, field: 'a', before: 1, after: 3 }],
    });
    expect(history.canRedo()).toBe(false);
  });

  it('keeps at most `limit` steps', () => {
    const history = new OgeGridEditHistory(rx, 2);
    for (let i = 0; i < 4; i++) {
      history.record({
        source: 'edit',
        records: [{ key: i, field: 'a', before: i, after: i + 1 }],
      });
    }
    expect(history.takeUndo()?.records[0].key).toBe(3);
    expect(history.takeUndo()?.records[0].key).toBe(2);
    expect(history.takeUndo()).toBeNull();
  });
});
