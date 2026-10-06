import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeDrawerItemTemplateContext } from './drawer-types';

/**
 * Structural directive replacing the **content** of a built-in drawer entry
 * (`items`). The drawer keeps rendering the `<a>` / `<button>` around it —
 * with `aria-current`, the disabled state and the mini-rail tooltip — so
 * the template must not add a focusable control of its own:
 *
 * ```html
 * <oge-drawer [items]="nav" [(selectedKey)]="page">
 *   <ng-template ogeDrawerItemTemplate let-item let-rail="rail">
 *     <strong>{{ item.text }}</strong>
 *     @if (!rail) {
 *       <small>{{ item.key }}</small>
 *     }
 *   </ng-template>
 * </oge-drawer>
 * ```
 */
@Directive({ selector: '[ogeDrawerItemTemplate]' })
export class OgeDrawerItemTemplate {
  readonly templateRef = inject(TemplateRef<OgeDrawerItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeDrawerItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeDrawerItemTemplateContext {
    return true;
  }
}
