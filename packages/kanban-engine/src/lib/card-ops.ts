/**
 * Card-level write-backs used by the inline affordances — the column-footer
 * quick-add composer, F2 inline title editing and checklist toggles — plus
 * the checklist progress text. Each returns the new item (the source is
 * never mutated) or `null` when the field cannot be written (a function
 * expr has no field name). Pure.
 */
import { ogeFormatMessage } from '@oge-ui/core';
import {
  withFieldValue,
  type KanbanCard,
  type KanbanChecklistItem,
  type ResolvedKanbanFields,
} from './board-model';
import type { OgeKanbanBoardMessages } from './config';
import { newKanbanItemBase } from './editor';

/** Whether inline title editing can write the title back. */
export function canEditKanbanTitle<T>(fields: ResolvedKanbanFields<T>): boolean {
  return fields.fieldNames.title !== null;
}

/**
 * The card's item with a new title, or `null` when the title is blank,
 * unchanged, or not writable.
 */
export function kanbanTitleUpdate<T>(
  card: KanbanCard<T>,
  title: string,
  fields: ResolvedKanbanFields<T>,
): T | null {
  const name = fields.fieldNames.title;
  const next = title.trim();
  if (name === null || next === '' || next === card.title) return null;
  return withFieldValue(card.source, name, next);
}

/**
 * The item a quick-add composer creates: a session-unique key (when the key
 * is a field), the title, the column and — on a swimlane board — the lane.
 * `null` for a blank title.
 */
export function kanbanQuickAddItem<T>(
  title: string,
  column: string,
  swimlane: string | null,
  fields: ResolvedKanbanFields<T>,
  counter: number,
): T | null {
  const text = title.trim();
  if (text === '') return null;
  const names = fields.fieldNames;
  let item = newKanbanItemBase<T>(fields, counter);
  if (names.title !== null) item = withFieldValue(item, names.title, text);
  if (names.column !== null) item = withFieldValue(item, names.column, column);
  if (swimlane !== null && names.swimlane !== null) {
    item = withFieldValue(item, names.swimlane, swimlane);
  }
  return item;
}

/** Done / total of a checklist. */
export function kanbanChecklistProgress(
  checklist: readonly KanbanChecklistItem[],
): { readonly done: number; readonly total: number } {
  let done = 0;
  for (const item of checklist) if (item.done) done++;
  return { done, total: checklist.length };
}

/** The checklist badge's accessible text (ICU plural over `total`). */
export function kanbanChecklistLabel(
  messages: Required<OgeKanbanBoardMessages>,
  checklist: readonly KanbanChecklistItem[],
  locale?: string,
): string {
  const { done, total } = kanbanChecklistProgress(checklist);
  return ogeFormatMessage(messages.checklistProgress, { done, total }, locale);
}

/**
 * The card's item with checklist entry `index` toggled — the raw entry's
 * own shape is kept (`done` / `checked` / `completed`; a plain string
 * becomes `{ text, done: true }`). `null` when not writable or out of range.
 */
export function kanbanChecklistToggle<T>(
  card: KanbanCard<T>,
  index: number,
  fields: ResolvedKanbanFields<T>,
): T | null {
  const name = fields.fieldNames.checklist;
  if (name === null || fields.checklist === undefined) return null;
  const raw = fields.checklist(card.source);
  if (!Array.isArray(raw) || index < 0 || index >= raw.length) return null;
  const next = raw.map((entry: unknown, i: number) => {
    if (i !== index) return entry;
    if (typeof entry === 'string') return { text: entry, done: true };
    if (typeof entry !== 'object' || entry === null) return entry;
    const record = entry as Record<string, unknown>;
    const flag =
      'done' in record
        ? 'done'
        : 'checked' in record
          ? 'checked'
          : 'completed' in record
            ? 'completed'
            : 'done';
    return { ...record, [flag]: record[flag] !== true };
  });
  return withFieldValue(card.source, name, next);
}

/** Formats an ICU announcement / badge template of the catalog. */
export function formatKanbanCount(
  template: string,
  values: Readonly<Record<string, string | number>>,
  locale?: string,
): string {
  return ogeFormatMessage(template, values, locale);
}
