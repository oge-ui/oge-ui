'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  OGE_TIMELINE_DEFAULT_DATE_FORMAT,
  ogeTimelineHasOpposite,
  ogeTimelineItemSide,
  ogeTimelineTime,
  type OgeTimelineAlign,
  type OgeTimelineItem,
  type OgeTimelineOrientation,
} from '@oge-ui/behavior';
import { useOgeTimelineConfig } from './layout-config';

/** Argument of every timeline render prop (content, marker, opposite). */
export interface OgeTimelineItemRenderContext {
  /** The entry being rendered. */
  item: OgeTimelineItem;
  /** Its position in `items`. */
  index: number;
  /** The side of the axis its content sits on. */
  side: 'start' | 'end';
  /** Whether it is the first entry. */
  first: boolean;
  /** Whether it is the last entry (no connector after it). */
  last: boolean;
}

export interface OgeTimelineProps {
  /** The entries, in display order (the list's order is its meaning). */
  items?: readonly OgeTimelineItem[];
  /** Axis of the timeline. Default: config, else `vertical`. */
  orientation?: OgeTimelineOrientation;
  /**
   * Side of the axis the content sits on — `start` / `end` (logical, RTL
   * mirrors), `alternate` (from `end`) or `alternate-reverse` (from `start`).
   * Default: config, else `end`.
   */
  align?: OgeTimelineAlign;
  /** `Intl.DateTimeFormat` options of `Date` times. Default: medium date + short time. */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** BCP 47 locale of `Date` times. Default: config, else the runtime locale. */
  locale?: string;
  /** Accessible name of the list ("Order history"). */
  ariaLabel?: string;
  /** Replaces the built-in title / description / time block of every entry. */
  renderContent?: (context: OgeTimelineItemRenderContext) => ReactNode;
  /** Replaces the dot on the axis (decoration — say it in the content too). */
  renderMarker?: (context: OgeTimelineItemRenderContext) => ReactNode;
  /** Replaces the opposite-side text of an alternating timeline. */
  renderOpposite?: (context: OgeTimelineItemRenderContext) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A chronological sequence of events drawn along an axis — the React render
 * of the Angular `<oge-timeline>`, same markup and stylesheet. An **ordered
 * list**: the order is the meaning, the list announces its size and each
 * position, and the marker and connector are `aria-hidden` decoration. No
 * roles and no keyboard model are added — interactive content inside an
 * entry stays in the normal Tab order.
 *
 * ```tsx
 * <OgeTimeline
 *   ariaLabel="Order history"
 *   align="alternate"
 *   items={[
 *     { title: 'Ordered', time: orderedAt, severity: 'success' },
 *     { title: 'Shipped', time: shippedAt },
 *   ]}
 * />
 * ```
 */
export function OgeTimeline(props: OgeTimelineProps) {
  const config = useOgeTimelineConfig();
  const items = props.items ?? [];
  const orientation = props.orientation ?? config.orientation ?? 'vertical';
  const align = props.align ?? config.align ?? 'end';
  const hasOpposite = ogeTimelineHasOpposite(align);
  const locale = props.locale ?? config.locale;
  const format =
    props.dateFormat ?? config.dateFormat ?? OGE_TIMELINE_DEFAULT_DATE_FORMAT;

  const className = [
    'oge-timeline',
    orientation === 'vertical'
      ? 'oge-timeline-vertical'
      : 'oge-timeline-horizontal',
    hasOpposite && 'oge-timeline-alternating',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={props.style}>
      <ol
        className="oge-timeline-list"
        aria-label={props.ariaLabel || undefined}
      >
        {items.map((item, index) => {
          const context: OgeTimelineItemRenderContext = {
            item,
            index,
            side: ogeTimelineItemSide(index, align),
            first: index === 0,
            last: index === items.length - 1,
          };
          const time = ogeTimelineTime(item.time, locale, format);
          const timeInOpposite = hasOpposite && !item.opposite && time !== null;
          const timeEl = time ? (
            <time
              className="oge-timeline-time"
              dateTime={time.dateTime ?? undefined}
            >
              {time.text}
            </time>
          ) : null;
          const itemClass = [
            'oge-timeline-item',
            context.side === 'start'
              ? 'oge-timeline-item-start'
              : 'oge-timeline-item-end',
            context.last && 'oge-timeline-item-last',
            `oge-timeline-severity-${item.severity ?? 'accent'}`,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={item.key ?? index} className={itemClass}>
              {hasOpposite && (
                <div className="oge-timeline-opposite">
                  {props.renderOpposite
                    ? props.renderOpposite(context)
                    : timeInOpposite
                      ? timeEl
                      : (item.opposite ?? null)}
                </div>
              )}
              <div className="oge-timeline-separator" aria-hidden="true">
                {props.renderMarker ? (
                  <span className="oge-timeline-marker oge-timeline-marker-custom">
                    {props.renderMarker(context)}
                  </span>
                ) : (
                  <span
                    className={[
                      'oge-timeline-marker',
                      item.variant === 'outlined' &&
                        'oge-timeline-marker-outlined',
                      item.icon && 'oge-timeline-marker-icon',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {item.icon && (
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        focusable="false"
                      >
                        <path d={item.icon} />
                      </svg>
                    )}
                  </span>
                )}
                {!context.last && (
                  <span className="oge-timeline-connector"></span>
                )}
              </div>
              <div className="oge-timeline-content">
                {props.renderContent ? (
                  props.renderContent(context)
                ) : (
                  <>
                    {!timeInOpposite && timeEl}
                    {item.title && (
                      <span className="oge-timeline-title">{item.title}</span>
                    )}
                    {item.description && (
                      <span className="oge-timeline-description">
                        {item.description}
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
