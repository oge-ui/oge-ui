import {
  isGroupInterval,
  sanitizeGridStateSnapshot,
  type FilterExpr,
  type FilterOperator,
  type GridStateSnapshot,
  type GroupDescriptor,
  type SortDescriptor,
} from '@oge-ui/core';
import type { OgeDataType } from '../grid/grid-columns';
import { coerceOgeAiValue } from './ai-coerce';
import type { OgeAiGridColumn, OgeGridAiCapabilities } from './grid-ai-context';
import { OGE_GRID_AI_ALL_CAPABILITIES } from './grid-ai-context';

/** A part of the grid state the assistant changed. */
export type OgeGridAiSlice = 'sort' | 'group' | 'filter' | 'search' | 'columns';

/** Why part of a reply was dropped instead of applied. */
export type OgeGridAiWarningKind =
  | 'unknown-field'
  | 'not-allowed'
  | 'invalid-operator'
  | 'invalid-value'
  | 'too-complex';

/** One dropped part of a reply. */
export interface OgeGridAiWarning {
  readonly kind: OgeGridAiWarningKind;
  readonly slice: OgeGridAiSlice;
  /** The field the dropped part named, when it named one. */
  readonly field?: string;
}

/**
 * The validated outcome of one assistant reply.
 *
 * - `change` — `snapshot` is the complete next state (already passed through
 *   `sanitizeGridStateSnapshot`), `slices` what differs from the current one.
 * - `clarify` — the model asks the user a question (`summary`).
 * - `unsupported` — the request cannot be done with these columns.
 * - `invalid` — the reply was not a usable object at all.
 */
export type OgeGridAiResult =
  | {
      readonly kind: 'change';
      readonly snapshot: GridStateSnapshot;
      readonly summary: string;
      readonly slices: readonly OgeGridAiSlice[];
      readonly warnings: readonly OgeGridAiWarning[];
    }
  | { readonly kind: 'clarify'; readonly summary: string }
  | { readonly kind: 'unsupported'; readonly summary: string }
  | {
      readonly kind: 'invalid';
      readonly warnings: readonly OgeGridAiWarning[];
    };

/** Upper bound on filter-tree nodes a reply may carry. */
const MAX_FILTER_NODES = 64;
/** Upper bound on summary length rendered back to the user. */
const MAX_SUMMARY = 400;

const STRING_OPS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'eq',
  'ne',
  'contains',
  'notcontains',
  'startswith',
  'endswith',
  'in',
  'isnull',
  'isnotnull',
]);
const ORDERED_OPS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
  'in',
  'between',
  'isnull',
  'isnotnull',
]);
const BOOLEAN_OPS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'eq',
  'ne',
  'isnull',
  'isnotnull',
]);

function opsFor(dataType: OgeDataType): ReadonlySet<FilterOperator> {
  if (dataType === 'string') return STRING_OPS;
  if (dataType === 'boolean') return BOOLEAN_OPS;
  return ORDERED_OPS;
}

type Plain = Record<string, unknown>;

function isPlain(value: unknown): value is Plain {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_SUMMARY) : '';
}

class Validator {
  readonly warnings: OgeGridAiWarning[] = [];
  private nodes = 0;
  private readonly byField: ReadonlyMap<string, OgeAiGridColumn>;

  constructor(columns: readonly OgeAiGridColumn[]) {
    this.byField = new Map(columns.map((c) => [c.field, c]));
  }

  warn(kind: OgeGridAiWarningKind, slice: OgeGridAiSlice, field?: string) {
    this.warnings.push(
      field === undefined ? { kind, slice } : { kind, slice, field },
    );
  }

  column(
    field: unknown,
    slice: OgeGridAiSlice,
    ability: 'sortable' | 'filterable' | 'groupable' | null,
  ): OgeAiGridColumn | undefined {
    if (typeof field !== 'string') {
      this.warn('unknown-field', slice);
      return undefined;
    }
    const column = this.byField.get(field);
    if (!column) {
      this.warn('unknown-field', slice, field);
      return undefined;
    }
    if (ability && !column[ability]) {
      this.warn('not-allowed', slice, field);
      return undefined;
    }
    return column;
  }

