import { Directive, TemplateRef, inject, input } from '@angular/core';

export interface OgeDetailTemplateContext<T = unknown> {
  /** The parent data row (`let row`). */
  $implicit: T;
}

/**
 * Structural directive rendering a master-detail row below an expanded data row:
 *
 * ```html
 * <oge-grid [data]="orders" keyField="id">
 *   <oge-column field="id" />
 *   <!-- `of: orders` only feeds type inference so `order` is fully typed -->
 *   <div *ogeDetailTemplate="let order; of: orders">
 *     <app-order-lines [orderId]="order.id" />
 *   </div>
 * </oge-grid>
 * ```
 */
@Directive({ selector: '[ogeDetailTemplate]' })
export class OgeDetailTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeDetailTemplateContext<T>>);

  /** Type-inference helper (NgFor-style): pass the grid's data so `let row` is typed. */
  readonly ogeDetailTemplateOf = input<readonly T[] | undefined>(undefined);

  static ngTemplateContextGuard<T>(
    _dir: OgeDetailTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeDetailTemplateContext<T> {
    return true;
  }
}
