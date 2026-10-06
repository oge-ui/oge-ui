/**
 * The framework-free half of the timeline (W8a): the vocabulary, the config,
 * the side an item renders on, and the `<time>` text + `datetime` attribute
 * of an item's timestamp.
 *
 * Semantics: a timeline is an **ordered list** (`<ol>` / `<li>`) — the order
 * is the meaning, and a list announces its size and each position. There is
 * no APG timeline pattern and nothing in it is interactive by itself, so it
 * adds no roles and no keyboard model; interactive content inside an item
 * (links, buttons) stays in the normal Tab order. The connector line and the
 * marker are `aria-hidden` decoration.
 */
import { ogeDateTimeFormat } from '@oge-ui/core';

/** Axis of the timeline. */
export type OgeTimelineOrientation = 'vertical' | 'horizontal';

/**
 * Which side of the axis the content sits on. `start` / `end` put every item
 * on one side (logical, so RTL mirrors), `alternate` starts at `end` and
 * swaps per item, `alternate-reverse` starts at `start`. Alternating layouts
 * show the item's `opposite` text on the other side.
 */
export type OgeTimelineAlign =
  'start' | 'end' | 'alternate' | 'alternate-reverse';

/** Marker colour — the suite's severity vocabulary plus `neutral`. */
export type OgeTimelineSeverity =
  'accent' | 'neutral' | 'success' | 'warning' | 'danger';

/** `filled` is a solid marker, `outlined` a ring (pending / future items). */
export type OgeTimelineMarkerVariant = 'filled' | 'outlined';

/** One entry of a timeline. */
export interface OgeTimelineItem {
  /** Stable identity for the render loop; the index is used without one. */
  key?: string | number;
  /** Heading of the entry. */
  title?: string;
  /** Body text. */
  description?: string;
  /**
   * When it happened: a `Date` is formatted in the timeline's locale and
   * written into `<time datetime>`; a string is shown verbatim.
   */
  time?: Date | string;
  /** Text for the opposite side of an alternating timeline (often the time). */
  opposite?: string;
  /** Marker colour. */
  severity?: OgeTimelineSeverity;
  /** Marker style. */
  variant?: OgeTimelineMarkerVariant;
  /** SVG path data (`d`) of an icon drawn inside a larger marker. */
  icon?: string;
}

/**
 * Application-wide defaults for `oge-timeline`. There is deliberately no
 * `messages` block: the timeline renders no user-facing strings of its own
 * (its accessible name, when it needs one, is the application's
 * `ariaLabel`). The moment one appears it must move into a messages
 * interface, per the house i18n rule.
 */
export interface OgeTimelineConfig {
  /** Default for the `orientation` input. */
  orientation?: OgeTimelineOrientation;
  /** Default for the `align` input. */
  align?: OgeTimelineAlign;
  /** Default for the `dateFormat` input. */
  dateFormat?: Intl.DateTimeFormatOptions;
  /**
   * BCP 47 locale `Date` times are formatted in; `undefined` = the
   * application locale (Angular `LOCALE_ID`, React the runtime default).
   */
  locale?: string;
}

export const OGE_DEFAULT_TIMELINE_CONFIG: OgeTimelineConfig = {};

export type OgeTimelineConfigInput = Partial<OgeTimelineConfig>;

export function resolveOgeTimelineConfig(
  input: OgeTimelineConfigInput | undefined,
): OgeTimelineConfig {
  return { ...OGE_DEFAULT_TIMELINE_CONFIG, ...input };
}

/** The default `Date` format of an item's time: medium date + short time. */
export const OGE_TIMELINE_DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

/** The side the content of item `index` renders on. */
export function ogeTimelineItemSide(
  index: number,
  align: OgeTimelineAlign,
): 'start' | 'end' {
  switch (align) {
    case 'start':
      return 'start';
    case 'end':
      return 'end';
    case 'alternate':
      return index % 2 === 0 ? 'end' : 'start';
    case 'alternate-reverse':
      return index % 2 === 0 ? 'start' : 'end';
  }
}

/** Whether an alignment renders the opposite column at all. */
export function ogeTimelineHasOpposite(align: OgeTimelineAlign): boolean {
  return align === 'alternate' || align === 'alternate-reverse';
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/**
 * A `Date` as a local `YYYY-MM-DDTHH:mm:ss` `datetime` attribute — built
 * from the local fields (never `toISOString`, which would shift it to UTC
 * and change the calendar day for anyone east or west of Greenwich).
 */
export function ogeTimelineDateTimeAttr(date: Date): string {
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Text and `datetime` attribute of an item's time. */
export interface OgeTimelineTime {
  text: string;
  /** `null` for a free-text time — no `<time datetime>` claim is made. */
  dateTime: string | null;
}

/**
 * Formats an item's `time`: a valid `Date` through the core Intl cache in
 * `locale` with `format` (default medium date + short time), a string
 * verbatim; `null` when there is no (valid) time.
 */
export function ogeTimelineTime(
  time: Date | string | null | undefined,
  locale?: string,
  format?: Intl.DateTimeFormatOptions,
): OgeTimelineTime | null {
  if (time === null || time === undefined) return null;
  if (typeof time === 'string')
    return time.trim() ? { text: time, dateTime: null } : null;
  if (Number.isNaN(time.getTime())) return null;
  return {
    text: ogeDateTimeFormat(
      locale,
      format ?? OGE_TIMELINE_DEFAULT_DATE_FORMAT,
    ).format(time),
    dateTime: ogeTimelineDateTimeAttr(time),
  };
}
