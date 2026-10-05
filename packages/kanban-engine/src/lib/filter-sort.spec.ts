import {
  groupBoard,
  normalizeCards,
  resolveKanbanFields,
  type KanbanColumnDef,
} from './board-model';
import {
  applyKanbanFilters,
  compileKanbanFilter,
  isKanbanFilterChipActive,
  isKanbanFilterEmpty,
  kanbanActiveSort,
  kanbanColumnSortSpec,
  kanbanFilterChoices,
  kanbanPriorityRank,
  setKanbanColumnSort,
  sortKanbanLanes,
  toggleKanbanFilterChip,
} from './filter-sort';

interface Task {
  id: number;
  status: string;
  title: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  due?: Date;
  lane?: string;
}

const fields = resolveKanbanFields<Task>({
  keyExpr: 'id',
  columnExpr: 'status',
  titleExpr: 'title',
  descriptionExpr: 'description',
  colorExpr: 'color',
  orderExpr: undefined,
  swimlaneExpr: 'lane',
  tagsExpr: 'tags',
  assigneeExpr: 'owner',
  dueDateExpr: 'due',
  priorityExpr: 'priority',
});

const tasks: Task[] = [
  {
    id: 1,
    status: 'todo',
    title: 'Banana',
    tags: ['bug'],
    owner: 'Ada',
    priority: 'low',
    due: new Date(2026, 0, 10),
    lane: 'A',
  },
  {
    id: 2,
    status: 'todo',
    title: 'apple',
    tags: ['feature', 'ui'],
    owner: 'Grace',
    priority: 'high',
    lane: 'B',
  },
  {
    id: 3,
    status: 'todo',
    title: 'Cherry',
    priority: 'medium',
    due: new Date(2026, 0, 5),
    lane: 'A',
  },
  { id: 4, status: 'done', title: 'Date', tags: ['bug'], owner: 'Ada' },
];
const cards = normalizeCards(tasks, fields);
const columns: KanbanColumnDef[] = [{ key: 'todo' }, { key: 'done' }];

const keys = (list: readonly { key: unknown }[]) => list.map((c) => c.key);

describe('kanban filter', () => {
  it('treats an empty expression as no filter', () => {
    expect(isKanbanFilterEmpty({})).toBe(true);
    expect(isKanbanFilterEmpty({ tags: [] })).toBe(true);
    expect(isKanbanFilterEmpty({ overdue: false })).toBe(false);
    expect(compileKanbanFilter({})).toBeNull();
    expect(compileKanbanFilter(undefined)).toBeNull();
  });

  it('ORs values within a field and ANDs across fields', () => {
    const test = compileKanbanFilter<Task>({
      tags: ['bug', 'ui'],
      assignees: ['Ada'],
    });
    expect(keys(applyKanbanFilters(cards, [test]))).toEqual([1, 4]);
  });

  it('matches priorities, columns, swimlanes and text', () => {
    expect(
      keys(
        applyKanbanFilters(cards, [
          compileKanbanFilter({ priorities: ['high'] }),
        ]),
      ),
    ).toEqual([2]);
    expect(
      keys(
        applyKanbanFilters(cards, [compileKanbanFilter({ columns: ['done'] })]),
      ),
    ).toEqual([4]);
    expect(
      keys(
        applyKanbanFilters(cards, [compileKanbanFilter({ swimlanes: ['A'] })]),
      ),
    ).toEqual([1, 3]);
    expect(
      keys(applyKanbanFilters(cards, [compileKanbanFilter({ text: 'GRACE' })])),
    ).toEqual([2]);
  });

  it('filters overdue cards against an injected today', () => {
    const now = new Date(2026, 0, 8);
    const overdue = compileKanbanFilter<Task>({ overdue: true }, now);
    expect(keys(applyKanbanFilters(cards, [overdue]))).toEqual([3]);
  });

  it('accepts a predicate and keeps the input array when nothing filters', () => {
    expect(applyKanbanFilters(cards, [null])).toBe(cards);
    const byId = compileKanbanFilter<Task>((card) => card.key === 2);
    expect(keys(applyKanbanFilters(cards, [byId, null]))).toEqual([2]);
  });

  it('collects chip choices and toggles chips immutably', () => {
    const choices = kanbanFilterChoices(cards);
    expect(choices.tags).toEqual(['bug', 'feature', 'ui']);
    expect(choices.assignees).toEqual(['Ada', 'Grace']);
    expect(choices.priorities).toEqual(['low', 'high', 'medium']);
    const start = {};
    const on = toggleKanbanFilterChip(start, 'tags', 'bug');
    expect(start).toEqual({});
    expect(isKanbanFilterChipActive(on, 'tags', 'bug')).toBe(true);
    const off = toggleKanbanFilterChip(on, 'tags', 'bug');
    expect(off.tags).toEqual([]);
  });
});

describe('kanban column sort', () => {
  const lanes = groupBoard(cards, columns, false);
  const todo = (sorted: ReturnType<typeof sortKanbanLanes<Task>>) =>
    keys(sorted[0].columns[0].cards);

  it('returns the lanes unchanged without a sort', () => {
    expect(sortKanbanLanes(lanes, undefined)).toBe(lanes);
    expect(sortKanbanLanes(lanes, {})).toBe(lanes);
    expect(sortKanbanLanes(lanes, { todo: { field: 'order' } })[0]).toBe(
      lanes[0],
    );
  });

  it('sorts by title case-insensitively in both directions', () => {
    expect(todo(sortKanbanLanes(lanes, { todo: { field: 'title' } }))).toEqual([
      2, 1, 3,
    ]);
    expect(
      todo(
        sortKanbanLanes(lanes, { todo: { field: 'title', direction: 'desc' } }),
      ),
    ).toEqual([3, 1, 2]);
  });

  it('sorts by priority rank (most important first ascending)', () => {
    expect(
      todo(sortKanbanLanes(lanes, { '*': { field: 'priority' } })),
    ).toEqual([2, 3, 1]);
    expect(kanbanPriorityRank('HIGH')).toBeLessThan(kanbanPriorityRank('low'));
    expect(kanbanPriorityRank('5')).toBeLessThan(kanbanPriorityRank('2'));
    expect(kanbanPriorityRank(null)).toBe(Number.POSITIVE_INFINITY);
  });

  it('sorts by due date with empty dates last', () => {
    expect(
      todo(sortKanbanLanes(lanes, { todo: { field: 'dueDate' } })),
    ).toEqual([3, 1, 2]);
    expect(
      todo(
        sortKanbanLanes(lanes, {
          todo: { field: 'dueDate', direction: 'desc' },
        }),
      ),
    ).toEqual([1, 3, 2]);
  });

  it('accepts a comparator', () => {
    const sorted = sortKanbanLanes<Task>(lanes, {
      todo: (a, b) => Number(b.key) - Number(a.key),
    });
    expect(todo(sorted)).toEqual([3, 2, 1]);
  });

  it('sets, clears and reports a column sort', () => {
    const sort = setKanbanColumnSort(undefined, 'todo', 'title', 'desc');
    expect(kanbanActiveSort(sort, 'todo')).toEqual({
      field: 'title',
      direction: 'desc',
    });
    expect(kanbanActiveSort(sort, 'done')).toEqual({
      field: 'order',
      direction: 'asc',
    });
    expect(setKanbanColumnSort(sort, 'todo', 'order', 'asc')).toEqual({});
    expect(kanbanColumnSortSpec({ '*': { field: 'title' } }, 'x')).toEqual({
      field: 'title',
    });
  });
});
