import { Directive, TemplateRef, inject } from '@angular/core';
import type { FilterOperator } from '@oge-ui/core';
import type { OgeFilterCellColumn } from '@oge-ui/behavior';

/** Context of `*ogeFilterCellTemplate`. */
export interface OgeFilterCellTemplateContext {
  /** The cell's current value (`let value`); `null` when the cell is empty. */
  $implicit: unknown;
  /**
   * Sets the value and filters by it: an empty value (null, blank text, an
   * empty list) removes the filter, a two-item array is `between`, a longer
   * one `in`, anything else uses `operator` (default: the operator in force).
   * A column's `calculateFilterExpression` still decides when present.
   */
  setValue: (value: unknown, operator?: FilterOperator) => void;
  /** The operator in force for the column. */
  operator: FilterOperator;
  column: OgeFilterCellColumn;
}

/**
 * Replaces a column's filter-row editor (and needs `filterRow`):
 *
 * ```html
 * <oge-column field="status">
 *   <select *ogeFilterCellTemplate="let value; setValue as set"
 *           [value]="value ?? ''" (change)="set($any($event.target).value)">
 *     <option value="">Any</option><option>Open</option><option>Closed</option>
 *   </select>
 * </oge-column>
 * ```
 */
@Directive({ selector: '[ogeFilterCellTemplate]' })
export class OgeFilterCellTemplate {
  readonly templateRef = inject(TemplateRef<OgeFilterCellTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeFilterCellTemplate,
    _ctx: unknown,
  ): _ctx is OgeFilterCellTemplateContext {
    return true;
  }
}
