/**
 * The card export model both exporters read: one row per card in board
 * order (column → lane → cell order), plus the CSV builder. CSV goes through
 * core's `buildCsv`, so every cell is RFC 4180-quoted and formula-guarded
 * (see SECURITY.md → exports). The `.xlsx` builder is the lazy
 * `@oge-ui/kanban-engine/export-excel` entry. Pure.
 */
import { buildCsv, ogeDateTimeFormat, type CsvColumn } from '@oge-ui/core';
import type {
  KanbanCard,
  KanbanColumnDef,
  KanbanSwimlane,
} from './board-model';
import { kanbanColumnTitle } from './board-view';
import { kanbanChecklistProgress } from './card-ops';
import type { OgeKanbanExportMessages } from './config';

/** One exported card. */
export interface OgeKanbanExportRow {
  readonly key: unknown;
  readonly title: string;
  /** The column's display title. */
  readonly column: string;
  readonly columnKey: string;
  readonly swimlane: string | null;
  readonly description: string;
  readonly tags: readonly string[];
  readonly assignees: readonly string[];
  readonly priority: string | null;
  readonly dueDate: Date | null;
  readonly checklistDone: number;
  readonly checklistTotal: number;
}

/** What `getExportData()` returns: rows, header captions and the locale. */
export interface OgeKanbanExportData {
  readonly rows: readonly OgeKanbanExportRow[];
  readonly messages: OgeKanbanExportMessages;
  readonly locale: string | undefined;
  /** Whether the board maps swimlanes (the column is omitted otherwise). */
  readonly hasSwimlanes: boolean;
}

/** Options of `getExportData()` / the exporters. */
export interface OgeKanbanExportOptions {
  /** Only the cards the filters / search currently show. Default `false`. */
  readonly visibleOnly?: boolean;
}

/** Export rows in board order: column by column, lane by lane. */
export function buildKanbanExportRows<T>(
  lanes: readonly KanbanSwimlane<T>[],
  columns: readonly KanbanColumnDef[],
): OgeKanbanExportRow[] {
  const rows: OgeKanbanExportRow[] = [];
  for (const column of columns) {
    for (const lane of lanes) {
      const cell = lane.columns.find((entry) => entry.column.key === column.key);
      for (const card of cell?.cards ?? []) {
        rows.push(toRow(card, column));
      }
    }
  }
  return rows;
}

function toRow<T>(card: KanbanCard<T>, column: KanbanColumnDef): OgeKanbanExportRow {
  const progress = kanbanChecklistProgress(card.checklist);
  return {
    key: card.key,
    title: card.title,
    column: kanbanColumnTitle(column),
    columnKey: column.key,
    swimlane: card.swimlane,
    description: card.description ?? '',
    tags: card.tags,
    assignees: card.assignees,
    priority: card.priority,
    dueDate: card.dueDate,
    checklistDone: progress.done,
    checklistTotal: progress.total,
  };
}

/** The checklist cell text (`2/5`, empty without items). */
export function kanbanChecklistCell(row: OgeKanbanExportRow): string {
  return row.checklistTotal === 0
    ? ''
    : `${row.checklistDone}/${row.checklistTotal}`;
}

/** Options of {@link buildKanbanCsv}. */
export interface OgeKanbanCsvOptions {
  /** Field separator. Default `,`. */
  readonly separator?: string;
}

/** The cards as CSV text (header row from the export messages). */
export function buildKanbanCsv(
  data: OgeKanbanExportData,
  options: OgeKanbanCsvOptions = {},
): string {
  const m = data.messages;
  const dateFormat = ogeDateTimeFormat(data.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const columns: CsvColumn<OgeKanbanExportRow>[] = [
    { caption: m.key, accessor: (row) => row.key },
    { caption: m.title, accessor: (row) => row.title },
    { caption: m.column, accessor: (row) => row.column },
  ];
  if (data.hasSwimlanes) {
    columns.push({ caption: m.swimlane, accessor: (row) => row.swimlane });
  }
  columns.push(
    { caption: m.description, accessor: (row) => row.description },
    { caption: m.tags, accessor: (row) => row.tags.join('; ') },
    { caption: m.assignees, accessor: (row) => row.assignees.join('; ') },
    { caption: m.priority, accessor: (row) => row.priority },
    {
      caption: m.dueDate,
      accessor: (row) =>
        row.dueDate === null ? null : dateFormat.format(row.dueDate),
    },
    { caption: m.checklist, accessor: (row) => kanbanChecklistCell(row) },
  );
  return buildCsv(data.rows, columns, { separator: options.separator });
}

/**
 * Starts a browser download of `text` (no-op outside a browser). Shared by
 * both layers' `exportToCsv()`.
 */
export function downloadKanbanText(
  text: string,
  fileName: string,
  type = 'text/csv;charset=utf-8',
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  if (typeof URL.createObjectURL !== 'function') return;
  // `buildCsv` already leads with the BOM Excel needs to read UTF-8
  const blob = new Blob([text], { type });
  let url: string;
  try {
    url = URL.createObjectURL(blob);
  } catch {
    return; // environments without object URLs (jsdom) only build the text
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
