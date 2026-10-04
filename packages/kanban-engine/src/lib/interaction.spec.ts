import {
  groupBoard,
  normalizeCards,
  resolveKanbanFields,
  type KanbanColumnDef,
} from './board-model';
import {
  commitKanbanMove,
  findKanbanCard,
  isKanbanCardShifted,
  isKanbanMenuAvailable,
  kanbanColumnOrderPreview,
  kanbanDropIndex,
  kanbanKeyboardMove,
  kanbanLogicalKey,
  kanbanNavigationTarget,
  kanbanNewColumn,
  kanbanToolbarAddColumn,
  planKanbanMove,
  toggleKanbanKey,
  type KanbanDragState,
} from './interaction';

interface Task {
  id: number;
  status: string;
  title: string;
  rank?: number;
}

const exprs = {
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
};

const columns: KanbanColumnDef[] = [
  { key: 'todo' },
  { key: 'doing' },
  { key: 'done', allowDrop: false },
];

const data: Task[] = [
  { id: 1, status: 'todo', title: 'A', rank: 0 },
  { id: 2, status: 'todo', title: 'B', rank: 1 },
  { id: 3, status: 'doing', title: 'C', rank: 0 },
];

function board(items: readonly Task[] = data, orderExpr?: string) {
  const fields = resolveKanbanFields<Task>({ ...exprs, orderExpr });
  const lanes = groupBoard(normalizeCards(items, fields), columns, false);
  return { fields, lanes };
}

const never = (): boolean => false;

describe('kanban navigation', () => {
  it('finds cards and roves with the arrows', () => {
    const { lanes } = board();
    const pos = findKanbanCard(lanes, 1);
    expect(pos).toEqual({ laneIndex: 0, columnIndex: 0, cardIndex: 0 });
    expect(findKanbanCard(lanes, 99)).toBeNull();
    const at = pos as NonNullable<typeof pos>;
    expect(kanbanNavigationTarget(lanes, at, 'ArrowDown', never)?.key).toBe(2);
    expect(kanbanNavigationTarget(lanes, at, 'ArrowUp', never)).toBeUndefined();
    expect(kanbanNavigationTarget(lanes, at, 'ArrowRight', never)?.key).toBe(3);
    expect(kanbanNavigationTarget(lanes, at, 'End', never)?.key).toBe(2);
    expect(
      kanbanNavigationTarget(lanes, at, 'ArrowRight', (k) => k === 'doing'),
    ).toBeUndefined();
    expect(kanbanNavigationTarget(lanes, at, 'x', never)).toBeUndefined();
  });

  it('plans Ctrl+Arrow keyboard moves, skipping illegal columns', () => {
    const { lanes } = board();
    const card = lanes[0].columns[0].cards[1];
    const pos = findKanbanCard(lanes, 2) as NonNullable<
      ReturnType<typeof findKanbanCard>
    >;
    expect(
      kanbanKeyboardMove(lanes, columns, card, pos, 'ArrowUp', never),
    ).toEqual({ toColumn: 'todo', toIndex: 0 });
    expect(
      kanbanKeyboardMove(lanes, columns, card, pos, 'ArrowDown', never),
    ).toBeNull();
    expect(
      kanbanKeyboardMove(lanes, columns, card, pos, 'ArrowRight', never),
    ).toEqual({ toColumn: 'doing', toIndex: 1 });
    const doing = lanes[0].columns[1].cards[0];
    const doingPos = findKanbanCard(lanes, 3) as NonNullable<
      ReturnType<typeof findKanbanCard>
    >;
    // done refuses drops, so ArrowRight from doing has nowhere to go
    expect(
      kanbanKeyboardMove(lanes, columns, doing, doingPos, 'ArrowRight', never),
    ).toBeNull();
  });
});

describe('kanban RTL keys', () => {
  it('swaps only the horizontal arrows', () => {
    expect(kanbanLogicalKey('ArrowLeft', true)).toBe('ArrowRight');
    expect(kanbanLogicalKey('ArrowRight', true)).toBe('ArrowLeft');
    expect(kanbanLogicalKey('ArrowUp', true)).toBe('ArrowUp');
    expect(kanbanLogicalKey('ArrowLeft', false)).toBe('ArrowLeft');
  });

  it('mirrors roving and Ctrl+Arrow moves', () => {
    const { lanes } = board();
    const at = findKanbanCard(lanes, 1) as NonNullable<
      ReturnType<typeof findKanbanCard>
    >;
    // the next column sits on the left in RTL
    expect(
      kanbanNavigationTarget(lanes, at, 'ArrowLeft', never, true)?.key,
    ).toBe(3);
    expect(
      kanbanNavigationTarget(lanes, at, 'ArrowRight', never, true),
    ).toBeUndefined();
    const card = lanes[0].columns[0].cards[1];
    const pos = findKanbanCard(lanes, 2) as NonNullable<
      ReturnType<typeof findKanbanCard>
    >;
    expect(
      kanbanKeyboardMove(lanes, columns, card, pos, 'ArrowLeft', never, true),
    ).toEqual({ toColumn: 'doing', toIndex: 1 });
    expect(
      kanbanKeyboardMove(lanes, columns, card, pos, 'ArrowRight', never, true),
    ).toBeNull();
  });
});

