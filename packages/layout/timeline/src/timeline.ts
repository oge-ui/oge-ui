import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  OGE_TIMELINE_DEFAULT_DATE_FORMAT,
  ogeTimelineHasOpposite,
  ogeTimelineItemSide,
  ogeTimelineTime,
  type OgeTimelineAlign,
  type OgeTimelineItem,
  type OgeTimelineOrientation,
  type OgeTimelineTime,
} from '@oge-ui/behavior';
import { OGE_TIMELINE_CONFIG } from './config';
import {
  OgeTimelineContentTemplate,
  OgeTimelineMarkerTemplate,
  OgeTimelineOppositeTemplate,
  type OgeTimelineItemTemplateContext,
} from './templates';

/** One entry with everything the template needs, resolved once. */
interface TimelineRow {
  readonly item: OgeTimelineItem;
  readonly key: string | number;
  readonly context: OgeTimelineItemTemplateContext;
  readonly time: OgeTimelineTime | null;
  /** Text of the opposite column (alternating layouts only). */
  readonly oppositeText: string | null;
  /** Whether the time renders in the opposite column instead of the content. */
  readonly timeInOpposite: boolean;
}

/**
 * A chronological sequence of events drawn along an axis — an order history,
 * an activity feed, release notes:
 *
 * ```html
 * <oge-timeline
 *   ariaLabel="Order history"
 *   [items]="[
 *     { title: 'Ordered', time: orderedAt, severity: 'success' },
 *     { title: 'Shipped', time: shippedAt },
 *     { title: 'Delivered', variant: 'outlined' },
 *   ]"
 * />
 * ```
 *
 * Rendered as an **ordered list** (`<ol>` / `<li>`): the order is the
 * meaning, and a list announces its size and each position. There is no APG
 * timeline pattern and nothing here is interactive by itself, so it adds no
 * roles and no keyboard model; links or buttons inside an entry stay in the
 * normal Tab order. The marker and the connector line are `aria-hidden`
 * decoration. `align="alternate"` swaps sides per entry and shows each
 * entry's `opposite` text (or its time) on the other side;
 * `orientation="horizontal"` lays the entries out in a row.
 */
@Component({
  selector: 'oge-timeline',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-timeline',
    '[class.oge-timeline-vertical]': "resolvedOrientation() === 'vertical'",
    '[class.oge-timeline-horizontal]': "resolvedOrientation() === 'horizontal'",
    '[class.oge-timeline-alternating]': 'hasOpposite()',
  },
  template: `
    <ol class="oge-timeline-list" [attr.aria-label]="ariaLabel() || null">
      @for (row of rows(); track row.key) {
        <li
          class="oge-timeline-item"
          [class.oge-timeline-item-start]="row.context.side === 'start'"
          [class.oge-timeline-item-end]="row.context.side === 'end'"
          [class.oge-timeline-item-last]="row.context.last"
          [class]="'oge-timeline-severity-' + (row.item.severity ?? 'accent')"
        >
          @if (hasOpposite()) {
            <div class="oge-timeline-opposite">
              @if (oppositeTemplate(); as tpl) {
                <ng-container
                  [ngTemplateOutlet]="tpl.templateRef"
                  [ngTemplateOutletContext]="row.context"
                />
              } @else if (row.timeInOpposite && row.time) {
                <time
                  class="oge-timeline-time"
                  [attr.datetime]="row.time.dateTime"
                  >{{ row.time.text }}</time
                >
              } @else if (row.oppositeText) {
                {{ row.oppositeText }}
              }
            </div>
          }
          <div class="oge-timeline-separator" aria-hidden="true">
            @if (markerTemplate(); as tpl) {
              <span class="oge-timeline-marker oge-timeline-marker-custom">
                <ng-container
                  [ngTemplateOutlet]="tpl.templateRef"
                  [ngTemplateOutletContext]="row.context"
                />
              </span>
            } @else {
              <span
                class="oge-timeline-marker"
                [class.oge-timeline-marker-outlined]="
                  row.item.variant === 'outlined'
                "
                [class.oge-timeline-marker-icon]="!!row.item.icon"
              >
                @if (row.item.icon) {
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    focusable="false"
                  >
                    <path [attr.d]="row.item.icon" />
                  </svg>
                }
              </span>
            }
            @if (!row.context.last) {
              <span class="oge-timeline-connector"></span>
            }
          </div>
          <div class="oge-timeline-content">
            @if (contentTemplate(); as tpl) {
              <ng-container
                [ngTemplateOutlet]="tpl.templateRef"
                [ngTemplateOutletContext]="row.context"
              />
            } @else {
              @if (row.time && !row.timeInOpposite) {
                <time
                  class="oge-timeline-time"
                  [attr.datetime]="row.time.dateTime"
                  >{{ row.time.text }}</time
                >
              }
              @if (row.item.title) {
                <span class="oge-timeline-title">{{ row.item.title }}</span>
              }
              @if (row.item.description) {
                <span class="oge-timeline-description">{{
                  row.item.description
                }}</span>
              }
            }
          </div>
        </li>
      }
    </ol>
  `,
  styleUrl: './timeline.scss',
})
export class OgeTimeline {
  private readonly config = inject(OGE_TIMELINE_CONFIG);
  private readonly localeId = inject(LOCALE_ID);

