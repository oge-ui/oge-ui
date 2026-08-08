import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  OgeTabContentTemplateContext,
  OgeTabHeaderTemplateContext,
} from './tabs-types';

/**
 * Structural directive projecting custom tab header content (icons, badges,
 * rich markup). Declared inside an `<oge-tab>` it styles that tab only;
 * declared directly inside `oge-tabs` / `oge-tab-panel` it applies to every
 * data-driven `items` tab:
 *
 * ```html
 * <oge-tab-panel [items]="docs">
 *   <ng-template ogeTabHeaderTemplate let-item let-selected="selected">
 *     <strong>{{ item.text }}</strong>
 *   </ng-template>
 * </oge-tab-panel>
 * ```
 */
@Directive({ selector: '[ogeTabHeaderTemplate]' })
export class OgeTabHeaderTemplate {
  readonly templateRef = inject(TemplateRef<OgeTabHeaderTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTabHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeTabHeaderTemplateContext {
    return true;
  }
}

/**
 * Structural directive marking tab panel content as lazily instantiated: the
 * template is created on first activation (`deferRendering`) and destroyed
 * again when the tab deactivates with `keepAlive` off. Inside an `<oge-tab>`
 * it replaces the eagerly created projected content; directly inside
 * `oge-tab-panel` it renders the content of every data-driven `items` tab:
 *
 * ```html
 * <oge-tab text="Report">
 *   <ng-template ogeTabContentTemplate>
 *     <app-heavy-report />
 *   </ng-template>
 * </oge-tab>
 * ```
 */
@Directive({ selector: '[ogeTabContentTemplate]' })
export class OgeTabContentTemplate {
  readonly templateRef = inject(TemplateRef<OgeTabContentTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTabContentTemplate,
    _ctx: unknown,
  ): _ctx is OgeTabContentTemplateContext {
    return true;
  }
}
