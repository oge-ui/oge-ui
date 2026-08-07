import { computed, type Signal, type TemplateRef } from '@angular/core';
import type { ValidatorFn } from '@angular/forms';
import {
  createFieldAccessor,
  nextDay,
  startOfDay,
  type DataSource,
  type FilterExpr,
  type FilterOperator,
  type ValueAccessor,
} from '@oge-ui/core';

export type OgeDataType = 'string' | 'number' | 'date' | 'boolean';

/**
 * Lookup configuration: cells store a raw value but display (and edit/filter
 * with) the text of the matching lookup item.
 */
export interface OgeColumnLookup {
  /**
   * Items, or a function of the row for cascading lookups — during editing it
   * receives the row's current draft values, so dependent editors update live.
   */
  dataSource: readonly unknown[] | ((row: never) => readonly unknown[]);
  /** Property holding the stored value; omit when items are primitives. */
  valueExpr?: string;
  /** Property holding the display text; omit when items are primitives. */
  displayExpr?: string;
}

/** A resolved lookup entry: stored value plus its display text. */
export interface LookupItem {
  value: unknown;
  text: string;
}

/**
 * The signal surface a column definition must expose to be resolved by
 * `ColumnModel`. `OgeColumn` (and any future declarative column directive)
 * satisfies this structurally — the foundation entry point must not depend
 * on the primary entry point's directives.
 */
export interface ColumnSource<T = unknown> {
  readonly field: () => string | undefined;
  readonly caption: () => string | undefined;
  readonly width: () => number | string | undefined;
  readonly dataType: () => OgeDataType;
  readonly format: () => ((value: unknown) => string) | undefined;
  readonly visible: () => boolean;
  readonly sortable: () => boolean;
  readonly filterable: () => boolean;
  readonly filterOperator: () => FilterOperator | undefined;
  readonly minWidth: () => number | undefined;
  readonly lookup: () => OgeColumnLookup | undefined;
  readonly calculateCellValue: () => ((row: T) => unknown) | undefined;
  readonly calculateFilterExpression: () =>
    | ((value: unknown, operator: FilterOperator) => FilterExpr | null)
    | undefined;
  readonly hidingPriority: () => number | undefined;
  readonly pinned: () => false | 'left' | 'right';
  readonly editable: () => boolean;
  /** Marks the field as required in editors. */
  readonly required: () => boolean;
  /** Extra Angular validators applied to the editor control. */
  readonly validators: () => readonly ValidatorFn[] | undefined;
  readonly cellTemplate: () => { templateRef: TemplateRef<object> } | undefined;
  readonly headerTemplate: () =>
    { templateRef: TemplateRef<object> } | undefined;
  readonly editTemplate: () => { templateRef: TemplateRef<object> } | undefined;
}

/** Programmatic column definition (alternative to a declarative column). */
export interface ColumnDefLike {
  field: string;
  caption?: string;
}

/**
 * Per-column view model shared by the header, body, filter row and editors.
 * `S` is the concrete declarative source type of the host component (e.g.
 * `OgeColumn<T>`), so hosts keep full typing on `source`.
 */
export interface ResolvedColumn<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  /** Position within the full column set (stable under column virtualization). */
  absIndex: number;
  id: string;
  field: string | undefined;
  caption: string;
  dataType: OgeDataType;
  width: number | string | undefined;
  minWidth: number | undefined;
  sortable: boolean;
  filterable: boolean;
  filterOperator: FilterOperator | undefined;
  calculateFilterExpression:
    | ((value: unknown, operator: FilterOperator) => FilterExpr | null)
    | undefined;
  pinned: false | 'left' | 'right';
  accessor: ValueAccessor<T>;
  format: ((value: unknown) => string) | undefined;
  editable: boolean;
  lookupItems: readonly LookupItem[] | undefined;
  lookup: OgeColumnLookup | undefined;
  bandCaption: string | undefined;
  hidingPriority: number | undefined;
  cellTemplate: TemplateRef<object> | undefined;
  headerTemplate: TemplateRef<object> | undefined;
  editTemplate: TemplateRef<object> | undefined;
  source: S | undefined;
}

/** Default filter-row operator per dataType. */
export function defaultOperatorFor(dataType: OgeDataType): FilterOperator {
  return dataType === 'string' ? 'contains' : 'eq';
}

/** Maps a filter-row input value to a FilterExpr for the column's dataType. */
export function buildRowFilterExpr(
  field: string,
  dataType: OgeDataType,
  raw: string,
  operator?: FilterOperator,
): FilterExpr | null {
  const text = raw.trim();
  if (!text) return null;
  const op = operator ?? defaultOperatorFor(dataType);
  switch (dataType) {
    case 'number': {
      const value = Number(text);
      return Number.isNaN(value) ? null : { type: 'binary', field, op, value };
    }
    case 'boolean':
      return { type: 'binary', field, op: 'eq', value: text === 'true' };
    default:
      return { type: 'binary', field, op, value: text };
  }
}

