import {
  groupBoard,
  normalizeCards,
  resolveKanbanFields,
  type KanbanColumnDef,
} from './board-model';
import {
  KANBAN_CARD_GAP,
  formatKanbanMessage,
  isKanbanLegalTarget,
  isKanbanOverdue,
  kanbanCardLabel,
  kanbanCardShortcuts,
  kanbanCellKey,
  kanbanCellLabel,
  kanbanCellWindow,
  kanbanColumnCounts,
  kanbanColumnWip,
  kanbanFocusableKeys,
  kanbanGridTemplate,
  kanbanInitials,
  kanbanMoveTargets,
  kanbanScrollIntoViewTop,
  resolveKanbanColumns,
} from './board-view';
import { OGE_DEFAULT_KANBAN_MESSAGES } from './config';

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

const cards = normalizeCards<Task>(
  [
    { id: 1, status: 'todo', title: 'A' },
    { id: 2, status: 'todo', title: 'B' },
    { id: 3, status: 'done', title: 'C' },
  ],
  fields,
);

describe('resolveKanbanColumns', () => {
  const base = {
    declared: undefined,
    seenDerived: [],
    cards,
    runtime: [],
    preview: null,
    columnOrder: [],
  };

  it('derives columns and reports the set to remember', () => {
    const result = resolveKanbanColumns(base);
    expect(result.columns.map((c) => c.key)).toEqual(['todo', 'done']);
    expect(result.nextSeenDerived?.map((c) => c.key)).toEqual(['todo', 'done']);
  });

  it('keeps a remembered column after its last card left', () => {
    const result = resolveKanbanColumns({
      ...base,
      cards: cards.slice(0, 2),
      seenDerived: [
        { key: 'todo', title: 'todo' },
        { key: 'done', title: 'done' },
      ],
    });
    expect(result.columns.map((c) => c.key)).toEqual(['todo', 'done']);
    expect(result.nextSeenDerived).toBeNull();
  });

  it('declared columns win; runtime columns append; order applies', () => {
    const result = resolveKanbanColumns({
      ...base,
      declared: [{ key: 'todo' }, { key: 'done' }],
      runtime: [{ key: 'qa', title: 'qa' }, { key: 'todo' }],
      columnOrder: ['qa', 'done', 'todo'],
    });
    expect(result.columns.map((c) => c.key)).toEqual(['qa', 'done', 'todo']);
    expect(result.nextSeenDerived).toBeNull();
  });

  it('a live drag preview wins over the persisted order', () => {
    const result = resolveKanbanColumns({
      ...base,
      declared: [{ key: 'todo' }, { key: 'done' }],
      columnOrder: ['todo', 'done'],
      preview: ['done', 'todo'],
    });
    expect(result.columns.map((c) => c.key)).toEqual(['done', 'todo']);
  });
});

describe('board view helpers', () => {
  const columns: KanbanColumnDef[] = [
    { key: 'todo', title: 'To do', wipLimit: 1, transitionColumns: ['doing'] },
    { key: 'doing', title: 'Doing' },
    { key: 'done', title: 'Done', allowDrop: false },
  ];

  it('counts per column and derives WIP', () => {
    const counts = kanbanColumnCounts(cards);
    expect(counts.get('todo')).toBe(2);
    expect(kanbanColumnWip(columns[0], counts)).toMatchObject({
      count: 2,
      limit: 1,
      exceeded: true,
    });
  });

  it('builds the grid tracks', () => {
    expect(kanbanGridTemplate(columns, ['doing'], 300, true)).toBe(
      '300px 44px 300px 300px',
    );
  });

  it('gates interactive targets by allowDrop and transitionColumns', () => {
    expect(isKanbanLegalTarget(columns, 'todo', 'todo')).toBe(true);
    expect(isKanbanLegalTarget(columns, 'todo', 'doing')).toBe(true);
    expect(isKanbanLegalTarget(columns, 'doing', 'done')).toBe(false);
    expect(isKanbanLegalTarget(columns, 'doing', 'todo')).toBe(true);
    expect(isKanbanLegalTarget(columns, 'todo', 'ghost')).toBe(false);
    expect(kanbanMoveTargets(columns, 'doing').map((c) => c.key)).toEqual([
      'todo',
    ]);
  });

  it('formats labels from the catalog', () => {
    const board = OGE_DEFAULT_KANBAN_MESSAGES.board;
    expect(formatKanbanMessage('{a} and {b}', { a: '1', b: '2' })).toBe(
      '1 and 2',
    );
    const counts = kanbanColumnCounts(cards);
    expect(
      kanbanCellLabel(
        board,
        columns[0],
        2,
        kanbanColumnWip(columns[0], counts),
      ),
    ).toBe('To do, 2 of 1 cards');
    expect(
      kanbanCellLabel(
        board,
        columns[1],
        0,
        kanbanColumnWip(columns[1], counts),
      ),
    ).toBe('Doing, 0 cards');
    expect(kanbanCardLabel(board, cards[0], columns)).toBe('A, in To do');
    expect(kanbanCardLabel(board, cards[0], [])).toBe('A, in todo');
  });

  it('card chrome helpers', () => {
    expect(kanbanInitials('Ada Lovelace')).toBe('AL');
    expect(kanbanInitials(' grace ')).toBe('G');
    const now = new Date(2026, 5, 10, 15);
    expect(isKanbanOverdue(new Date(2026, 5, 9), now)).toBe(true);
    expect(isKanbanOverdue(new Date(2026, 5, 10), now)).toBe(false);
    expect(
      kanbanCardShortcuts({ canUpdate: true, canDelete: false, canDrag: true }),
    ).toBe('Enter Control+ArrowLeft Control+ArrowRight');
    expect(
      kanbanCardShortcuts({
        canUpdate: false,
        canDelete: false,
        canDrag: false,
      }),
    ).toBeNull();
  });

  it('keeps one tab stop per non-empty cell', () => {
    const lanes = groupBoard(cards, columns, false);
    expect([...kanbanFocusableKeys(lanes, null)]).toEqual([1, 3]);
    expect([...kanbanFocusableKeys(lanes, 2)]).toEqual([2, 3]);
  });

  it('windows a cell (virtual and not)', () => {
    expect(kanbanCellWindow(undefined, 3, 100, false)).toEqual({
      start: 0,
      end: 3,
      offsetY: 0,
      totalHeight: 3 * (100 + KANBAN_CARD_GAP) - KANBAN_CARD_GAP,
    });
    const win = kanbanCellWindow({ top: 0, height: 0 }, 1000, 100, true);
    expect(win.start).toBe(0);
    expect(win.end).toBeLessThan(20);
    expect(kanbanCellKey(null, 'todo')).toBe(' todo');
  });

  it('scrolls a virtual card into view', () => {
    const state = { top: 0, height: 300 };
    expect(kanbanScrollIntoViewTop(state, 0, 100)).toBeNull();
    expect(kanbanScrollIntoViewTop(state, 5, 100)).toBe(5 * 108 + 100 - 300);
    expect(kanbanScrollIntoViewTop({ top: 500, height: 300 }, 1, 100)).toBe(
      108,
    );
  });
});
