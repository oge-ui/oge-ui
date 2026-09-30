import { Directive, input } from '@angular/core';

/** Which group of the grid toolbar an `[ogeToolbar]` item joins. */
export type OgeGridToolbarPosition = 'before' | 'center' | 'after';

/**
 * Marks projected content as a grid toolbar item. The toolbar renders
 * whenever at least one item is present, alongside the built-in controls.
 * The attribute value picks the group — `before` (start edge, e.g. filters
 * and primary actions), `center`, or `after` (the default: next to the
 * built-in tools):
 *
 * ```html
 * <oge-grid [data]="rows" keyField="id">
 *   <button ogeToolbar="before" type="button" (click)="add()">New</button>
 *   <button ogeToolbar type="button" (click)="export()">Export</button>
 * </oge-grid>
 * ```
 *
 * The value must be a static attribute (`ogeToolbar="before"`, not
 * `[ogeToolbar]="…"`): Angular assigns projected content to a slot when the
 * template is compiled, before any binding runs.
 *
 * The class is prefixed `OgeGrid…` while the selector stays `[ogeToolbar]`
 * because `@oge-ui/layout` owns the unqualified `OgeToolbarItem` — the
 * declarative child of `<oge-toolbar>`. Two symbols of the same name would be
 * silently dropped by the `oge-ui` umbrella's star re-exports.
 */
@Directive({ selector: '[ogeToolbar]' })
export class OgeGridToolbarItem {
  /** Toolbar group; empty (the bare attribute) means `'after'`. */
  readonly position = input<OgeGridToolbarPosition | ''>('', {
    alias: 'ogeToolbar',
  });
}
