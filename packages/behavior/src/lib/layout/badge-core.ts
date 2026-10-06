/**
 * The framework-free half of the badge (W8a): the vocabulary, the message
 * catalog, the visibility and text rules ("99+"), the accessible description,
 * and the imperative ARIA wiring that puts that description on the anchored
 * host's focusable control.
 *
 * The badge glyph is always `aria-hidden` decoration: a bare "5" next to a
 * button says nothing to a screen reader. What the reader hears is the
 * description ("5 new items") — inline and visually hidden for a standalone
 * badge, referenced through `aria-describedby` from the anchored control for
 * an overlay badge, so it is read together with the control's name.
 */
import { ogeFormatMessage } from '@oge-ui/core';

/** Corner of the anchored content the overlay badge sits on (logical). */
export type OgeBadgePosition =
  'top-end' | 'top-start' | 'bottom-end' | 'bottom-start';

/** Colour of the badge — the suite's severity vocabulary plus `neutral`. */
export type OgeBadgeSeverity =
  'danger' | 'accent' | 'success' | 'warning' | 'neutral';

/**
 * Shape of the anchored content. `circle` pulls the badge inwards so it sits
 * on the outline of a round host (an avatar) instead of its bounding box.
 */
export type OgeBadgeOverlap = 'rectangle' | 'circle';

/** Size preset of the count badge (the dot has one size). */
export type OgeBadgeSize = 'sm' | 'md';

/** What a badge shows: a number, a short text, or nothing (`null`). */
export type OgeBadgeValue = number | string | null | undefined;

/** Every user-facing string the badge renders, aria text included. */
export interface OgeBadgeMessages {
  /** Description of a count (ICU plural, `{count}`). */
  count: string;
  /** Visible text of a count above `max` — `{max}` placeholder ("99+"). */
  overflow: string;
  /** Description of a count above `max` (ICU plural over `{max}`). */
  overflowCount: string;
  /** Description of a dot badge. */
  dot: string;
}

export const OGE_DEFAULT_BADGE_MESSAGES: OgeBadgeMessages = {
  count: '{count, plural, one {# new item} other {# new items}}',
  overflow: '{max}+',
  overflowCount:
    '{max, plural, one {More than # new item} other {More than # new items}}',
  dot: 'New',
};

/** Application-wide defaults for `oge-badge`. */
export interface OgeBadgeConfig {
  messages: OgeBadgeMessages;
  /** Default for the `max` input (99). */
  max?: number;
  /** Default for the `severity` input (`danger`). */
  severity?: OgeBadgeSeverity;
  /** Default for the `position` input (`top-end`). */
  position?: OgeBadgePosition;
  /**
   * BCP 47 locale of the count digits and the plural description;
   * `undefined` = the application locale (Angular `LOCALE_ID`, React the
   * runtime default).
   */
  locale?: string;
}

export const OGE_DEFAULT_BADGE_CONFIG: OgeBadgeConfig = {
  messages: OGE_DEFAULT_BADGE_MESSAGES,
};

export type OgeBadgeConfigInput = Partial<Omit<OgeBadgeConfig, 'messages'>> & {
  messages?: Partial<OgeBadgeMessages>;
};

export function resolveOgeBadgeConfig(
  input: OgeBadgeConfigInput | undefined,
): OgeBadgeConfig {
  return {
    ...OGE_DEFAULT_BADGE_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_BADGE_MESSAGES, ...input?.messages },
  };
}

/** The badge's default count ceiling. */
export const OGE_BADGE_DEFAULT_MAX = 99;

/** Inputs of the visibility rule. */
export interface OgeBadgeVisibilityInput {
  value?: OgeBadgeValue;
  dot?: boolean;
  /** Show a `0` count (hidden by default — "nothing new" needs no badge). */
  showZero?: boolean;
  /** Force-hide (MUI `invisible`), e.g. while a count is loading. */
  invisible?: boolean;
}

/**
 * Whether the badge paints at all: never when `invisible`; a dot always;
 * otherwise only with a non-empty value, and a zero only with `showZero`.
 */
