import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeTimelineItem } from '@oge-ui/behavior';

/** Context of every timeline template slot (content, marker, opposite). */
export interface OgeTimelineItemTemplateContext {
  /** The entry being rendered. */
  $implicit: OgeTimelineItem;
  /** Its position in `items`. */
  index: number;
  /** The side of the axis its content sits on. */
  side: 'start' | 'end';
  /** Whether it is the first entry. */
  first: boolean;
  /** Whether it is the last entry (no connector after it). */
  last: boolean;
}

/**
 * Replaces the built-in title / description / time block of every entry:
 *
 * ```html
 * <oge-timeline [items]="events">
 *   <ng-template ogeTimelineContentTemplate let-item let-index="index">
 *     <strong>{{ item.title }}</strong> <a [href]="item.link">Details</a>
 *   </ng-template>
 * </oge-timeline>
 * ```
 *
 * The content is ordinary flow content: links and buttons stay in the Tab
 * order (the timeline adds no keyboard model).
 */
@Directive({ selector: '[ogeTimelineContentTemplate]' })
export class OgeTimelineContentTemplate {
  readonly templateRef = inject(TemplateRef<OgeTimelineItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTimelineContentTemplate,
    _ctx: unknown,
  ): _ctx is OgeTimelineItemTemplateContext {
    return true;
  }
}

/**
 * Replaces the dot drawn on the axis (an avatar, a step number). The marker
 * column is `aria-hidden` decoration, so whatever it shows must also be said
 * in the content.
 */
@Directive({ selector: '[ogeTimelineMarkerTemplate]' })
export class OgeTimelineMarkerTemplate {
  readonly templateRef = inject(TemplateRef<OgeTimelineItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTimelineMarkerTemplate,
    _ctx: unknown,
  ): _ctx is OgeTimelineItemTemplateContext {
    return true;
  }
}

/**
 * Replaces the opposite-side text of an alternating timeline (by default the
 * entry's `opposite`, else its time).
 */
@Directive({ selector: '[ogeTimelineOppositeTemplate]' })
export class OgeTimelineOppositeTemplate {
  readonly templateRef = inject(TemplateRef<OgeTimelineItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTimelineOppositeTemplate,
    _ctx: unknown,
  ): _ctx is OgeTimelineItemTemplateContext {
    return true;
  }
}
