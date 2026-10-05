import {
  groupBoard,
  normalizeCards,
  normalizeKanbanChecklist,
  resolveKanbanFields,
} from './board-model';
import {
  kanbanCellCounts,
  kanbanCellWip,
  kanbanLaneCounts,
  kanbanLaneWip,
} from './board-view';
import {
  canEditKanbanTitle,
  formatKanbanCount,
  kanbanChecklistLabel,
  kanbanChecklistProgress,
  kanbanChecklistToggle,
  kanbanQuickAddItem,
  kanbanTitleUpdate,
} from './card-ops';
import { OGE_DEFAULT_KANBAN_MESSAGES, fillKanbanMessages } from './config';
import { buildKanbanCsv, buildKanbanExportRows } from './export';

interface Task {
  id: number | string;
  status: string;
  title: string;
  lane?: string;
  todo?: unknown;
}

const exprs = {
  keyExpr: 'id',
  columnExpr: 'status',
  titleExpr: 'title',
  descriptionExpr: 'description',
  colorExpr: 'color',
  orderExpr: undefined,
  swimlaneExpr: 'lane',
  tagsExpr: undefined,
  assigneeExpr: undefined,
  dueDateExpr: undefined,
  priorityExpr: undefined,
  checklistExpr: 'todo',
};
const fields = resolveKanbanFields<Task>(exprs);
const messages = fillKanbanMessages(OGE_DEFAULT_KANBAN_MESSAGES);

describe('kanban checklists', () => {
  it('normalizes the accepted shapes', () => {
    expect(
      normalizeKanbanChecklist([
        'plain',
        { text: 'a', done: true },
        { title: 'b', checked: true },
        { title: 'c', completed: false },
        42,
      ]),
    ).toEqual([
      { text: 'plain', done: false },
      { text: 'a', done: true },
      { text: 'b', done: true },
      { text: 'c', done: false },
    ]);
    expect(normalizeKanbanChecklist('nope')).toEqual([]);
  });

  it('reports progress with an ICU plural label', () => {
    const [card] = normalizeCards<Task>(
      [
        {
          id: 1,
          status: 'todo',
          title: 'x',
          todo: [{ text: 'a', done: true }, 'b'],
        },
      ],
      fields,
    );
    expect(kanbanChecklistProgress(card.checklist)).toEqual({
      done: 1,
      total: 2,
    });
    expect(kanbanChecklistLabel(messages.board, card.checklist, 'en')).toBe(
      '1 of 2 checklist items done',
    );
    expect(
      kanbanChecklistLabel(messages.board, [{ text: 'a', done: false }], 'en'),
    ).toBe('0 of 1 checklist item done');
  });

  it('toggles an entry keeping its shape', () => {
    const [card] = normalizeCards<Task>(
      [
        {
          id: 1,
          status: 'todo',
          title: 'x',
          todo: [{ title: 'a', checked: false }, 'b'],
        },
      ],
      fields,
    );
    expect(kanbanChecklistToggle(card, 0, fields)?.todo).toEqual([
      { title: 'a', checked: true },
      'b',
    ]);
    expect(kanbanChecklistToggle(card, 1, fields)?.todo).toEqual([
      { title: 'a', checked: false },
      { text: 'b', done: true },
    ]);
    expect(kanbanChecklistToggle(card, 5, fields)).toBeNull();
    // the source is never mutated
    expect(card.source.todo).toEqual([{ title: 'a', checked: false }, 'b']);
  });
});

