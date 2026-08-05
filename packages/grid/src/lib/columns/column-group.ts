import { Directive, contentChildren, input } from '@angular/core';
import { OgeColumn } from './column';

/**
 * Banded columns: wraps child columns under one shared header band.
 *
 * ```html
 * <oge-grid [data]="rows">
 *   <oge-column field="id" />
 *   <oge-column-group caption="Contact">
 *     <oge-column field="phone" />
 *     <oge-column field="email" />
 *   </oge-column-group>
 * </oge-grid>
 * ```
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'oge-column-group' })
export class OgeColumnGroup<T = unknown> {
  readonly caption = input.required<string>();
  readonly columns = contentChildren<OgeColumn<T>>(OgeColumn);
}
