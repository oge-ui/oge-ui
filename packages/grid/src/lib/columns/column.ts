import { Directive, contentChild, input, model } from '@angular/core';
import type { AsyncValidatorFn, ValidatorFn } from '@angular/forms';
import type {
  FilterExpr,
  FilterOperator,
  GroupInterval,
  SummaryType,
} from '@oge-ui/core';
import type {
  OgeColumnAlignment,
  OgeColumnLookup,
  OgeDataType,
} from '@oge-ui/grid/foundation';
import type { OgeConditionalFormat } from '@oge-ui/behavior';
import { OgeCellTemplate } from '../templates/cell-template';
import { OgeEditTemplate } from '../templates/edit-template';
import { OgeHeaderTemplate } from '../templates/header-template';

export type {
  OgeColumnAlignment,
  OgeColumnLookup,
  OgeDataType,
} from '@oge-ui/grid/foundation';

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
  /**
   * Horizontal alignment of the cells, header and summaries (logical: `'end'`
   * is the right edge in LTR). Unset, numbers align to the end, the rest to
   * the start.
   */
  readonly alignment = input<OgeColumnAlignment>();
  /** Custom value formatter applied to the default (non-templated) cell text. */
  readonly format = input<(value: unknown) => string>();
  readonly visible = model(true);
  readonly sortable = input(true);
  readonly filterable = input(true);
  /** Filter-row operator override (default: contains for text, eq for number/date). */
  readonly filterOperator = input<FilterOperator>();
  /** Track minimum in px for flexible-width columns. */
  readonly minWidth = input<number>();
  /** Upper bound in px for user resizing (pointer drag and Alt+Arrow keys). */
  readonly maxWidth = input<number>();
  /** Maps stored values to display texts (cells, filters, editors). */
  readonly lookup = input<OgeColumnLookup>();
  /** Computes the cell value from the row (display-only columns; disables sort/filter unless `field` is set). */
  readonly calculateCellValue = input<(row: T) => unknown>();
  /** Custom sort key for this column (client-side array data only). */
  readonly calculateSortValue = input<(row: T) => unknown>();
  /** Custom filter expression for filter-row/operator-menu input on this column. */
  readonly calculateFilterExpression =
    input<(value: unknown, operator: FilterOperator) => FilterExpr | null>();
  /** Initial sort direction applied on first render (with `sortIndex` for multi-sort order). */
  readonly sortOrder = input<'asc' | 'desc'>();
  readonly sortIndex = input<number>();
  /** Initial group level of this column (0 = first). */
  readonly groupIndex = input<number>();
  /**
   * Bucket when grouping by this column: for dates `'hour'`, `'day'` (the
   * default for `dataType="date"` / `"datetime"` — same-day rows share a
   * group whatever their time), `'week'` (locale's first day of week),
   * `'month'`, `'quarter'` or `'year'`; for numbers a positive bucket width
   * (`[groupInterval]="100"` groups 0–99, 100–199, …). Sent to a server as
   * `LoadOptions.group[].interval`.
   */
  readonly groupInterval = input<GroupInterval>();
  /** Responsive hiding: lower priorities hide first when the grid runs out of width. */
  readonly hidingPriority = input<number>();
  /** Pins the column to an edge (requires a numeric `width`). */
  readonly pinned = input<false | 'left' | 'right'>(false);
  /** Aggregate(s) shown on group rows for this column's field. */
  readonly groupSummary = input<SummaryType | readonly SummaryType[]>();
  /**
   * Where this column's group summaries render: inline on the group header
   * row (default) or on a dedicated footer row after the group's children.
   */
  readonly groupSummaryPosition = input<'row' | 'footer'>('row');
  /** Aggregate(s) shown in the grid's total row for this column's field. */
  readonly totalSummary = input<SummaryType | readonly SummaryType[]>();
  /**
   * Reducer for the `'custom'` summary type: receives the (group or total)
   * rows and returns the aggregate value. Client-side data only.
   */
  readonly calculateCustomSummary = input<(rows: readonly T[]) => unknown>();
  /** Whether cells of this column can be edited. */
  readonly editable = input(true);
  /** Marks the field as required in editors. */
  readonly required = input(false);
  /** Extra Angular validators applied to the editor control. */
  readonly validators = input<readonly ValidatorFn[]>();
  /**
   * Async Angular validators (e.g. a server uniqueness check). While one runs
   * the editor is `aria-busy` and a commit waits for the result; a failure
   * shows like a sync error. Pastes and fills run them too.
   */
  readonly asyncValidators = input<readonly AsyncValidatorFn[]>();
  /**
   * Declarative conditional formatting: rules (`{ when, class | style }`),
   * data bars, colour scales and icon sets — token classes and CSS custom
   * properties only, so themes and forced colours keep working.
   */
  readonly conditionalFormats = input<readonly OgeConditionalFormat<T>[]>();
  /**
   * Merges vertically adjacent cells with equal values into one cell
   * (`aria-rowspan`). Not applied while the grid is virtualized.
   */
  readonly mergeCells = input(false);

  readonly cellTemplate = contentChild(OgeCellTemplate<T>);
  readonly headerTemplate = contentChild(OgeHeaderTemplate<T>);
  readonly editTemplate = contentChild(OgeEditTemplate<T>);
}
