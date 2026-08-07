import { Directive, TemplateRef, inject } from '@angular/core';
import type { FormControl } from '@angular/forms';
import type { OgeColumn } from '../columns/column';

export interface OgeEditTemplateContext<T = unknown> {
  /** The reactive control driving this editor (`let control`). */
  $implicit: FormControl<unknown>;
  /** The row being edited (with pending changes applied). */
  row: T;
  column: OgeColumn<T>;
}

/**
 * Structural directive replacing the default editor of a column:
 *
 * ```html
 * <oge-column field="status">
 *   <select *ogeEditTemplate="let control" [formControl]="control" class="...">
 *     <option>Pending</option><option>Shipped</option>
 *   </select>
 * </oge-column>
 * ```
 */
@Directive({ selector: '[ogeEditTemplate]' })
export class OgeEditTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeEditTemplateContext<T>>);

  static ngTemplateContextGuard<T>(
    _dir: OgeEditTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeEditTemplateContext<T> {
    return true;
  }
}
