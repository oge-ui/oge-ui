import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { RowKey } from '@oge-ui/core';

export interface OgeRowTemplateContext<T = unknown> {
  /** The data row (`let row`). */
  $implicit: T;
  /** Flat view index of the row. */
  index: number;
  key: RowKey;
}

/**
 * Structural directive replacing the entire content of every data row —
 * selection, keyboard focus and virtualization keep working around it:
 *
 * ```html
 * <oge-grid [data]="orders" keyField="id" [autoRowHeight]="true" [virtualScroll]="true">
 *   <div *ogeRowTemplate="let order; of: orders" class="my-card">
 *     {{ order.title }}
 *   </div>
 * </oge-grid>
 * ```
 */
@Directive({ selector: '[ogeRowTemplate]' })
export class OgeRowTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeRowTemplateContext<T>>);

  /** Type-inference helper (NgFor-style): pass the grid's data so `let row` is typed. */
  readonly ogeRowTemplateOf = input<readonly T[] | undefined>(undefined);

  static ngTemplateContextGuard<T>(
    _dir: OgeRowTemplate<T>,
    _ctx: unknown
  ): _ctx is OgeRowTemplateContext<T> {
    return true;
  }
}
