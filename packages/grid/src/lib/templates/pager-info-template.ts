import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgePagerInfoContext } from '@oge-ui/behavior';

/** Template context of `*ogePagerInfoTemplate` — `let info` is the whole context. */
export interface OgePagerInfoTemplateContext extends OgePagerInfoContext {
  $implicit: OgePagerInfoContext;
}

/**
 * Replaces the pager's info text (`{count} rows`) — on a grid or on a
 * stand-alone `<oge-pager>`:
 *
 * ```html
 * <oge-grid [data]="orders" [paging]="{ pageSize: 10 }">
 *   <span *ogePagerInfoTemplate="let info">
 *     {{ info.firstRow }}–{{ info.lastRow }} of {{ info.totalCount }}
 *   </span>
 * </oge-grid>
 * ```
 */
@Directive({ selector: '[ogePagerInfoTemplate]' })
export class OgePagerInfoTemplate {
  readonly templateRef = inject(TemplateRef<OgePagerInfoTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgePagerInfoTemplate,
    _ctx: unknown,
  ): _ctx is OgePagerInfoTemplateContext {
    return true;
  }
}
