import {
  applyMoveToItem,
  deriveColumns,
  filterCards,
  groupBoard,
  normalizeCards,
  orderBetween,
  orderColumns,
  renumberPatches,
  resolveKanbanFields,
  withFieldValue,
  type KanbanFieldExprs,
} from './board-model';

interface Task {
  id: number;
  status: string;
  text: string;
  note?: string;
  hue?: string;
  rank?: number;
  lane?: string;
  labels?: string[];
  owner?: string | string[];
  due?: string;
  weight?: string;
  meta?: { group?: string };
}

const EXPRS: KanbanFieldExprs<Task> = {
  keyExpr: 'id',
  columnExpr: 'status',
  titleExpr: 'text',
  descriptionExpr: 'note',
  colorExpr: 'hue',
  orderExpr: 'rank',
  swimlaneExpr: 'lane',
  tagsExpr: 'labels',
  assigneeExpr: 'owner',
  dueDateExpr: 'due',
  priorityExpr: 'weight',
};

const fields = resolveKanbanFields(EXPRS);

function card(partial: Partial<Task> & { id: number; status: string }): Task {
  return { text: `Task ${partial.id}`, ...partial };
}

describe('resolveKanbanFields', () => {
  it('resolves string exprs to accessors and keeps field names', () => {
    const task = card({ id: 1, status: 'open', rank: 3 });
    expect(fields.key(task)).toBe(1);
    expect(fields.column(task)).toBe('open');
    expect(fields.fieldNames.column).toBe('status');
    expect(fields.fieldNames.order).toBe('rank');
  });

  it('function exprs resolve but have no write-back name', () => {
    const resolved = resolveKanbanFields<Task>({
      ...EXPRS,
      columnExpr: (task) => task.meta?.group,
    });
    expect(
      resolved.column(card({ id: 1, status: 'x', meta: { group: 'g' } })),
    ).toBe('g');
    expect(resolved.fieldNames.column).toBeNull();
  });

  it('dotted paths read nested objects null-safely', () => {
    const resolved = resolveKanbanFields<Task>({
      ...EXPRS,
      columnExpr: 'meta.group',
    });
    expect(
      resolved.column(card({ id: 1, status: 'x', meta: { group: 'g' } })),
    ).toBe('g');
    expect(resolved.column(card({ id: 2, status: 'x' }))).toBeUndefined();
  });
});

describe('normalizeCards', () => {
  it('normalizes every field and preserves the source item', () => {
    const source = card({
      id: 7,
      status: 'doing',
      note: 'n',
      hue: '#f00',
      rank: 2,
      lane: 'team-a',
      labels: ['bug'],
      owner: ['Ada', 'Grace'],
      due: '2026-08-01',
      weight: 'high',
    });
    const [normalized] = normalizeCards([source], fields);
    expect(normalized.key).toBe(7);
    expect(normalized.source).toBe(source);
    expect(normalized.column).toBe('doing');
    expect(normalized.order).toBe(2);
    expect(normalized.swimlane).toBe('team-a');
    expect(normalized.tags).toEqual(['bug']);
    expect(normalized.assignees).toEqual(['Ada', 'Grace']);
    expect(normalized.dueDate?.getFullYear()).toBe(2026);
    expect(normalized.priority).toBe('high');
  });

  it('a single assignee value becomes a one-element list', () => {
    const [normalized] = normalizeCards(
      [card({ id: 1, status: 'x', owner: 'Ada' })],
      fields,
    );
    expect(normalized.assignees).toEqual(['Ada']);
  });

  it('missing column lands in the untitled column, never dropped', () => {
    const [normalized] = normalizeCards(
      [{ id: 1, text: 't' } as unknown as Task],
      fields,
    );
    expect(normalized.column).toBe('');
  });

  it('non-numeric order values fall back to null', () => {
    const [normalized] = normalizeCards(
      [card({ id: 1, status: 'x', rank: Number.NaN })],
      fields,
    );
    expect(normalized.order).toBeNull();
  });
});