  sort(value: unknown): SortDescriptor[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const out: SortDescriptor[] = [];
    for (const item of value) {
      if (!isPlain(item)) continue;
      const column = this.column(item['field'], 'sort', 'sortable');
      if (!column) continue;
      const dir = item['dir'] === 'desc' ? 'desc' : 'asc';
      if (!out.some((s) => s.field === column.field)) {
        out.push({ field: column.field, dir });
      }
    }
    return out;
  }

  group(value: unknown): GroupDescriptor[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const out: GroupDescriptor[] = [];
    for (const item of value) {
      if (!isPlain(item)) continue;
      const column = this.column(item['field'], 'group', 'groupable');
      if (!column || out.some((g) => g.field === column.field)) continue;
      const dir = item['dir'] === 'desc' ? 'desc' : 'asc';
      const interval = item['interval'];
      out.push(
        isGroupInterval(interval)
          ? { field: column.field, dir, interval }
          : { field: column.field, dir },
      );
    }
    return out;
  }

  filter(value: unknown, depth = 0): FilterExpr | undefined {
    if (!isPlain(value) || depth > 16) return undefined;
    if (++this.nodes > MAX_FILTER_NODES) {
      if (this.nodes === MAX_FILTER_NODES + 1)
        this.warn('too-complex', 'filter');
      return undefined;
    }
    const type = value['type'];
    if (type === 'and' || type === 'or') {
      const operands = Array.isArray(value['operands'])
        ? value['operands']
            .map((o) => this.filter(o, depth + 1))
            .filter((o): o is FilterExpr => o !== undefined)
        : [];
      if (operands.length === 0) return undefined;
      return operands.length === 1 ? operands[0] : { type, operands };
    }
    if (type === 'not') {
      const operand = this.filter(value['operand'], depth + 1);
      return operand ? { type: 'not', operand } : undefined;
    }
    // a model may leave out `type` on a leaf; anything with a field is a leaf
    if (type !== 'binary' && type !== undefined) return undefined;
    const column = this.column(value['field'], 'filter', 'filterable');
    if (!column) return undefined;
    const op = value['op'] as FilterOperator;
    if (!opsFor(column.dataType).has(op)) {
      this.warn('invalid-operator', 'filter', column.field);
      return undefined;
    }
    if (op === 'isnull' || op === 'isnotnull') {
      return { type: 'binary', field: column.field, op };
    }
    const operand = this.operand(column, op, value['value']);
    if (operand === undefined) {
      this.warn('invalid-value', 'filter', column.field);
      return undefined;
    }
    return { type: 'binary', field: column.field, op, value: operand };
  }

  private operand(
    column: OgeAiGridColumn,
    op: FilterOperator,
    raw: unknown,
  ): unknown {
    if (op === 'in') {
      if (!Array.isArray(raw) || raw.length === 0) return undefined;
      const values = raw.map((v) => this.scalar(column, v));
      return values.some((v) => v === undefined) ? undefined : values;
    }
    if (op === 'between') {
      if (!Array.isArray(raw) || raw.length !== 2) return undefined;
      const from = this.scalar(column, raw[0]);
      const to = this.scalar(column, raw[1]);
      if (from === undefined || to === undefined) return undefined;
      // an inclusive date range reaches the end of its last day
      return [from, to instanceof Date && isMidnight(to) ? endOfDay(to) : to];
    }
    return this.scalar(column, raw);
  }

  private scalar(column: OgeAiGridColumn, raw: unknown): unknown {
    return coerceOgeAiValue(column.dataType, raw, column.values);
  }
}