describe('kanban inline edits', () => {
  const [card] = normalizeCards<Task>(
    [{ id: 1, status: 'todo', title: 'Old' }],
    fields,
  );

  it('writes a trimmed new title back', () => {
    expect(canEditKanbanTitle(fields)).toBe(true);
    expect(kanbanTitleUpdate(card, '  New  ', fields)?.title).toBe('New');
    expect(kanbanTitleUpdate(card, 'Old', fields)).toBeNull();
    expect(kanbanTitleUpdate(card, '   ', fields)).toBeNull();
    const fnFields = resolveKanbanFields<Task>({
      ...exprs,
      titleExpr: (t: Task) => t.title,
    });
    expect(canEditKanbanTitle(fnFields)).toBe(false);
    expect(kanbanTitleUpdate(card, 'New', fnFields)).toBeNull();
  });

  it('builds a quick-add item into the column and lane', () => {
    expect(kanbanQuickAddItem<Task>(' Hi ', 'doing', 'Web', fields, 3)).toEqual(
      {
        id: 'oge-card-3',
        title: 'Hi',
        status: 'doing',
        lane: 'Web',
      },
    );
    expect(kanbanQuickAddItem<Task>(' ', 'doing', null, fields, 4)).toBeNull();
  });

  it('formats ICU counts', () => {
    expect(
      formatKanbanCount(
        messages.announcements.cardsMoved,
        { count: 3, column: 'Done' },
        'en',
      ),
    ).toBe('3 cards moved to Done');
    expect(
      formatKanbanCount(messages.board.dragCount, { count: 1 }, 'en'),
    ).toBe('1 card');
  });
});

describe('kanban swimlane WIP', () => {
  const cards = normalizeCards<Task>(
    [
      { id: 1, status: 'doing', title: 'a', lane: 'A' },
      { id: 2, status: 'doing', title: 'b', lane: 'A' },
      { id: 3, status: 'doing', title: 'c', lane: 'B' },
    ],
    fields,
  );

  it('counts cells and lanes', () => {
    const cellCounts = kanbanCellCounts(cards, true);
    const column = { key: 'doing', swimlaneWipLimit: 1 };
    expect(kanbanCellWip(column, 'A', cellCounts, true)?.exceeded).toBe(true);
    expect(kanbanCellWip(column, 'B', cellCounts, true)?.exceeded).toBe(false);
    expect(kanbanCellWip({ key: 'doing' }, 'A', cellCounts, true)).toBeNull();
    expect(kanbanCellWip(column, null, cellCounts, false)).toBeNull();
    const laneCounts = kanbanLaneCounts(cards);
    expect(kanbanLaneWip('A', { A: 1 }, laneCounts)).toMatchObject({
      count: 2,
      limit: 1,
      exceeded: true,
    });
    expect(kanbanLaneWip('B', { A: 1 }, laneCounts)).toBeNull();
    expect(kanbanLaneWip(null, { A: 1 }, laneCounts)).toBeNull();
  });
});

describe('kanban export', () => {
  const cards = normalizeCards<Task>(
    [
      { id: 1, status: 'done', title: '=cmd', lane: 'A' },
      { id: 2, status: 'todo', title: 'b, c', lane: 'B', todo: ['x'] },
      { id: 3, status: 'todo', title: 'a', lane: 'A' },
    ],
    fields,
  );
  const columns = [{ key: 'todo', title: 'To do' }, { key: 'done' }];
  const lanes = groupBoard(cards, columns, true);

  it('orders rows column by column, lane by lane', () => {
    const rows = buildKanbanExportRows(lanes, columns);
    expect(rows.map((row) => row.key)).toEqual([3, 2, 1]);
    expect(rows[1]).toMatchObject({
      column: 'To do',
      columnKey: 'todo',
      swimlane: 'B',
      checklistDone: 0,
      checklistTotal: 1,
    });
  });

  it('writes guarded, quoted CSV', () => {
    const csv = buildKanbanCsv({
      rows: buildKanbanExportRows(lanes, columns),
      messages: messages.export,
      locale: 'en-US',
      hasSwimlanes: true,
    });
    const lines = csv.replace(new RegExp('^\\uFEFF'), '').split(/\r?\n/);
    expect(lines[0]).toBe(
      'Key,Title,Column,Swimlane,Description,Tags,Assignees,Priority,Due date,Checklist',
    );
    expect(lines[2]).toBe('2,"b, c",To do,B,,,,,,0/1');
    expect(lines[3].startsWith("1,'=cmd,done,A")).toBe(true);
  });
});