describe('kanban move pipeline', () => {
  it('plans nothing for a drop where the card started', () => {
    const { lanes } = board();
    expect(planKanbanMove(lanes, 1, 'todo', 0)).toBeNull();
    expect(planKanbanMove(lanes, 1, 'ghost')).toBeNull();
    expect(planKanbanMove(lanes, 99, 'todo')).toBeNull();
  });

  it('reorders the array when there is no orderExpr', () => {
    const { lanes, fields } = board();
    const plan = planKanbanMove(lanes, 1, 'doing');
    expect(plan).toMatchObject({ fromIndex: 0, toIndex: 1, toColumn: 'doing' });
    const commit = commitKanbanMove(
      data,
      plan as NonNullable<typeof plan>,
      fields,
      {
        hasSwimlanes: false,
        hasOrder: false,
      },
    );
    expect(commit.moved).toMatchObject({ id: 1, status: 'doing' });
    expect(commit.store.map((task) => task.id)).toEqual([2, 3, 1]);
    expect(data[0].status).toBe('todo');
  });

  it('writes a midpoint order with an orderExpr', () => {
    const { lanes, fields } = board(data, 'rank');
    const plan = planKanbanMove(lanes, 3, 'todo', 1);
    const commit = commitKanbanMove(
      data,
      plan as NonNullable<typeof plan>,
      fields,
      {
        hasSwimlanes: false,
        hasOrder: true,
      },
    );
    expect(commit.moved).toMatchObject({ id: 3, status: 'todo', rank: 0.5 });
  });

  it('renumbers the cell when the midpoint has no room', () => {
    const tight: Task[] = [
      { id: 1, status: 'todo', title: 'A', rank: 1 },
      { id: 2, status: 'todo', title: 'B', rank: 1 },
      { id: 3, status: 'doing', title: 'C', rank: 0 },
    ];
    const { lanes, fields } = board(tight, 'rank');
    const plan = planKanbanMove(lanes, 3, 'todo', 1);
    const commit = commitKanbanMove(
      tight,
      plan as NonNullable<typeof plan>,
      fields,
      {
        hasSwimlanes: false,
        hasOrder: true,
      },
    );
    const ranks = commit.store.map((task) => [task.id, task.rank]);
    expect(ranks).toEqual([
      [1, 0],
      [2, 2],
      [3, 1],
    ]);
  });
});

describe('kanban drag arithmetic', () => {
  const { lanes } = board();
  const card = lanes[0].columns[0].cards[0];
  const drag: KanbanDragState<Task> = {
    card,
    column: columns[0],
    fromLane: null,
    fromIndex: 0,
    width: 10,
    height: 10,
    grabX: 0,
    grabY: 0,
    x: 0,
    y: 0,
    target: { lane: null, column: 'todo', index: 1 },
  };

  it('resolves the placeholder slot', () => {
    expect(kanbanDropIndex(drag, null, 'todo')).toBe(1);
    expect(kanbanDropIndex(drag, null, 'doing')).toBeNull();
    expect(kanbanDropIndex(null, null, 'todo')).toBeNull();
  });

  it('shifts cards in display coordinates', () => {
    const b = lanes[0].columns[0].cards[1];
    // B sits at absolute 1, display 0 (A left the flow) → below target 1? no
    expect(isKanbanCardShifted(drag, null, 'todo', 1, b)).toBe(false);
    expect(
      isKanbanCardShifted(
        { ...drag, target: { lane: null, column: 'todo', index: 0 } },
        null,
        'todo',
        1,
        b,
      ),
    ).toBe(true);
    expect(isKanbanCardShifted(drag, null, 'todo', 0, card)).toBe(false);
  });
});

describe('kanban small machines', () => {
  it('toggles keys and previews column orders', () => {
    expect(toggleKanbanKey(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleKanbanKey(['a', 'b'], 'a')).toEqual(['b']);
    expect(kanbanColumnOrderPreview(['a', 'b', 'c'], 0, 2, 'a')).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('validates new column names', () => {
    expect(kanbanNewColumn('  QA ', columns)).toEqual({
      key: 'QA',
      title: 'QA',
    });
    expect(kanbanNewColumn('   ', columns)).toBeNull();
    expect(kanbanNewColumn('todo', columns)).toBeNull();
  });

  it('picks the toolbar add target', () => {
    const all = (): boolean => true;
    expect(kanbanToolbarAddColumn(columns, all, (k) => k === 'todo')).toBe(
      'doing',
    );
    expect(kanbanToolbarAddColumn(columns, () => false, never)).toBe('todo');
    expect(kanbanToolbarAddColumn([], all, never)).toBe('');
  });

  it('decides whether the built-in menu opens', () => {
    const none = { canUpdate: false, canDelete: false };
    expect(isKanbanMenuAvailable(true, false, none)).toBe(false);
    expect(
      isKanbanMenuAvailable(true, false, { ...none, canDelete: true }),
    ).toBe(true);
    expect(isKanbanMenuAvailable(false, true, none)).toBe(true);
    expect(isKanbanMenuAvailable(false, false, none)).toBe(false);
  });
});
