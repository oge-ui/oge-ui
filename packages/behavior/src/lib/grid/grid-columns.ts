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

/** Programmatic column definition (alternative to a declarative column). */
export interface OgeGridColumnDef {
  field: string;
  caption?: string;
}

/**
 * One column as plain values — what the resolver consumes.
 *
 * Deliberately *not* the host's declarative column type: Angular's is a
 * directive of signals, React's a plain props object, and both flatten to
 * this. `TSlot` is whatever the render layer calls a content slot (an Angular
 * `TemplateRef`, a React render prop); the resolver only carries it through.
 * `S` is the host's own source object, carried through the same way so hosts
 * keep full typing on `source`.
 */
export interface OgeGridColumnSpec<T = unknown, TSlot = unknown, S = unknown> {
  field: string | undefined;
  caption: string | undefined;
  width: number | string | undefined;
  dataType: OgeDataType;
  format: ((value: unknown) => string) | undefined;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  filterOperator: FilterOperator | undefined;
  minWidth: number | undefined;
  lookup: OgeColumnLookup | undefined;
  calculateCellValue: ((row: T) => unknown) | undefined;
  calculateFilterExpression:
    | ((value: unknown, operator: FilterOperator) => FilterExpr | null)
    | undefined;
  hidingPriority: number | undefined;
  pinned: false | 'left' | 'right';
  editable: boolean;
  cellTemplate: TSlot | undefined;
  headerTemplate: TSlot | undefined;
  editTemplate: TSlot | undefined;
  /** Band (column-group) caption this column sits under, if any. */
  bandCaption: string | undefined;
  /** The host's own column object, carried through untouched. */
  source: S | undefined;
}

/**
 * Per-column view model shared by the header, body, filter row and editors.
 */
export interface OgeGridResolvedColumn<
  T = unknown,
  TSlot = unknown,
  S = unknown,
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
  cellTemplate: TSlot | undefined;
  headerTemplate: TSlot | undefined;
  editTemplate: TSlot | undefined;
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
// `/* @__PURE__ */` matters: the docs app resolves `@oge-ui/behavior` through
// its tsconfig path to *source*, so the package's `sideEffects: false` never
// reaches the bundler. Without the annotation this one `new WeakMap()` makes
// the module look impure, and the whole grid engine is retained in every app
// that imports anything from the barrel.
const lookupTextCache = /* @__PURE__ */ new WeakMap<
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

/**
 * What responsive hiding needs to know about a column — five fields, not the
 * whole spec. The host reads exactly these, which matters on a fine-grained
 * reactivity graph: widening the contract would make the hiding set depend on
 * captions, lookups and templates it never looks at.
 */
export interface OgeGridAdaptiveColumn {
  readonly field: string | undefined;
  readonly visible: boolean;
  readonly width: number | string | undefined;
  readonly minWidth: number | undefined;
  readonly hidingPriority: number | undefined;
}

/** Inputs of {@link adaptiveHiddenColumnIds}. */
export interface OgeGridAdaptiveHidingInput {
  columns: readonly OgeGridAdaptiveColumn[];
  hostWidth: number;
  /** Fallback minimum track width for flexible columns. */
  defaultMinWidth: number;
  /** Width of the leading utility cells counted against the available width. */
  leadingWidth: number;
}

/**
 * Responsive column hiding: when the fixed/estimated widths exceed the
 * available width, columns with a `hidingPriority` are hidden starting from
 * the lowest priority.
 */
export function adaptiveHiddenColumnIds(
  input: OgeGridAdaptiveHidingInput,
): ReadonlySet<string> {
  const { hostWidth, defaultMinWidth } = input;
  if (!hostWidth) return new Set();
  const declared = input.columns.filter((column) => column.visible);
  if (!declared.length) return new Set();
  const widthOf = (column: OgeGridAdaptiveColumn): number =>
    typeof column.width === 'number'
      ? column.width
      : (column.minWidth ?? defaultMinWidth);
  let total =
    input.leadingWidth +
    declared.reduce((sum, column) => sum + widthOf(column), 0);
  const hidden = new Set<string>();
  const candidates = declared
    .filter((column) => column.hidingPriority !== undefined)
    .sort((a, b) => (a.hidingPriority ?? 0) - (b.hidingPriority ?? 0));
  for (const column of candidates) {
    if (total <= hostWidth) break;
    if (!column.field) continue;
    hidden.add(column.field);
    total -= widthOf(column);
  }
  return hidden;
}

