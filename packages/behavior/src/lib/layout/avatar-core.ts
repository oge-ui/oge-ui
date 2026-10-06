/**
 * The framework-free half of the avatar and avatar group (W8a): the
 * vocabulary, the message catalog, the fallback chain (image → initials →
 * icon), initials extraction, the accessible-name rule and the group's
 * overflow window. Both render layers draw the same markup from these
 * decisions, so a rule changed here changes both layers at once.
 */
import { ogeFormatMessage } from '@oge-ui/core';

/** Size preset — 24 / 32 / 40 / 48 / 64 px. */
export type OgeAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Outline of the avatar. `rounded` uses `--oge-radius`, `square` none. */
export type OgeAvatarShape = 'circle' | 'rounded' | 'square';

/** Presence state drawn as a dot on the avatar's bottom-end corner. */
export type OgeAvatarStatus = 'online' | 'away' | 'busy' | 'offline';

/** What the avatar actually renders after the fallback chain ran. */
export type OgeAvatarContentType = 'image' | 'initials' | 'icon';

/** One avatar of a data-driven `oge-avatar-group` / `<OgeAvatarGroup>`. */
export interface OgeAvatarItem {
  /** Stable identity for the render loop; the index is used without one. */
  key?: string | number;
  /** Person or entity name — the accessible name and the initials source. */
  name?: string;
  /** Image URL; a failed load falls back to the initials, then the icon. */
  src?: string;
  /** Explicit initials, overriding the ones derived from `name`. */
  initials?: string;
  /** Presence dot. */
  status?: OgeAvatarStatus;
  /** SVG path data (`d`) of the fallback icon. */
  icon?: string;
}

/** Every user-facing string the avatar family renders, aria labels included. */
export interface OgeAvatarMessages {
  /** Accessible name of an avatar with neither `name` nor `ariaLabel`. */
  avatar: string;
  /** Name plus presence — `{name}` and `{status}` placeholders. */
  withStatus: string;
  /** Presence label of `status: 'online'`. */
  online: string;
  /** Presence label of `status: 'away'`. */
  away: string;
  /** Presence label of `status: 'busy'`. */
  busy: string;
  /** Presence label of `status: 'offline'`. */
  offline: string;
  /** Accessible name of the group's "+N" surplus avatar (ICU plural). */
  overflow: string;
}

export const OGE_DEFAULT_AVATAR_MESSAGES: OgeAvatarMessages = {
  avatar: 'Avatar',
  withStatus: '{name} ({status})',
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
  overflow: '{count, plural, one {# more} other {# more}}',
};

/** Application-wide defaults for `oge-avatar` and `oge-avatar-group`. */
export interface OgeAvatarConfig {
  messages: OgeAvatarMessages;
  /** Default for the `size` input. */
  size?: OgeAvatarSize;
  /** Default for the `shape` input. */
  shape?: OgeAvatarShape;
  /**
   * BCP 47 locale of the initials casing and the group's "+N" digits;
   * `undefined` = the application locale (Angular `LOCALE_ID`, React the
   * runtime default).
   */
  locale?: string;
}

export const OGE_DEFAULT_AVATAR_CONFIG: OgeAvatarConfig = {
  messages: OGE_DEFAULT_AVATAR_MESSAGES,
};

export type OgeAvatarConfigInput = Partial<
  Omit<OgeAvatarConfig, 'messages'>
> & {
  messages?: Partial<OgeAvatarMessages>;
};

export function resolveOgeAvatarConfig(
  input: OgeAvatarConfigInput | undefined,
): OgeAvatarConfig {
  return {
    ...OGE_DEFAULT_AVATAR_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_AVATAR_MESSAGES, ...input?.messages },
  };
}

/** The default fallback glyph: a person silhouette (24×24 viewBox path data). */
export const OGE_AVATAR_ICON_PATH =
  'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-4.14 0-7.5 2.52-7.5 5.63V21h15v-1.12c0-3.11-3.36-5.63-7.5-5.63Z';

/**
 * Up to `max` initials from a name: the first letter of the first word and
 * of the last word ("Ada King Lovelace" → "AL"), upper-cased in `locale`.
 * Letters are taken by code point, so a surrogate pair or a combining-free
 * CJK name stays intact; punctuation-only words are skipped.
 */
