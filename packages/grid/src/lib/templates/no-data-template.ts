import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Structural directive replacing the default "No data" text:
 *
 * ```html
 * <oge-grid [data]="rows" keyField="id">
 *   <div *ogeNoDataTemplate class="my-empty-state">Nothing here yet.</div>
 * </oge-grid>
 * ```
 */
@Directive({ selector: '[ogeNoDataTemplate]' })
export class OgeNoDataTemplate {
  readonly templateRef = inject(TemplateRef<unknown>);
}
