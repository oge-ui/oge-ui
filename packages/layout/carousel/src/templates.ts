import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeCarouselItem } from '@oge-ui/behavior';

/** Context of an `[ogeCarouselSlideTemplate]` — one data-driven slide. */
export interface OgeCarouselSlideTemplateContext {
  /** The slide item (also the implicit `let-item`). */
  $implicit: OgeCarouselItem;
  /** Index of the slide among all slides. */
  index: number;
  /** Number of slides. */
  count: number;
  /** Whether the slide is currently in view. */
  active: boolean;
}

/**
 * Replaces the built-in image + caption of every `items` slide. The carousel
 * keeps the slide's group role, its "N of M" name and the hiding of
 * off-screen slides (`inert`), so the template only draws the content:
 *
 * ```html
 * <oge-carousel [items]="products">
 *   <ng-template ogeCarouselSlideTemplate let-item let-active="active">
 *     <h3>{{ item.title }}</h3>
 *     <a [href]="'/products/' + item.key">View details</a>
 *   </ng-template>
 * </oge-carousel>
 * ```
 */
@Directive({ selector: '[ogeCarouselSlideTemplate]' })
export class OgeCarouselSlideTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeCarouselSlideTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeCarouselSlideTemplate,
    _ctx: unknown,
  ): _ctx is OgeCarouselSlideTemplateContext {
    return true;
  }
}
