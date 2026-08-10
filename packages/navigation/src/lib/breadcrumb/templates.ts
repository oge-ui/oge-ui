import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  OgeBreadcrumbItemTemplateContext,
  OgeBreadcrumbSeparatorTemplateContext,
} from './breadcrumb-types';

/**
 * Custom rendering for the crumbs (icons, badges…):
 *
 * ```html
 * <oge-breadcrumb [items]="trail">
 *   <ng-template ogeBreadcrumbItemTemplate let-item let-last="last">
 *     <strong [class.underline]="!last">{{ item.text }}</strong>
 *   </ng-template>
 * </oge-breadcrumb>
 * ```
 *
 * The template replaces the crumb's interior only — the link/current/disabled
 * element semantics stay with the component.
 */
@Directive({ selector: 'ng-template[ogeBreadcrumbItemTemplate]' })
export class OgeBreadcrumbItemTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeBreadcrumbItemTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeBreadcrumbItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeBreadcrumbItemTemplateContext {
    return true;
  }
}

/**
 * Replaces the default chevron separator. Rendered `aria-hidden` — a
 * separator is decoration, never content (APG breadcrumb note):
 *
 * ```html
 * <ng-template ogeBreadcrumbSeparatorTemplate>·</ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[ogeBreadcrumbSeparatorTemplate]' })
export class OgeBreadcrumbSeparatorTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeBreadcrumbSeparatorTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeBreadcrumbSeparatorTemplate,
    _ctx: unknown,
  ): _ctx is OgeBreadcrumbSeparatorTemplateContext {
    return true;
  }
}
