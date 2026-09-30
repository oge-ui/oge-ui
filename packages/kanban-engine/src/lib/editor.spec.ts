import { normalizeCards, resolveKanbanFields } from './board-model';
import { OGE_DEFAULT_KANBAN_MESSAGES } from './config';
import {
  KANBAN_EMPTY_EDITOR_CHOICES,
  buildKanbanEditorChoices,
  buildKanbanEditorItems,
  buildKanbanItem,
  kanbanEditorModelFrom,
  newKanbanEditorModel,
  newKanbanItemBase,
} from './editor';

interface Task {
  id: number | string;
  status: string;
  title: string;
  lane?: string;
  tags?: string[];
  owner?: string | string[];
  prio?: string;
}

const exprs = {
  keyExpr: 'id',
  columnExpr: 'status',
  titleExpr: 'title',
  descriptionExpr: 'description',
  colorExpr: 'color',
  orderExpr: undefined,
  swimlaneExpr: 'lane',
  tagsExpr: 'tags',
  assigneeExpr: 'owner',
  dueDateExpr: undefined,
  priorityExpr: 'prio',
} as const;

const mappedAll = {
  hasSwimlanes: true,
  hasTags: true,
  hasAssignees: true,
  hasDueDate: false,
  hasPriority: true,
};

describe('kanban editor model', () => {
  const fields = resolveKanbanFields<Task>(exprs);
  const cards = normalizeCards<Task>(
    [
      {
        id: 1,
        status: 'todo',
        title: 'A',
        lane: 'Web',
        tags: ['x'],
        owner: 'Ada',
        prio: 'high',
      },
      { id: 2, status: 'doing', title: 'B', lane: 'Web', tags: ['x', 'y'] },
    ],
    fields,
  );

  it('renders only the editors the board maps', () => {
    const minimal = buildKanbanEditorItems(
      OGE_DEFAULT_KANBAN_MESSAGES.dialog,
      KANBAN_EMPTY_EDITOR_CHOICES,
    );
    expect(minimal.map((item) => item.field)).toEqual([
      'title',
      'description',
      'column',
      'color',
    ]);
    const full = buildKanbanEditorItems(OGE_DEFAULT_KANBAN_MESSAGES.dialog, {
      ...KANBAN_EMPTY_EDITOR_CHOICES,
      ...mappedAll,
      hasDueDate: true,
    });
    expect(full.map((item) => item.field)).toEqual([
      'title',
      'description',
      'column',
      'swimlane',
      'dueDate',
      'priority',
      'tags',
      'assignees',
      'color',
    ]);
  });

  it('the title rule rejects a blank title with the catalog message', () => {
    const [title] = buildKanbanEditorItems(
      OGE_DEFAULT_KANBAN_MESSAGES.dialog,
      KANBAN_EMPTY_EDITOR_CHOICES,
    );
    const rule = title.validationRules?.[0];
    expect(rule?.type).toBe('custom');
    const validate = (rule as { validate: (c: unknown) => unknown }).validate;
    expect(validate({ data: { title: '  ' } })).toBe('A title is required');
    expect(validate({ data: { title: 'ok' } })).toBeNull();
  });

  it('builds distinct choice lists from the board', () => {
    const choices = buildKanbanEditorChoices(
      cards,
      [{ key: 'todo', title: 'To do' }, { key: 'doing' }],
      fields,
      mappedAll,
    );
    expect(choices.columns).toEqual([
      { value: 'todo', text: 'To do' },
      { value: 'doing', text: 'doing' },
    ]);
    expect(choices.swimlanes).toEqual(['Web']);
    expect(choices.tags).toEqual(['x', 'y']);
    expect(choices.assignees).toEqual(['Ada']);
    expect(choices.priorities).toEqual(['high']);
    expect(choices.hasDescription).toBe(true);
  });

  it('a getter expr has no write-back name, so its editor is hidden', () => {
    const getterFields = resolveKanbanFields<Task>({
      ...exprs,
      descriptionExpr: () => 'computed',
    });
    const choices = buildKanbanEditorChoices(
      cards,
      [],
      getterFields,
      mappedAll,
    );
    expect(choices.hasDescription).toBe(false);
  });

  it('round-trips a card through the editor model onto the item', () => {
    const model = kanbanEditorModelFrom(cards[0]);
    expect(model).toMatchObject({
      title: 'A',
      column: 'todo',
      swimlane: 'Web',
    });
    model.title = 'A2';
    model.column = 'doing';
    const updated = buildKanbanItem(model, cards[0].source, fields, mappedAll);
    expect(updated).toMatchObject({ id: 1, title: 'A2', status: 'doing' });
    expect(cards[0].source.title).toBe('A');
  });

  it('skips unmapped optional fields on write-back', () => {
    const model = newKanbanEditorModel('todo', 'Web');
    model.title = 'New';
    const item = buildKanbanItem(model, {} as Task, fields, {
      ...mappedAll,
      hasSwimlanes: false,
      hasTags: false,
    });
    expect(item).not.toHaveProperty('lane');
    expect(item).not.toHaveProperty('tags');
    expect(item).toMatchObject({ title: 'New', status: 'todo' });
  });

  it('keys a dialog-created item with a session counter', () => {
    expect(newKanbanItemBase<Task>(fields, 3)).toEqual({ id: 'oge-card-3' });
    const getterKey = resolveKanbanFields<Task>({
      ...exprs,
      keyExpr: (task: Task) => task.id,
    });
    expect(newKanbanItemBase<Task>(getterKey, 3)).toEqual({});
  });
});
