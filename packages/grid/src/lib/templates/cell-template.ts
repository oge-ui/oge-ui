import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeColumn } from '../columns/column';

export interface OgeCellTemplateContext<T = unknown> {
  /** The cell value (`let value`). */
  $implicit: unknown;
  /** The full data row (`row as r`). */
  row: T;
  /** Zero-based index of the row within the rendered data. */
  rowIndex: number;
  column: OgeColumn<T>;
}

/**
 * Structural directive projecting custom cell content into a column:
 *
 * ```html
 * <oge-column field="status">
 *   <span *ogeCellTemplate="let value; row as order" class="badge">{{ value }}</span>
 * </oge-column>
 * ```
 */
@Directive({ selector: '[ogeCellTemplate]' })
export class OgeCellTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeCellTemplateContext<T>>);

  static ngTemplateContextGuard<T>(
    _dir: OgeCellTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeCellTemplateContext<T> {
    return true;
  }
}
