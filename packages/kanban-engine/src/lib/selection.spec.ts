import { groupBoard, normalizeCards, resolveKanbanFields } from './board-model';
import {
  kanbanAnchorIndex,
  kanbanBoardOrder,
  kanbanCarriedCards,
  kanbanMultiMoveAnchor,
  kanbanOrderKeys,
  kanbanSelectCard,
  kanbanSelectCell,
  kanbanSelectionShortcut,
} from './selection';

interface Task {
  id: number;
  status: string;
  title: string;
}

const fields = resolveKanbanFields<Task>({
  keyExpr: 'id',
  columnExpr: 'status',
  titleExpr: 'title',
  descriptionExpr: 'description',
  colorExpr: 'color',
  orderExpr: undefined,
  swimlaneExpr: undefined,
  tagsExpr: undefined,
  assigneeExpr: undefined,
  dueDateExpr: undefined,
  priorityExpr: undefined,
});

const tasks: Task[] = [
  { id: 1, status: 'todo', title: 'a' },
  { id: 2, status: 'todo', title: 'b' },
  { id: 3, status: 'todo', title: 'c' },
  { id: 4, status: 'done', title: 'd' },
  { id: 5, status: 'done', title: 'e' },
];
const cards = normalizeCards(tasks, fields);
const lanes = groupBoard(cards, [{ key: 'todo' }, { key: 'done' }], false);
const none = { toggle: false, range: false };

describe('kanban selection', () => {
  it('orders keys by the board', () => {
    expect(kanbanBoardOrder(lanes)).toEqual([1, 2, 3, 4, 5]);
    expect(kanbanOrderKeys(lanes, [5, 1, 99])).toEqual([1, 5]);
  });

  it('selects one card on a plain click and in single mode', () => {
    const start = { keys: [1, 2], anchor: 1 };
    expect(kanbanSelectCard(lanes, start, 3, none, 'multiple')).toEqual({
      keys: [3],
      anchor: 3,
    });
    expect(
      kanbanSelectCard(
        lanes,
        start,
        3,
        { toggle: true, range: false },
        'single',
      ),
    ).toEqual({ keys: [3], anchor: 3 });
  });

  it('toggles with Ctrl', () => {
    const one = { keys: [1], anchor: 1 };
    const two = kanbanSelectCard(
      lanes,
      one,
      4,
      { toggle: true, range: false },
      'multiple',
    );
    expect(two.keys).toEqual([1, 4]);
    const back = kanbanSelectCard(
      lanes,
      two,
      1,
      { toggle: true, range: false },
      'multiple',
    );
    expect(back.keys).toEqual([4]);
  });

  it('selects a range in the anchor cell with Shift', () => {
    const range = kanbanSelectCard(
      lanes,
      { keys: [1], anchor: 1 },
      3,
      { toggle: false, range: true },
      'multiple',
    );
    expect(range).toEqual({ keys: [1, 2, 3], anchor: 1 });
    // across cells: falls back to the clicked card
    expect(
      kanbanSelectCard(
        lanes,
        { keys: [1], anchor: 1 },
        5,
        { toggle: false, range: true },
        'multiple',
      ).keys,
    ).toEqual([5]);
  });

  it('selects a whole cell', () => {
    expect(kanbanSelectCell(lanes, 4)).toEqual({ keys: [4, 5], anchor: 4 });
    expect(kanbanSelectCell(lanes, 99)).toBeNull();
  });

  it('carries the selection only when the dragged card is in it', () => {
    const card = lanes[0].columns[0].cards[1];
    expect(kanbanCarriedCards(lanes, card, [5, 2]).map((c) => c.key)).toEqual([
      2, 5,
    ]);
    expect(kanbanCarriedCards(lanes, card, [1, 3]).map((c) => c.key)).toEqual([
      2,
    ]);
  });

  it('anchors a multi-move before the first non-moving card', () => {
    const todo = lanes[0].columns[0].cards;
    // drag card 1 (excluded) with 2 to index 0 of the flow [2, 3]
    expect(kanbanMultiMoveAnchor(todo, 0, [1, 2], 1)).toBe(3);
    expect(kanbanMultiMoveAnchor(todo, 2, [1], 1)).toBeNull();
    expect(kanbanAnchorIndex(todo, 3, 1)).toBe(1);
    expect(kanbanAnchorIndex(todo, null, 1)).toBe(2);
  });

  it('decides keyboard selection shortcuts', () => {
    const key = (k: string, mods: Partial<Record<string, boolean>> = {}) => ({
      key: k,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...mods,
    });
    expect(
      kanbanSelectionShortcut(key('a', { ctrlKey: true }), 'multiple', 1),
    ).toBe('select-cell');
    expect(
      kanbanSelectionShortcut(key(' ', { ctrlKey: true }), 'multiple', 1),
    ).toBe('toggle');
    expect(
      kanbanSelectionShortcut(
        key('ArrowDown', { shiftKey: true }),
        'multiple',
        1,
      ),
    ).toBe('extend-down');
    expect(kanbanSelectionShortcut(key('Escape'), 'multiple', 2)).toBe('clear');
    expect(kanbanSelectionShortcut(key('Escape'), 'multiple', 1)).toBeNull();
    expect(
      kanbanSelectionShortcut(key('a', { ctrlKey: true }), 'single', 1),
    ).toBeNull();
  });
});