export function ogeBadgeVisible(input: OgeBadgeVisibilityInput): boolean {
  if (input.invisible) return false;
  if (input.dot) return true;
  const { value } = input;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return false;
    return value !== 0 || !!input.showZero;
  }
  return value.trim().length > 0;
}

/** Inputs of the text and description rules. */
export interface OgeBadgeTextInput {
  value?: OgeBadgeValue;
  dot?: boolean;
  max?: number;
  messages: OgeBadgeMessages;
  locale?: string;
}

function ceiling(max: number | undefined): number {
  return max !== undefined && Number.isFinite(max) && max > 0
    ? Math.floor(max)
    : OGE_BADGE_DEFAULT_MAX;
}

/**
 * The visible text: empty for a dot, the number in `locale` digits, the
 * `overflow` pattern ("99+") above `max`, a string value verbatim.
 */
export function ogeBadgeText(input: OgeBadgeTextInput): string {
  if (input.dot) return '';
  const { value } = input;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  const max = ceiling(input.max);
  if (value > max)
    return ogeFormatMessage(input.messages.overflow, { max }, input.locale);
  return ogeFormatMessage('{count}', { count: value }, input.locale);
}

/**
 * The accessible description: an explicit `description` wins; a dot reads
 * the catalog's `dot`; a number reads the `count` plural (`overflowCount`
 * above `max`); a string value reads itself.
 */
export function ogeBadgeDescription(
  input: OgeBadgeTextInput & { description?: string | null },
): string {
  const explicit = input.description?.trim();
  if (explicit) return explicit;
  if (input.dot) return input.messages.dot;
  const { value } = input;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  const max = ceiling(input.max);
  if (value > max)
    return ogeFormatMessage(
      input.messages.overflowCount,
      { max },
      input.locale,
    );
  return ogeFormatMessage(input.messages.count, { count: value }, input.locale);
}

const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"], [role="button"], [role="link"]';

/**
 * The element inside an overlay badge's anchor that carries the badge's
 * description: the first focusable control (a wrapped `<button>` or link),
 * else the first element child — so a badge on an avatar describes the
 * avatar's `role="img"`.
 */
export function ogeBadgeAriaTarget(anchor: Element): HTMLElement | null {
  const first = anchor.firstElementChild as HTMLElement | null;
  if (!first) return null;
  if (first.matches(FOCUSABLE)) return first;
  return (anchor.querySelector(FOCUSABLE) as HTMLElement | null) ?? first;
}

function tokens(value: string | null): string[] {
  return value ? value.split(/\s+/).filter(Boolean) : [];
}

/** Adds `id` to an element's `aria-describedby` list, keeping its own ids. */
export function ogeAddDescribedBy(el: Element, id: string): void {
  const list = tokens(el.getAttribute('aria-describedby'));
  if (list.includes(id)) return;
  el.setAttribute('aria-describedby', [...list, id].join(' '));
}

/** Removes `id` from an element's `aria-describedby` list (and the attribute when empty). */
export function ogeRemoveDescribedBy(el: Element, id: string): void {
  const list = tokens(el.getAttribute('aria-describedby')).filter(
    (token) => token !== id,
  );
  if (list.length) el.setAttribute('aria-describedby', list.join(' '));
  else el.removeAttribute('aria-describedby');
}

/**
 * Points the anchored control's `aria-describedby` at the badge description
 * (`descriptionId`), or detaches it (`null`, a hidden badge). Returns the
 * element it now describes so the caller can detach exactly that one when
 * the content or the id changes; the previous target is detached first.
 * Written imperatively — the control is the consumer's markup, not the
 * badge's (the popover's `syncPopoverTriggerAria` precedent).
 */
export function syncOgeBadgeHostAria(
  anchor: Element | null,
  descriptionId: string | null,
  previous: { target: Element; id: string } | null,
): { target: Element; id: string } | null {
  const target = anchor ? ogeBadgeAriaTarget(anchor) : null;
  if (previous && (previous.target !== target || previous.id !== descriptionId))
    ogeRemoveDescribedBy(previous.target, previous.id);
  if (!target || !descriptionId) return null;
  ogeAddDescribedBy(target, descriptionId);
  return { target, id: descriptionId };
}
