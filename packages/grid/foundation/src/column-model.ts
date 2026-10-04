import { computed, type TemplateRef } from '@angular/core';
import type { AsyncValidatorFn, ValidatorFn } from '@angular/forms';
import {
  adaptiveHiddenColumnIds,
  ogeGridBandRow,
  resolveOgeGridAdaptiveHiddenColumns,
  resolveOgeGridColumns,
  type OgeGridColumnDef,
  type OgeGridColumnSpec,
  type OgeGridResolvedColumn,
} from '@oge-ui/behavior';
import type { FilterExpr, FilterOperator } from '@oge-ui/core';

// The column vocabulary, the filter-expression builders and the resolver
// itself are framework-free and live in `@oge-ui/behavior` (ADR 0001); this
// module re-exports them so `@oge-ui/grid/foundation` keeps its public surface.
export {
  buildRowFilterExpr,
  dateFilterExpr,
  defaultOperatorFor,
  humanize,
  isDataSource,
  lookupTextOf,
  mapLookupItems,
  resolveLookupItems,
} from '@oge-ui/behavior';
export type {
  LookupItem,
  OgeColumnAlignment,
  OgeColumnLookup,
  OgeDataType,
} from '@oge-ui/behavior';

import type {
  OgeColumnAlignment,
  OgeColumnLookup,
  OgeDataType,
} from '@oge-ui/behavior';

/** Angular's content slot: what a column's template directives hand over. */
type NgTemplateSlot = TemplateRef<object>;

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
  readonly alignment: () => OgeColumnAlignment | undefined;
  readonly format: () => ((value: unknown) => string) | undefined;
  readonly visible: () => boolean;
  readonly sortable: () => boolean;
  readonly filterable: () => boolean;
  readonly filterOperator: () => FilterOperator | undefined;
  readonly minWidth: () => number | undefined;
  readonly maxWidth?: () => number | undefined;
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
  /** Async Angular validators applied to the editor control. */
  readonly asyncValidators?: () => readonly AsyncValidatorFn[] | undefined;
  readonly cellTemplate: () => { templateRef: NgTemplateSlot } | undefined;
  readonly headerTemplate: () => { templateRef: NgTemplateSlot } | undefined;
  readonly editTemplate: () => { templateRef: NgTemplateSlot } | undefined;
}

/** Programmatic column definition (alternative to a declarative column). */
export type ColumnDefLike = OgeGridColumnDef;

/**
 * Per-column view model shared by the header, body, filter row and editors.
 * `S` is the concrete declarative source type of the host component (e.g.
 * `OgeColumn<T>`), so hosts keep full typing on `source`.
 */
export type ResolvedColumn<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> = OgeGridResolvedColumn<T, NgTemplateSlot, S>;

export interface ColumnModelDeps<T, S extends ColumnSource<T>> {
  /** Declarative column sources (already filtered to none for input-driven hosts). */
  declaredColumns: () => readonly S[];
  /** Column source → band caption (from a column-group directive), if any. */
  bands: () => ReadonlyMap<S, string>;
  /** Programmatic column definitions (used when no declared columns exist). */
  columnDefs: () => readonly (string | ColumnDefLike)[] | undefined;
  /** First data row, for auto-deriving columns when nothing is declared. */
  firstDataRow: () => T | undefined;
  widthOverrides: () => ReadonlyMap<string, number>;
  pinOverrides: () => ReadonlyMap<string, false | 'left' | 'right'>;
  order: () => readonly string[] | null;
  hostWidth: () => number;
  /** Fallback minimum track width for flexible columns. */
  defaultMinWidth: () => number;
  /** Width of the leading utility cells counted against adaptive hiding. */
  adaptiveLeadingWidth: () => number;
  /** Adaptive-detail toggle width, counted once a column is hidden. */
  detailToggleWidth?: () => number;
}

/**
 * Resolves declarative or programmatic column definitions into the flat
 * `ResolvedColumn` list every other part of a grid-like component consumes:
 * applies visibility, adaptive hiding, user order and pinning, and derives
 * accessors/captions. Hosted as a plain field by the component (slice
 * pattern — no DI).
 *
 * Since ADR 0001's grid phase the resolution rules are `@oge-ui/behavior`'s
 * `resolveOgeGridColumns` / `adaptiveHiddenColumnIds` / `ogeGridBandRow` —
 * pure functions over plain values, shared verbatim with the React grid. What
 * this class adds is Angular's half: reading the directive signals inside a
 * `computed` (which is what keeps the dependency graph fine-grained) and
 * flattening them into specs.
 */
export class ColumnModel<
  T = unknown,
  S extends ColumnSource<T> = ColumnSource<T>,
