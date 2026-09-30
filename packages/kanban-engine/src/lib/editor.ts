/**
 * The card editor's model: the working shape the dialog edits (independent of
 * the user's item shape), the default form items, the choice lists built from
 * the board, and the write-back from a saved model onto a user item. Both
 * render layers open the same form over the same model. Pure.
 */
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import {
  withFieldValue,
  type KanbanCard,
  type KanbanColumnDef,
  type ResolvedKanbanFields,
} from './board-model';
import type { OgeKanbanDialogMessages } from './config';

/** The editor's working model (independent of the user's item shape). */
export interface KanbanEditorModel {
  title: string;
  description: string;
  column: string;
  swimlane: string | null;
  color: string | undefined;
  tags: string[];
  assignees: string[];
  dueDate: Date | null;
  priority: string | null;
}

/** The dialog's save payload. */
export interface KanbanEditorResult {
  readonly model: KanbanEditorModel;
  readonly isNew: boolean;
}

/**
 * Choice lists the default form offers (built from the board). The `has*`
 * flags mirror which `*Expr` inputs are actually configured — the default
 * form only renders editors for fields the board can persist.
 */
export interface KanbanEditorChoices {
  readonly columns: readonly { value: string; text: string }[];
  readonly swimlanes: readonly string[];
  readonly tags: readonly string[];
  readonly assignees: readonly string[];
  readonly priorities: readonly string[];
  readonly hasSwimlanes: boolean;
  readonly hasTags: boolean;
  readonly hasAssignees: boolean;
  readonly hasDueDate: boolean;
  readonly hasPriority: boolean;
  readonly hasColor: boolean;
  readonly hasDescription: boolean;
}

/** The choices before a board has reported any (the dialog's initial input). */
export const KANBAN_EMPTY_EDITOR_CHOICES: KanbanEditorChoices = {
  columns: [],
  swimlanes: [],
  tags: [],
  assignees: [],
  priorities: [],
  hasSwimlanes: false,
  hasTags: false,
  hasAssignees: false,
  hasDueDate: false,
  hasPriority: false,
  hasColor: true,
  hasDescription: true,
};

/** Which optional `*Expr` inputs a board has configured. */
export interface KanbanMappedFields {
  readonly hasSwimlanes: boolean;
  readonly hasTags: boolean;
  readonly hasAssignees: boolean;
  readonly hasDueDate: boolean;
  readonly hasPriority: boolean;
}

/**
 * The default editor items. Only fields the board maps (`has*` flags) render —
 * an editor whose value could never persist back would be a lie.
 */
export function buildKanbanEditorItems(
  messages: OgeKanbanDialogMessages,
  choices: KanbanEditorChoices,
): OgeFormItemDataBase[] {
  const items: OgeFormItemDataBase[] = [
    {
      field: 'title',
      label: messages.titleLabel,
      placeholder: messages.titlePlaceholder,
      isRequired: true,
      colSpan: 2,
      validationRules: [
        {
          type: 'custom',
          validate: (context) => {
            const data = context.data as unknown as KanbanEditorModel;
            return data.title.trim() === '' ? messages.titleRequired : null;
          },
        },
      ],
    },
  ];
  if (choices.hasDescription) {
    items.push({
      field: 'description',
      label: messages.descriptionLabel,
      editorType: 'textArea',
      editorOptions: { rows: 3, autoResize: true },
      colSpan: 2,
    });
  }
  items.push({
    field: 'column',
    label: messages.columnLabel,
    editorType: 'selectBox',
    editorOptions: {
      items: choices.columns as unknown as readonly unknown[],
      valueExpr: 'value',
      displayExpr: 'text',
    },
    colSpan: choices.hasSwimlanes ? 1 : 2,
  });
  if (choices.hasSwimlanes) {
    items.push({
      field: 'swimlane',
      label: messages.swimlaneLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: choices.swimlanes as readonly unknown[],
        acceptCustomValue: true,
      },
    });
  }
  if (choices.hasDueDate) {
    items.push({
      field: 'dueDate',
      label: messages.dueDateLabel,
      editorType: 'dateBox',
      editorOptions: { type: 'date', showClearButton: true },
    });
  }
  if (choices.hasPriority) {
    items.push({
      field: 'priority',
      label: messages.priorityLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: choices.priorities as readonly unknown[],
        showClearButton: true,
        acceptCustomValue: true,
      },
    });
  }
  if (choices.hasTags) {
    items.push({
      field: 'tags',
      label: messages.tagsLabel,
      editorType: 'tagBox',
      editorOptions: {
        items: choices.tags as readonly unknown[],
        acceptCustomValue: true,
      },
      colSpan: 2,
    });
  }
  if (choices.hasAssignees) {
    items.push({
      field: 'assignees',
      label: messages.assigneesLabel,
      editorType: 'tagBox',
      editorOptions: {
        items: choices.assignees as readonly unknown[],
        acceptCustomValue: true,
      },
      colSpan: 2,
    });
  }
  if (choices.hasColor) {
    items.push({
      field: 'color',
      label: messages.colorLabel,
      editorType: 'colorBox',
      colSpan: 2,
    });
  }
  return items;
}

