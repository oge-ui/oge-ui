import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeColumn } from '../columns/column';

export interface OgeHeaderTemplateContext<T = unknown> {
  /** The column whose header is being rendered (`let column`). */
  $implicit: OgeColumn<T>;
}

/**
 * Structural directive projecting custom header content into a column:
 *
 * ```html
 * <oge-column field="amount">
 *   <strong *ogeHeaderTemplate="let column">{{ column.caption() }} (₺)</strong>
 * </oge-column>
 * ```
 */
@Directive({ selector: '[ogeHeaderTemplate]' })
export class OgeHeaderTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeHeaderTemplateContext<T>>);

  static ngTemplateContextGuard<T>(
    _dir: OgeHeaderTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeHeaderTemplateContext<T> {
    return true;
  }
}
