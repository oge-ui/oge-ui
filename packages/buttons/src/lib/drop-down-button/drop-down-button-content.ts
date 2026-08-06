import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeDropDownContentContext } from './drop-down-button-types';

/**
 * Replaces the drop-down button's item menu with arbitrary panel content.
 * The implicit template variable closes the panel:
 *
 * ```html
 * <oge-drop-down-button text="Filters">
 *   <div *ogeDropDownContent="let close">
 *     …custom panel…
 *     <oge-button text="Apply" (clicked)="apply(); close()" />
 *   </div>
 * </oge-drop-down-button>
 * ```
 */
@Directive({ selector: '[ogeDropDownContent]' })
export class OgeDropDownContent {
  readonly templateRef = inject(TemplateRef<OgeDropDownContentContext>);

  static ngTemplateContextGuard(
    _dir: OgeDropDownContent,
    _ctx: unknown,
  ): _ctx is OgeDropDownContentContext {
    return true;
  }
}