/**
 * Timezone-safe day filter for `dataType: 'date'` columns: `eq` becomes a
 * local `[startOfDay, nextDay)` range, ordering operators compare against the
 * matching day boundary. Bounds are local `Date`s — exact for `Date`-stored
 * rows; core's filter evaluator parses ISO-string cells when compared with
 * `Date` bounds (rows with date-only strings in UTC-negative zones may need
 * `calculateFilterExpression`).
 */
export function dateFilterExpr(
  field: string,
  op: FilterOperator,
  day: Date,
): FilterExpr {
  const start = startOfDay(day);
  const end = nextDay(day);
  switch (op) {
    case 'ne':
      return {
        type: 'not',
        operand: dateFilterExpr(field, 'eq', day),
      };
    case 'lt':
      return { type: 'binary', field, op: 'lt', value: start };
    case 'le':
      return { type: 'binary', field, op: 'lt', value: end };
    case 'gt':
      return { type: 'binary', field, op: 'ge', value: end };
    case 'ge':
      return { type: 'binary', field, op: 'ge', value: start };
    default:
      return {
        type: 'and',
        operands: [
          { type: 'binary', field, op: 'ge', value: start },
          { type: 'binary', field, op: 'lt', value: end },
        ],
      };
  }
}

/** Derives a header caption from a (possibly dotted) field path. */
export function humanize(field: string): string {
  const last = field.split('.').pop() ?? field;
  const spaced = last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function isDataSource<T>(
  value: readonly T[] | DataSource<T>,
): value is DataSource<T> {
  return (
    !Array.isArray(value) && typeof (value as DataSource<T>).load === 'function'
  );
}

export function mapLookupItems(
  items: readonly unknown[],
  lookup: OgeColumnLookup,
): readonly LookupItem[] {
  const valueOf = lookup.valueExpr
    ? createFieldAccessor(lookup.valueExpr)
    : (item: unknown) => item;
  const textOf = lookup.displayExpr
    ? createFieldAccessor(lookup.displayExpr)
    : (item: unknown) => item;
  return items.map((item) => ({
    value: valueOf(item),
    text: String(textOf(item) ?? ''),
  }));
}

/** Static lookups resolve once; function (cascading) lookups resolve per row. */
export function resolveLookupItems(
  lookup: OgeColumnLookup | undefined,
): readonly LookupItem[] | undefined {
  if (!lookup || typeof lookup.dataSource === 'function') return undefined;
  return mapLookupItems(lookup.dataSource, lookup);
}

/**
 * Per-items-array text index so lookup display stays O(1) per cell instead of
 * scanning the list for every rendered cell. Keyed weakly on the (stable)
 * items array; string keys cover both strict and coerced value matches.
 */
const lookupTextCache = new WeakMap<
  readonly LookupItem[],
  Map<string, string>
>();

export function lookupTextOf(
  items: readonly LookupItem[],
  value: unknown,
): string {
  let map = lookupTextCache.get(items);
  if (!map) {
    map = new Map();
    for (const item of items) map.set(String(item.value), item.text);
    lookupTextCache.set(items, map);
  }
  const text = map.get(String(value));
  return text !== undefined ? text : value == null ? '' : String(value);
}

export interface ColumnModelDeps<T, S extends ColumnSource<T>> {
  /** Declarative column sources (already filtered to none for input-driven hosts). */
  declaredColumns: Signal<readonly S[]>;
  /** Column source → band caption (from a column-group directive), if any. */
  bands: Signal<ReadonlyMap<S, string>>;
  /** Programmatic column definitions (used when no declared columns exist). */
  columnDefs: Signal<readonly (string | ColumnDefLike)[] | undefined>;
  /** First data row, for auto-deriving columns when nothing is declared. */
  firstDataRow: Signal<T | undefined>;
  widthOverrides: Signal<ReadonlyMap<string, number>>;
  pinOverrides: Signal<ReadonlyMap<string, false | 'left' | 'right'>>;
  order: Signal<readonly string[] | null>;
  hostWidth: Signal<number>;
  /** Fallback minimum track width for flexible columns. */
  defaultMinWidth: Signal<number>;
  /** Width of the leading utility cells counted against adaptive hiding. */
  adaptiveLeadingWidth: Signal<number>;
}

/**
 * Resolves declarative or programmatic column definitions into the flat
 * `ResolvedColumn` list every other part of a grid-like component consumes:
 * applies visibility, adaptive hiding, user order and pinning, and derives
 * accessors/captions. Hosted as a plain field by the component (slice
 * pattern — no DI).
 */
export class ColumnModel<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  constructor(private readonly deps: ColumnModelDeps<T, S>) {}

  /**
   * Responsive column hiding: when the fixed/estimated widths exceed the
   * available width, columns with a `hidingPriority` are hidden starting
   * from the lowest priority.
   */
  readonly adaptiveHiddenIds = computed<ReadonlySet<string>>(() => {
    const hostWidth = this.deps.hostWidth();
    if (!hostWidth) return new Set();
    const declared = this.deps
      .declaredColumns()
      .filter((column) => column.visible());
    if (!declared.length) return new Set();
    const defaultMin = this.deps.defaultMinWidth();
    const widthOf = (column: S): number => {
      const width = column.width();
      if (typeof width === 'number') return width;
      return column.minWidth() ?? defaultMin;
    };
    let total =
      this.deps.adaptiveLeadingWidth() +
      declared.reduce((sum, column) => sum + widthOf(column), 0);
    const hidden = new Set<string>();
    const candidates = declared
      .filter((column) => column.hidingPriority() !== undefined)
      .sort((a, b) => (a.hidingPriority() ?? 0) - (b.hidingPriority() ?? 0));
    for (const column of candidates) {
      if (total <= hostWidth) break;
      const field = column.field();
      if (!field) continue;
      hidden.add(field);
      total -= widthOf(column);
    }
    return hidden;
  });

  readonly resolvedColumns = computed<ResolvedColumn<T, S>[]>(() => {
    const widthOverrides = this.deps.widthOverrides();
    const pinOverrides = this.deps.pinOverrides();
    const declared = this.deps.declaredColumns();
    const bands = this.deps.bands();
    const adaptiveHidden = this.adaptiveHiddenIds();
    let columns: Omit<ResolvedColumn<T, S>, 'absIndex'>[];
    if (declared.length) {
      columns = declared
        .filter((column) => column.visible())
        .map((column, index) => {
          const field = column.field();
          const id = field ?? `col-${index}`;
          const calculate = column.calculateCellValue();
          return {
            id,
            field,
            caption: column.caption() ?? (field ? humanize(field) : ''),
            dataType: column.dataType(),
            width: widthOverrides.get(id) ?? column.width(),
            minWidth: column.minWidth(),
            sortable: column.sortable() && field != null,
            filterable: column.filterable() && field != null,
            filterOperator: column.filterOperator(),
            calculateFilterExpression: column.calculateFilterExpression(),
            pinned: pinOverrides.get(id) ?? column.pinned(),
            accessor:
              calculate ??
              (field ? createFieldAccessor<T>(field) : () => undefined),
            format: column.format(),
            editable: column.editable() && field != null && !calculate,
            lookupItems: resolveLookupItems(column.lookup()),
            lookup: column.lookup(),
            bandCaption: bands.get(column),
            hidingPriority: column.hidingPriority(),
            cellTemplate: column.cellTemplate()?.templateRef,
            headerTemplate: column.headerTemplate()?.templateRef,
            editTemplate: column.editTemplate()?.templateRef,
            source: column,
          };
        })
        .filter((column) => !adaptiveHidden.has(column.id));
    } else {
      const defs = this.deps.columnDefs();
      const fields = defs?.length
        ? defs.map((def) =>
            typeof def === 'string' ? { field: def, caption: undefined } : def,
          )
        : Object.keys(this.deps.firstDataRow() ?? {}).map((field) => ({
            field,
            caption: undefined,
          }));
      columns = fields.map(({ field, caption }) => ({
        id: field,
        field,
        caption: caption ?? humanize(field),
        dataType: 'string' as const,
        width: widthOverrides.get(field),
        minWidth: undefined,
        sortable: true,
        filterable: true,
        filterOperator: undefined,
        calculateFilterExpression: undefined,
        pinned: pinOverrides.get(field) ?? (false as const),
        lookupItems: undefined,
        lookup: undefined,
        bandCaption: undefined,
        hidingPriority: undefined,
        accessor: createFieldAccessor<T>(field),
        format: undefined,
        editable: true,
        cellTemplate: undefined,
        headerTemplate: undefined,
        editTemplate: undefined,
        source: undefined,
      }));
    }
    // user-defined order, then pinned columns forced to the edges
    const order = this.deps.order();
    if (order) {
      columns = [...columns].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (
          (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) -
          (ib < 0 ? Number.MAX_SAFE_INTEGER : ib)
        );
      });
    }
    const left = columns.filter((c) => c.pinned === 'left');
    const right = columns.filter((c) => c.pinned === 'right');
    const middle = columns.filter((c) => !c.pinned);
    return [...left, ...middle, ...right].map((column, index) => ({
      ...column,
      absIndex: index,
    }));
  });

  /** Band header cells (caption + span) for the current column order. */
  readonly bandRow = computed<
    { caption: string | null; span: number }[] | null
  >(() => {
    const columns = this.resolvedColumns();
    if (!columns.some((column) => column.bandCaption)) return null;
    const cells: { caption: string | null; span: number }[] = [];
    for (const column of columns) {
      const caption = column.bandCaption ?? null;
      const last = cells[cells.length - 1];
      if (last && last.caption !== null && last.caption === caption)
        last.span += 1;
      else cells.push({ caption, span: 1 });
    }
    return cells;
  });
}
