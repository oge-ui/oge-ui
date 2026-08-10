import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeMenubarItemTemplateContext } from './menubar-types';

/**
 * Custom rendering for the menubar's **top-level** items (icons, badges…):
 *
 * ```html
 * <oge-menubar [items]="menu">
 *   <ng-template ogeMenubarItemTemplate let-item let-index="index">
 *     <strong>{{ item.text }}</strong>
 *   </ng-template>
 * </oge-menubar>
 * ```
 *
 * Submenu rows keep the shared `oge-menu-list` rendering.
 */
@Directive({ selector: 'ng-template[ogeMenubarItemTemplate]' })
export class OgeMenubarItemTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeMenubarItemTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeMenubarItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeMenubarItemTemplateContext {
    return true;
  }
}
