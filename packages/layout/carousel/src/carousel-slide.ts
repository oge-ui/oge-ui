import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  input,
  viewChild,
} from '@angular/core';

let nextSlideId = 0;

/**
 * One declarative slide of an `oge-carousel`. Projected content is the slide
 * body; declarative slides render before the `items` slides (children first):
 *
 * ```html
 * <oge-carousel ariaLabel="Highlights">
 *   <oge-carousel-slide label="Spring sale" thumbnail="/img/spring-thumb.jpg">
 *     <img src="/img/spring.jpg" alt="Flowers on a market stall" />
 *   </oge-carousel-slide>
 *   <oge-carousel-slide label="New arrivals">…</oge-carousel-slide>
 * </oge-carousel>
 * ```
 *
 * Renders nothing itself — the carousel stamps the captured content into its
 * own slide wrapper, which carries the APG roles, the "N of M" name and the
 * `inert` state of off-screen slides.
 */
@Component({
  selector: 'oge-carousel-slide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-template #contentTpl><ng-content /></ng-template>`,
})
export class OgeCarouselSlide {
  /** Stable identity for the render loop. */
  readonly autoId = `s${nextSlideId++}`;

  /** Accessible name prefix of the slide ("Spring sale, 1 of 4"). */
  readonly label = input<string | undefined>(undefined);
  /** Thumbnail URL for `indicators="thumbnails"`. */
  readonly thumbnail = input<string | undefined>(undefined);
  /** `false` removes the slide. */
  readonly visible = input(true);

  /** Captured projected content, stamped by the carousel. */
  readonly contentTemplateRef = viewChild<TemplateRef<unknown>>('contentTpl');
}
