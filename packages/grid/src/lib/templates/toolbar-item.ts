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
 *
 * The class is prefixed `OgeGrid…` while the selector stays `[ogeToolbar]`
 * because `@oge-ui/layout` owns the unqualified `OgeToolbarItem` — the
 * declarative child of `<oge-toolbar>`. Two symbols of the same name would be
 * silently dropped by the `oge-ui` umbrella's star re-exports.
 */
@Directive({ selector: '[ogeToolbar]' })
export class OgeGridToolbarItem {}