describe('deriveColumns / orderColumns', () => {
  it('derives distinct columns in first-seen order when none declared', () => {
    const cards = normalizeCards(
      [
        card({ id: 1, status: 'b' }),
        card({ id: 2, status: 'a' }),
        card({ id: 3, status: 'b' }),
      ],
      fields,
    );
    expect(deriveColumns(undefined, cards).map((c) => c.key)).toEqual([
      'b',
      'a',
    ]);
  });

  it('declared columns win over derivation', () => {
    const cards = normalizeCards([card({ id: 1, status: 'x' })], fields);
    const declared = [{ key: 'todo' }, { key: 'done' }];
    expect(deriveColumns(declared, cards).map((c) => c.key)).toEqual([
      'todo',
      'done',
    ]);
  });

  it('orderColumns applies a persisted order, unknown keys go last', () => {
    const columns = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    expect(orderColumns(columns, ['c', 'a']).map((c) => c.key)).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(orderColumns(columns, undefined).map((c) => c.key)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('groupBoard', () => {
  const columns = [{ key: 'todo' }, { key: 'doing' }];

  it('groups by column, ordered by orderExpr then source index', () => {
    const cards = normalizeCards(
      [
        card({ id: 1, status: 'todo', rank: 5 }),
        card({ id: 2, status: 'todo', rank: 1 }),
        card({ id: 3, status: 'doing' }),
      ],
      fields,
    );
    const [lane] = groupBoard(cards, columns, false);
    expect(lane.key).toBeNull();
    expect(lane.columns[0].cards.map((c) => c.key)).toEqual([2, 1]);
    expect(lane.columns[1].cards.map((c) => c.key)).toEqual([3]);
    expect(lane.count).toBe(3);
  });

  it('without orderExpr the array order is the board order', () => {
    const noOrder = resolveKanbanFields<Task>({
      ...EXPRS,
      orderExpr: undefined,
    });
    const cards = normalizeCards(
      [card({ id: 9, status: 'todo' }), card({ id: 4, status: 'todo' })],
      noOrder,
    );
    const [lane] = groupBoard(cards, columns, false);
    expect(lane.columns[0].cards.map((c) => c.key)).toEqual([9, 4]);
  });

  it('splits swimlanes in first-seen order; every lane gets every column', () => {
    const cards = normalizeCards(
      [
        card({ id: 1, status: 'todo', lane: 'b' }),
        card({ id: 2, status: 'doing', lane: 'a' }),
        card({ id: 3, status: 'todo', lane: 'a' }),
      ],
      fields,
    );
    const lanes = groupBoard(cards, columns, true);
    expect(lanes.map((lane) => lane.key)).toEqual(['b', 'a']);
    expect(lanes[1].columns[0].cards.map((c) => c.key)).toEqual([3]);
    expect(lanes[1].count).toBe(2);
  });

  it('cards in undeclared columns are hidden, not thrown', () => {
    const cards = normalizeCards([card({ id: 1, status: 'archived' })], fields);
    const [lane] = groupBoard(cards, columns, false);
    expect(lane.count).toBe(0);
  });

  it('an empty board still yields one empty lane', () => {
    const lanes = groupBoard([], columns, false);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].columns).toHaveLength(2);
  });
});

describe('filterCards', () => {
  const cards = normalizeCards(
    [
      card({ id: 1, status: 'x', text: 'İzmir deployment', labels: ['infra'] }),
      card({
        id: 2,
        status: 'x',
        text: 'Fix login',
        note: 'crash on café page',
      }),
      card({ id: 3, status: 'x', text: 'Docs', owner: 'Ada' }),
    ],
    fields,
  );

  it('matches fold-insensitively across title, description, tags, assignees', () => {
    expect(filterCards(cards, 'izmir').map((c) => c.key)).toEqual([1]);
    expect(filterCards(cards, 'CAFE').map((c) => c.key)).toEqual([2]);
    expect(filterCards(cards, 'infra').map((c) => c.key)).toEqual([1]);
    expect(filterCards(cards, 'ada').map((c) => c.key)).toEqual([3]);
  });

  it('empty or whitespace query returns the input unchanged', () => {
    expect(filterCards(cards, '  ')).toBe(cards);
  });

  it('extra accessors extend the haystack', () => {
    const found = filterCards(cards, 'x', [(task) => task.status]);
    expect(found).toHaveLength(3);
  });
});

describe('orderBetween / renumberPatches', () => {
  it('computes midpoints and edge steps', () => {
    expect(orderBetween(null, null)).toBe(0);
    expect(orderBetween(null, 5)).toBe(4);
    expect(orderBetween(5, null)).toBe(6);
    expect(orderBetween(1, 2)).toBe(1.5);
  });

  it('returns null when the midpoint has no room', () => {
    expect(orderBetween(1, 1)).toBeNull();
  });

  it('renumberPatches emits only changed orders', () => {
    const cards = normalizeCards(
      [
        card({ id: 1, status: 'x', rank: 0 }),
        card({ id: 2, status: 'x', rank: 7 }),
      ],
      fields,
    );
    const patches = renumberPatches(cards);
    expect(patches).toHaveLength(1);
    expect(patches[0][0].key).toBe(2);
    expect(patches[0][1]).toBe(1);
  });
});

describe('write-back', () => {
  it('withFieldValue clones instead of mutating, dotted paths included', () => {
    const source = card({ id: 1, status: 'x', meta: { group: 'g' } });
    const next = withFieldValue(source, 'meta.group', 'h');
    expect(next.meta?.group).toBe('h');
    expect(source.meta?.group).toBe('g');
    expect(next).not.toBe(source);
  });

  it('applyMoveToItem writes column, swimlane and order via field names', () => {
    const source = card({ id: 1, status: 'todo', lane: 'a', rank: 0 });
    const [normalized] = normalizeCards([source], fields);
    const moved = applyMoveToItem(
      normalized,
      { column: 'doing', swimlane: 'b', index: 0 },
      3.5,
      fields,
    );
    expect(moved.status).toBe('doing');
    expect(moved.lane).toBe('b');
    expect(moved.rank).toBe(3.5);
    expect(source.status).toBe('todo');
  });

  it('function exprs write nothing (no field name)', () => {
    const resolved = resolveKanbanFields<Task>({
      ...EXPRS,
      columnExpr: (task) => task.status,
    });
    const source = card({ id: 1, status: 'todo' });
    const [normalized] = normalizeCards([source], resolved);
    const moved = applyMoveToItem(
      normalized,
      { column: 'doing', swimlane: null, index: 0 },
      null,
      resolved,
    );
    expect(moved.status).toBe('todo');
  });
});
