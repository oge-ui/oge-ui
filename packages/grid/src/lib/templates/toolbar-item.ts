import { Directive } from '@angular/core';

/**
 * Marks projected content as a grid toolbar item. The toolbar renders
 * whenever at least one item is present, alongside the built-in controls:
 *
 * ```html
 * <oge-grid [data]="rows" keyField="id">
 *   <button ogeToolbar type="button" (click)="export()">Export</button>
 * </oge-grid>
 * ```
 */
@Directive({ selector: '[ogeToolbar]' })
export class OgeToolbarItem {}
