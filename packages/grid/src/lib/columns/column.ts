import { Directive, contentChild, input, model } from '@angular/core';
import type { ValidatorFn } from '@angular/forms';
import type { FilterExpr, FilterOperator, SummaryType } from '@oge-ui/core';
import { OgeCellTemplate } from '../templates/cell-template';
import { OgeEditTemplate } from '../templates/edit-template';
import { OgeHeaderTemplate } from '../templates/header-template';

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

/**
 * Declarative column definition. Renders nothing itself — the grid collects
 * these via content projection and derives its layout from them:
 *
 * ```html
 * <oge-grid [data]="orders">
 *   <oge-column field="id" caption="#" [width]="60" />
 *   <oge-column field="total" dataType="number" />
 * </oge-grid>
 * ```
 */
// Renderless configuration directives intentionally use element selectors.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'oge-column' })
export class OgeColumn<T = unknown> {
  /** Dotted paths are supported, e.g. `"customer.name"`. */
  readonly field = input<string>();
  /** Header text; derived from `field` when omitted. */
  readonly caption = input<string>();
  /** Number → px; string is used verbatim (e.g. `'2fr'`, `'150px'`). */
  readonly width = input<number | string>();
  readonly dataType = input<OgeDataType>('string');
  /** Custom value formatter applied to the default (non-templated) cell text. */
  readonly format = input<(value: unknown) => string>();
  readonly visible = model(true);
  readonly sortable = input(true);
  readonly filterable = input(true);
  /** Filter-row operator override (default: contains for text, eq for number/date). */
  readonly filterOperator = input<FilterOperator>();
  /** Track minimum in px for flexible-width columns. */
  readonly minWidth = input<number>();
  /** Maps stored values to display texts (cells, filters, editors). */
  readonly lookup = input<OgeColumnLookup>();
  /** Computes the cell value from the row (display-only columns; disables sort/filter unless `field` is set). */
  readonly calculateCellValue = input<(row: T) => unknown>();
  /** Custom sort key for this column (client-side array data only). */
  readonly calculateSortValue = input<(row: T) => unknown>();
  /** Custom filter expression for filter-row/operator-menu input on this column. */
  readonly calculateFilterExpression = input<
    (value: unknown, operator: FilterOperator) => FilterExpr | null
  >();
  /** Initial sort direction applied on first render (with `sortIndex` for multi-sort order). */
  readonly sortOrder = input<'asc' | 'desc'>();
  readonly sortIndex = input<number>();
  /** Initial group level of this column (0 = first). */
  readonly groupIndex = input<number>();
  /** Responsive hiding: lower priorities hide first when the grid runs out of width. */
  readonly hidingPriority = input<number>();
  /** Pins the column to an edge (requires a numeric `width`). */
  readonly pinned = input<false | 'left' | 'right'>(false);
  /** Aggregate(s) shown on group rows for this column's field. */
  readonly groupSummary = input<SummaryType | readonly SummaryType[]>();
  /** Aggregate(s) shown in the grid's total row for this column's field. */
  readonly totalSummary = input<SummaryType | readonly SummaryType[]>();
  /** Whether cells of this column can be edited. */
  readonly editable = input(true);
  /** Marks the field as required in editors. */
  readonly required = input(false);
  /** Extra Angular validators applied to the editor control. */
  readonly validators = input<readonly ValidatorFn[]>();

  readonly cellTemplate = contentChild(OgeCellTemplate<T>);
  readonly headerTemplate = contentChild(OgeHeaderTemplate<T>);
  readonly editTemplate = contentChild(OgeEditTemplate<T>);
}