/** Choice lists for the default form, built from the current board. */
export function buildKanbanEditorChoices<T>(
  cards: readonly KanbanCard<T>[],
  columns: readonly KanbanColumnDef[],
  fields: ResolvedKanbanFields<T>,
  mapped: KanbanMappedFields,
): KanbanEditorChoices {
  const distinct = (values: readonly string[]): readonly string[] =>
    Array.from(new Set(values));
  return {
    columns: columns.map((column) => ({
      value: column.key,
      text: column.title ?? column.key,
    })),
    swimlanes: mapped.hasSwimlanes
      ? distinct(
          cards
            .map((card) => card.swimlane)
            .filter((lane): lane is string => lane !== null),
        )
      : [],
    tags: distinct(cards.flatMap((card) => [...card.tags])),
    assignees: distinct(cards.flatMap((card) => [...card.assignees])),
    priorities: distinct(
      cards
        .map((card) => card.priority)
        .filter((priority): priority is string => priority !== null),
    ),
    hasSwimlanes: mapped.hasSwimlanes,
    hasTags: mapped.hasTags,
    hasAssignees: mapped.hasAssignees,
    hasDueDate: mapped.hasDueDate,
    hasPriority: mapped.hasPriority,
    // description/color have default field names — writable unless the
    // expr was replaced by a getter function (no write-back name)
    hasDescription: fields.fieldNames.description !== null,
    hasColor: fields.fieldNames.color !== null,
  };
}

/** The editor model for an existing card. */
export function kanbanEditorModelFrom<T>(
  card: KanbanCard<T>,
): KanbanEditorModel {
  return {
    title: card.title,
    description: card.description ?? '',
    column: card.column,
    swimlane: card.swimlane,
    color: card.color,
    tags: [...card.tags],
    assignees: [...card.assignees],
    dueDate: card.dueDate,
    priority: card.priority,
  };
}

/** A blank editor model prefilled into `column` / `swimlane`. */
export function newKanbanEditorModel(
  column: string,
  swimlane: string | null,
): KanbanEditorModel {
  return {
    title: '',
    description: '',
    column,
    swimlane,
    color: undefined,
    tags: [],
    assignees: [],
    dueDate: null,
    priority: null,
  };
}

/**
 * Writes the editor model onto `base` through the write-back field names.
 * Function exprs have no field name — those fields are skipped, and so are
 * the optional fields the board does not map.
 */
export function buildKanbanItem<T>(
  model: KanbanEditorModel,
  base: T,
  fields: ResolvedKanbanFields<T>,
  mapped: KanbanMappedFields,
): T {
  const names = fields.fieldNames;
  let item = base;
  const write = (name: string | null, value: unknown): void => {
    if (name !== null) item = withFieldValue(item, name, value);
  };
  write(names.title, model.title);
  write(names.description, model.description);
  write(names.column, model.column);
  if (mapped.hasSwimlanes) write(names.swimlane, model.swimlane);
  write(names.color, model.color);
  if (mapped.hasTags) write(names.tags, model.tags);
  if (mapped.hasAssignees) write(names.assignee, model.assignees);
  if (mapped.hasDueDate) write(names.dueDate, model.dueDate);
  if (mapped.hasPriority) write(names.priority, model.priority);
  return item;
}

/**
 * The base item for a card created in the dialog: the key field (when the key
 * is a field name) set to a session-unique `oge-card-<n>`.
 */
export function newKanbanItemBase<T>(
  fields: ResolvedKanbanFields<T>,
  counter: number,
): T {
  const key = fields.fieldNames.key;
  let base = {} as T;
  if (key !== null) base = withFieldValue(base, key, `oge-card-${counter}`);
  return base;
}
