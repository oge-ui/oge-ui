import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeToolbarItemTemplateContext } from './toolbar-types';

/**
 * Replaces the default rendering of every data-driven `items` entry — the
 * escape hatch that stands in for the reference libraries' string-keyed
 * `widget` + `options` bag:
 *
 * ```html
 * <oge-toolbar [items]="tools">
 *   <ng-template ogeToolbarItemTemplate let-item let-index="index">
 *     <oge-select-box [items]="views" [value]="item.data" />
 *   </ng-template>
 * </oge-toolbar>
 * ```
 *
 * Declarative `<oge-toolbar-item>` children use their own projected content
 * instead; a component-level template never steals it.
 */
@Directive({ selector: '[ogeToolbarItemTemplate]' })
export class OgeToolbarItemTemplate {
  readonly templateRef = inject(TemplateRef<OgeToolbarItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeToolbarItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeToolbarItemTemplateContext {
    return true;
  }
}

/**
 * Replaces the default rendering of an item **inside the overflow menu**
 * (the reference `menuItemTemplate`). Without it a collapsed item renders as
 * its `text` plus icon, which is the right default for a menu row:
 *
 * ```html
 * <oge-toolbar [items]="tools">
 *   <ng-template ogeToolbarMenuItemTemplate let-item>
 *     <span class="my-menu-row">{{ item.text }}</span>
 *   </ng-template>
 * </oge-toolbar>
 * ```
 */
@Directive({ selector: '[ogeToolbarMenuItemTemplate]' })
export class OgeToolbarMenuItemTemplate {
  readonly templateRef = inject(TemplateRef<OgeToolbarItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeToolbarMenuItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeToolbarItemTemplateContext {
    return true;
  }
}