export function ogeAvatarInitials(
  name: string | null | undefined,
  locale?: string,
  max = 2,
): string {
  if (!name) return '';
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+/u, ''))
    .filter((word) => word.length > 0);
  if (words.length === 0 || max <= 0) return '';
  const picked =
    words.length === 1 || max === 1
      ? [words[0]]
      : [words[0], words[words.length - 1]];
  const letters = picked
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .slice(0, max * 2);
  try {
    return Array.from(letters.toLocaleUpperCase(locale)).slice(0, max).join('');
  } catch {
    // an unknown locale tag — fall back to the runtime default
    return Array.from(letters.toUpperCase()).slice(0, max).join('');
  }
}

/** Inputs of the fallback chain. */
export interface OgeAvatarContentInput {
  src?: string | null;
  /** The image at `src` failed to load (its `error` event fired). */
  imageFailed?: boolean;
  initials?: string | null;
  name?: string | null;
}

/**
 * The fallback chain: an image while `src` is set and has not failed, then
 * explicit or derived initials, then the icon.
 */
export function ogeResolveAvatarContent(
  input: OgeAvatarContentInput,
): OgeAvatarContentType {
  if (input.src && !input.imageFailed) return 'image';
  if (
    (input.initials && input.initials.trim()) ||
    ogeAvatarInitials(input.name)
  )
    return 'initials';
  return 'icon';
}

/** Presence label of a status, from the catalog. */
export function ogeAvatarStatusLabel(
  status: OgeAvatarStatus,
  messages: OgeAvatarMessages,
): string {
  return messages[status];
}

/** Inputs of the accessible-name rule. */
export interface OgeAvatarLabelInput {
  ariaLabel?: string | null;
  name?: string | null;
  status?: OgeAvatarStatus | null;
  messages: OgeAvatarMessages;
}

/**
 * The avatar's accessible name (`role="img"`): the explicit `ariaLabel`,
 * else the name, else the catalog's `avatar` — with the presence appended
 * through `withStatus` when a status is set, because the dot itself is
 * `aria-hidden` decoration.
 */
export function ogeAvatarLabel(input: OgeAvatarLabelInput): string {
  const base =
    input.ariaLabel?.trim() || input.name?.trim() || input.messages.avatar;
  if (!input.status) return base;
  return input.messages.withStatus
    .replace('{name}', base)
    .replace('{status}', ogeAvatarStatusLabel(input.status, input.messages));
}

/** How many avatars a group renders and how many the "+N" stands for. */
export interface OgeAvatarGroupWindow {
  /** Real avatars to render, from the start of the list. */
  visible: number;
  /** Count shown in the surplus avatar; `0` renders none. */
  overflow: number;
}

/**
 * The group's overflow window. `max` counts the rendered circles **including**
 * the surplus one (MUI's rule, so a row never grows past `max`): 7 people at
 * `max: 4` render 3 avatars and "+4". `total` (when larger than the item
 * count) is the full population of a partially loaded list. A `max` below 2
 * is treated as 2 — a lone "+N" says nothing.
 */
export function ogeAvatarGroupWindow(
  count: number,
  max?: number | null,
  total?: number | null,
): OgeAvatarGroupWindow {
  const items = Math.max(0, Math.floor(count));
  const population = Math.max(items, Math.floor(total ?? 0));
  if (max === undefined || max === null || !Number.isFinite(max)) {
    return { visible: items, overflow: population - items };
  }
  const limit = Math.max(2, Math.floor(max));
  if (population <= limit && items === population) {
    return { visible: items, overflow: 0 };
  }
  const visible = Math.min(items, limit - 1);
  return { visible, overflow: population - visible };
}

/** Visible text of the surplus avatar ("+4"), digits in `locale`. */
export function ogeAvatarOverflowText(count: number, locale?: string): string {
  return `+${ogeFormatMessage('{count, number}', { count }, locale)}`;
}

/** Accessible name of the surplus avatar ("4 more"). */
export function ogeAvatarOverflowLabel(
  count: number,
  messages: OgeAvatarMessages,
  locale?: string,
): string {
  return ogeFormatMessage(messages.overflow, { count }, locale);
}

/** The avatar's image loaded. */
export interface OgeAvatarImageLoadedEvent {
  src: string;
  event: Event;
}

/** The avatar's image failed; the avatar now shows its initials or icon. */
export interface OgeAvatarImageFailedEvent {
  src: string;
  event: Event;
}