> {
  constructor(private readonly deps: ColumnModelDeps<T, S>) {}

  /** Declarative sources flattened to plain values, band captions attached. */
  private readonly specs = computed<
    readonly OgeGridColumnSpec<T, NgTemplateSlot, S>[]
  >(() => {
    const bands = this.deps.bands();
    return this.deps.declaredColumns().map((column) => ({
      field: column.field(),
      caption: column.caption(),
      width: column.width(),
      dataType: column.dataType(),
      alignment: column.alignment(),
      format: column.format(),
      visible: column.visible(),
      sortable: column.sortable(),
      filterable: column.filterable(),
      filterOperator: column.filterOperator(),
      minWidth: column.minWidth(),
      maxWidth: column.maxWidth?.(),
      lookup: column.lookup(),
      calculateCellValue: column.calculateCellValue(),
      calculateFilterExpression: column.calculateFilterExpression(),
      hidingPriority: column.hidingPriority(),
      pinned: column.pinned(),
      editable: column.editable(),
      cellTemplate: column.cellTemplate()?.templateRef,
      headerTemplate: column.headerTemplate()?.templateRef,
      editTemplate: column.editTemplate()?.templateRef,
      bandCaption: bands.get(column),
      source: column,
    }));
  });

  /**
   * Responsive column hiding: when the fixed/estimated widths exceed the
   * available width, columns with a `hidingPriority` are hidden starting
   * from the lowest priority.
   */
  readonly adaptiveHiddenIds = computed<ReadonlySet<string>>(() =>
    adaptiveHiddenColumnIds({
      // read the five fields hiding actually uses, not `specs()` — on
      // Angular's fine-grained graph, depending on the whole spec would make
      // this recompute for a caption change (and, through `bands`, close a
      // cycle with the column-group queries)
      columns: this.deps.declaredColumns().map((column) => ({
        field: column.field(),
        visible: column.visible(),
        width: column.width(),
        minWidth: column.minWidth(),
        hidingPriority: column.hidingPriority(),
      })),
      hostWidth: this.deps.hostWidth(),
      defaultMinWidth: this.deps.defaultMinWidth(),
      leadingWidth: this.deps.adaptiveLeadingWidth(),
      detailToggleWidth: this.deps.detailToggleWidth?.() ?? 0,
    }),
  );

  readonly resolvedColumns = computed<ResolvedColumn<T, S>[]>(() =>
    resolveOgeGridColumns({
      specs: this.specs(),
      // getters, so these are read only when nothing is declared — reading
      // them eagerly would make the columns depend on the data, which
      // (through the search over visible columns) depends on the columns
      columnDefs: () => this.deps.columnDefs(),
      firstDataRow: () => this.deps.firstDataRow(),
      widthOverrides: this.deps.widthOverrides(),
      pinOverrides: this.deps.pinOverrides(),
      order: this.deps.order(),
      adaptiveHiddenIds: this.adaptiveHiddenIds(),
    }),
  );

  /**
   * The columns responsive hiding took out, resolved like the visible ones —
   * what the adaptive detail (`columnHidingMode: 'detail'`) renders.
   */
  readonly adaptiveHiddenColumns = computed<ResolvedColumn<T, S>[]>(() =>
    resolveOgeGridAdaptiveHiddenColumns({
      specs: this.specs(),
      columnDefs: () => this.deps.columnDefs(),
      firstDataRow: () => this.deps.firstDataRow(),
      widthOverrides: this.deps.widthOverrides(),
      pinOverrides: this.deps.pinOverrides(),
      order: this.deps.order(),
      adaptiveHiddenIds: this.adaptiveHiddenIds(),
    }),
  );

  /**
   * The columns an export writes, in display order: every visible column —
   * including the ones only the responsive width pass took out — and, with
   * `includeHidden`, the `visible: false` / chooser-hidden ones as well.
   * Read untracked; exports are one-shot.
   */
  exportColumns(includeHidden: boolean): ResolvedColumn<T, S>[] {
    const specs = includeHidden
      ? this.specs().map((spec) => ({ ...spec, visible: true }))
      : this.specs();
    return resolveOgeGridColumns({
      specs,
      columnDefs: () => this.deps.columnDefs(),
      firstDataRow: () => this.deps.firstDataRow(),
      widthOverrides: this.deps.widthOverrides(),
      pinOverrides: this.deps.pinOverrides(),
      order: this.deps.order(),
      adaptiveHiddenIds: new Set<string>(),
    });
  }

  /** Band header cells (caption + span) for the current column order. */
  readonly bandRow = computed<
    { caption: string | null; span: number }[] | null
  >(() => ogeGridBandRow(this.resolvedColumns()));
}