/** Inputs of {@link resolveOgeGridColumns}. */
export interface OgeGridColumnResolveInput<T, TSlot, S> {
  /** Declared columns, already flattened to plain values. */
  specs: readonly OgeGridColumnSpec<T, TSlot, S>[];
  /**
   * Programmatic definitions, used when no column is declared — a getter, not
   * a value, because it is only consulted in that case. On a fine-grained
   * reactivity graph reading it eagerly would make the resolved columns depend
   * on the data, and the data (through a search over the visible columns)
   * depends on the resolved columns: a cycle.
   */
  columnDefs: () => readonly (string | OgeGridColumnDef)[] | undefined;
  /** First data row, for auto-deriving columns. A getter, for the same reason. */
  firstDataRow: () => T | undefined;
  widthOverrides: ReadonlyMap<string, number>;
  pinOverrides: ReadonlyMap<string, false | 'left' | 'right'>;
  order: readonly string[] | null;
  /** Ids hidden by {@link adaptiveHiddenColumnIds}. */
  adaptiveHiddenIds: ReadonlySet<string>;
}

/**
 * Resolves declarative or programmatic column definitions into the flat
 * `OgeGridResolvedColumn` list every other part of a grid-like component
 * consumes: applies visibility, adaptive hiding, user order and pinning, and
 * derives accessors and captions.
 *
 * A pure function rather than a reactive model on purpose — both render layers
 * already have a memo primitive (`computed`, `useMemo`), and plain values in,
 * plain values out is the cheapest thing for either to wrap.
 */
export function resolveOgeGridColumns<T, TSlot, S>(
  input: OgeGridColumnResolveInput<T, TSlot, S>,
): OgeGridResolvedColumn<T, TSlot, S>[] {
  const { widthOverrides, pinOverrides, adaptiveHiddenIds } = input;
  let columns: Omit<OgeGridResolvedColumn<T, TSlot, S>, 'absIndex'>[];
  if (input.specs.length) {
    columns = input.specs
      .filter((column) => column.visible)
      .map((column, index) => {
        const field = column.field;
        const id = field ?? `col-${index}`;
        const calculate = column.calculateCellValue;
        return {
          id,
          field,
          caption: column.caption ?? (field ? humanize(field) : ''),
          dataType: column.dataType,
          width: widthOverrides.get(id) ?? column.width,
          minWidth: column.minWidth,
          sortable: column.sortable && field != null,
          filterable: column.filterable && field != null,
          filterOperator: column.filterOperator,
          calculateFilterExpression: column.calculateFilterExpression,
          pinned: pinOverrides.get(id) ?? column.pinned,
          accessor:
            calculate ??
            (field ? createFieldAccessor<T>(field) : () => undefined),
          format: column.format,
          editable: column.editable && field != null && !calculate,
          lookupItems: resolveLookupItems(column.lookup),
          lookup: column.lookup,
          bandCaption: column.bandCaption,
          hidingPriority: column.hidingPriority,
          cellTemplate: column.cellTemplate,
          headerTemplate: column.headerTemplate,
          editTemplate: column.editTemplate,
          source: column.source,
        };
      })
      .filter((column) => !adaptiveHiddenIds.has(column.id));
  } else {
    const defs = input.columnDefs();
    const fields = defs?.length
      ? defs.map((def) =>
          typeof def === 'string' ? { field: def, caption: undefined } : def,
        )
      : Object.keys(input.firstDataRow() ?? {}).map((field) => ({
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
  const order = input.order;
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
}

/** One cell of the band (column-group) header row. */
export interface OgeGridBandCell {
  caption: string | null;
  span: number;
}

/** Band header cells (caption + span) for the current column order. */
export function ogeGridBandRow(
  columns: readonly { bandCaption: string | undefined }[],
): OgeGridBandCell[] | null {
  if (!columns.some((column) => column.bandCaption)) return null;
  const cells: OgeGridBandCell[] = [];
  for (const column of columns) {
    const caption = column.bandCaption ?? null;
    const last = cells[cells.length - 1];
    if (last && last.caption !== null && last.caption === caption)
      last.span += 1;
    else cells.push({ caption, span: 1 });
  }
  return cells;
}