  /** The entries, in display order (the list's order is its meaning). */
  readonly items = input<readonly OgeTimelineItem[]>([]);
  /** Axis of the timeline. Default: config, else `vertical`. */
  readonly orientation = input<OgeTimelineOrientation | undefined>(undefined);
  /**
   * Side of the axis the content sits on — `start` / `end` (logical, RTL
   * mirrors), `alternate` (from `end`) or `alternate-reverse` (from `start`).
   * Default: config, else `end`.
   */
  readonly align = input<OgeTimelineAlign | undefined>(undefined);
  /** `Intl.DateTimeFormat` options of `Date` times. Default: medium date + short time. */
  readonly dateFormat = input<Intl.DateTimeFormatOptions | undefined>(
    undefined,
  );
  /** BCP 47 locale of `Date` times. Default: config, else `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /** Accessible name of the list ("Order history"). */
  readonly ariaLabel = input<string | undefined>(undefined);

  protected readonly contentTemplate = contentChild(OgeTimelineContentTemplate);
  protected readonly markerTemplate = contentChild(OgeTimelineMarkerTemplate);
  protected readonly oppositeTemplate = contentChild(
    OgeTimelineOppositeTemplate,
  );

  protected readonly resolvedOrientation = computed<OgeTimelineOrientation>(
    () => this.orientation() ?? this.config.orientation ?? 'vertical',
  );
  protected readonly resolvedAlign = computed<OgeTimelineAlign>(
    () => this.align() ?? this.config.align ?? 'end',
  );
  protected readonly hasOpposite = computed(() =>
    ogeTimelineHasOpposite(this.resolvedAlign()),
  );

  protected readonly rows = computed<TimelineRow[]>(() => {
    const items = this.items();
    const align = this.resolvedAlign();
    const opposite = this.hasOpposite();
    const locale = this.locale() ?? this.config.locale ?? this.localeId;
    const format =
      this.dateFormat() ??
      this.config.dateFormat ??
      OGE_TIMELINE_DEFAULT_DATE_FORMAT;
    return items.map((item, index) => {
      const time = ogeTimelineTime(item.time, locale, format);
      const timeInOpposite = opposite && !item.opposite && time !== null;
      return {
        item,
        key: item.key ?? index,
        time,
        oppositeText: item.opposite ?? null,
        timeInOpposite,
        context: {
          $implicit: item,
          index,
          side: ogeTimelineItemSide(index, align),
          first: index === 0,
          last: index === items.length - 1,
        },
      };
    });
  });
}