function isMidnight(date: Date): boolean {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Validates a parsed assistant reply against the grid's columns and folds it
 * into the current state.
 *
 * Nothing the model writes reaches the grid unchecked: fields must exist and
 * allow the operation, operators must suit the column type, values are coerced
 * to the column type (dates parse as local dates), lookup texts map back to
 * their values, filter trees are bounded, and the merged snapshot still passes
 * `sanitizeGridStateSnapshot`. Dropped parts come back as `warnings`.
 */
export function resolveOgeGridAiReply(
  reply: unknown,
  columns: readonly OgeAiGridColumn[],
  current: GridStateSnapshot,
  capabilities: OgeGridAiCapabilities = OGE_GRID_AI_ALL_CAPABILITIES,
): OgeGridAiResult {
  if (!isPlain(reply)) return { kind: 'invalid', warnings: [] };
  const summary = text(reply['summary']);
  const status = reply['status'];
  if (status === 'clarify' && summary) return { kind: 'clarify', summary };
  if (status === 'unsupported') return { kind: 'unsupported', summary };

  const v = new Validator(columns);
  const deny = (slice: OgeGridAiSlice): undefined => {
    v.warn('not-allowed', slice);
    return undefined;
  };
  const next: {
    sort?: readonly SortDescriptor[];
    group?: readonly GroupDescriptor[];
    filter?: GridStateSnapshot['filter'];
    paging?: GridStateSnapshot['paging'];
    columns?: GridStateSnapshot['columns'];
  } = { ...current };
  const slices: OgeGridAiSlice[] = [];

  if ('sort' in reply) {
    const sort = capabilities.sort ? v.sort(reply['sort']) : deny('sort');
    if (sort && !sameJson(sort, current.sort ?? [])) {
      next.sort = sort;
      slices.push('sort');
    }
  }
  if ('group' in reply) {
    const group = capabilities.group ? v.group(reply['group']) : deny('group');
    if (group && !sameJson(group, current.group ?? [])) {
      next.group = group;
      slices.push('group');
    }
  }
  let filter = { ...current.filter };
  if ('filter' in reply || reply['clearOtherFilters'] === true) {
    if (!capabilities.filter) {
      deny('filter');
    } else {
      if ('filter' in reply) {
        const raw = reply['filter'];
        const builder = raw === null ? null : (v.filter(raw) ?? undefined);
        if (builder !== undefined) filter = { ...filter, builder };
      }
      if (reply['clearOtherFilters'] === true) {
        filter = { ...filter, row: [], header: [] };
      }
      if (!sameJson(filter, current.filter ?? {})) slices.push('filter');
    }
  }
  if ('search' in reply) {
    if (!capabilities.search) {
      deny('search');
    } else if (typeof reply['search'] === 'string') {
      const searchText = reply['search'].slice(0, 200);
      if (searchText !== (current.filter?.searchText ?? '')) {
        filter = { ...filter, searchText };
        slices.push('search');
      }
    }
  }
  if (slices.includes('filter') || slices.includes('search')) {
    next.filter = filter;
    // a narrower result set starts on its first page
    if (current.paging) next.paging = { ...current.paging, pageIndex: 0 };
  }
  if ('hiddenColumns' in reply) {
    if (!capabilities.columns) {
      deny('columns');
    } else if (Array.isArray(reply['hiddenColumns'])) {
      const hidden = reply['hiddenColumns']
        .map((f) => v.column(f, 'columns', null)?.field)
        .filter((f): f is string => f !== undefined);
      if (
        !sameJson(
          [...hidden].sort(),
          [...(current.columns?.hidden ?? [])].sort(),
        )
      ) {
        next.columns = { ...current.columns, hidden };
        slices.push('columns');
      }
    }
  }

  const snapshot = sanitizeGridStateSnapshot(next);
  if (snapshot === null) return { kind: 'invalid', warnings: v.warnings };
  return { kind: 'change', snapshot, summary, slices, warnings: v.warnings };
}
