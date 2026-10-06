'use client';

import {
  Children,
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import {
  OGE_AVATAR_ICON_PATH,
  ogeAvatarGroupWindow,
  ogeAvatarInitials,
  ogeAvatarLabel,
  ogeAvatarOverflowLabel,
  ogeAvatarOverflowText,
  ogeResolveAvatarContent,
  sanitizeResourceUrl,
  type OgeAvatarImageFailedEvent,
  type OgeAvatarImageLoadedEvent,
  type OgeAvatarItem,
  type OgeAvatarShape,
  type OgeAvatarSize,
  type OgeAvatarStatus,
} from '@oge-ui/behavior';
import { useOgeAvatarConfig } from './layout-config';

/** What a child avatar inherits from its `<OgeAvatarGroup>`. */
const AvatarGroupContext = createContext<{
  size?: OgeAvatarSize;
  shape?: OgeAvatarShape;
} | null>(null);

export interface OgeAvatarProps {
  /** Person or entity name — the accessible name and the initials source. */
  name?: string;
  /** Image URL; a failed load falls back to the initials, then the icon. */
  src?: string;
  /** Explicit initials, overriding the ones derived from `name`. */
  initials?: string;
  /** SVG path data (`d`, 24×24 viewBox) of the fallback icon; a person by default. */
  icon?: string;
  /** Size preset — `xs` 24 / `sm` 32 / `md` 40 / `lg` 48 / `xl` 64 px. */
  size?: OgeAvatarSize;
  /** Outline: `circle` (default), `rounded` or `square`. */
  shape?: OgeAvatarShape;
  /** Presence dot, announced as part of the accessible name. */
  status?: OgeAvatarStatus;
  /**
   * Pure decoration (the name is already visible beside it): the host becomes
   * `aria-hidden` with no role.
   */
  decorative?: boolean;
  /** Accessible name override. */
  ariaLabel?: string;
  /** Native `loading` of the image. */
  imageLoading?: 'lazy' | 'eager';
  /** BCP 47 locale of the initials casing; `undefined` = config → runtime default. */
  locale?: string;
  /** The image at `src` loaded. */
  onImageLoaded?: (event: OgeAvatarImageLoadedEvent) => void;
  /** The image at `src` failed; the avatar now shows its initials or icon. */
  onImageFailed?: (event: OgeAvatarImageFailedEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A person or entity as an image, initials or an icon — the React render of
 * the Angular `<oge-avatar>`, with the same fallback chain (image → initials
 * → icon) and the same accessible name rule: `role="img"` named by
 * `ariaLabel` → `name` → the catalog's `avatar`, presence appended.
 *
 * ```tsx
 * <OgeAvatar name="Ada Lovelace" src="/people/ada.jpg" status="online" />
 * <OgeAvatar name="Grace Hopper" size="lg" shape="rounded" />
 * ```
 */
export function OgeAvatar(props: OgeAvatarProps) {
  const config = useOgeAvatarConfig();
  const group = useContext(AvatarGroupContext);
  const { name, src, initials, status, decorative = false } = props;

  // a failure belongs to the URL that failed: a new src gets a fresh attempt
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const imageFailed = !!src && failedSrc === src;

  const size = props.size ?? group?.size ?? config.size ?? 'md';
  const shape = props.shape ?? group?.shape ?? config.shape ?? 'circle';
  const locale = props.locale ?? config.locale;
  const content = ogeResolveAvatarContent({ src, imageFailed, initials, name });
  const label = ogeAvatarLabel({
    ariaLabel: props.ariaLabel,
    name,
    status,
    messages: config.messages,
  });

  const className = [
    'oge-avatar',
    `oge-avatar-${size}`,
    `oge-avatar-${shape}`,
    `oge-avatar-type-${content}`,
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={className}
      style={props.style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? 'true' : undefined}
    >
      {content === 'image' ? (
        <img
          className="oge-avatar-image"
          alt=""
          aria-hidden="true"
          src={sanitizeResourceUrl(src)}
          loading={props.imageLoading ?? 'lazy'}
          onLoad={(event: SyntheticEvent<HTMLImageElement>) =>
            props.onImageLoaded?.({ src: src ?? '', event: event.nativeEvent })
          }
          onError={(event: SyntheticEvent<HTMLImageElement>) => {
            setFailedSrc(src);
            props.onImageFailed?.({ src: src ?? '', event: event.nativeEvent });
          }}
        />
      ) : content === 'initials' ? (
        <span className="oge-avatar-initials" aria-hidden="true">
          {initials?.trim() || ogeAvatarInitials(name, locale)}
        </span>
      ) : (
        <svg
          className="oge-avatar-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d={props.icon ?? OGE_AVATAR_ICON_PATH} />
        </svg>
      )}
      {status && (
        <span
          className={`oge-avatar-status oge-avatar-status-${status}`}
          aria-hidden="true"
        ></span>
      )}
    </span>
  );
}

export interface OgeAvatarGroupProps {
  /** Data-driven avatars, rendered before any child `<OgeAvatar>`. */
  items?: readonly OgeAvatarItem[];
  /** Rendered circles including the "+N" one (min 2); `undefined` = all. */
  max?: number;
  /** Full population when the list is partial — the rest count into "+N". */
  total?: number;
  /** Size of every avatar in the group (a child's own `size` wins). */
  size?: OgeAvatarSize;
  /** Shape of every avatar in the group (a child's own `shape` wins). */
  shape?: OgeAvatarShape;
  /** Overlap the avatars (stacked) instead of spacing them. */
  overlap?: boolean;
  /** Accessible name; the host becomes `role="group"` once it has one. */
  ariaLabel?: string;
  /** BCP 47 locale of the "+N" digits; `undefined` = config → runtime default. */
  locale?: string;
  /** `<OgeAvatar>` children, rendered after `items`. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A row of avatars that overlap and collapse their surplus into a "+N"
 * avatar — the React render of the Angular `<oge-avatar-group>`. `max`
 * counts the rendered circles including the surplus one.
 *
 * ```tsx
 * <OgeAvatarGroup items={team} max={4} ariaLabel="Project team" />
 * ```
 */
export function OgeAvatarGroup(props: OgeAvatarGroupProps) {
  const config = useOgeAvatarConfig();
  const { items = [], overlap = true } = props;
  const children = Children.toArray(props.children);
  const size = props.size ?? config.size ?? 'md';
  const shape = props.shape ?? config.shape ?? 'circle';
  const locale = props.locale ?? config.locale;
  const win = ogeAvatarGroupWindow(
    items.length + children.length,
    props.max,
    props.total,
  );
  const visibleItems = items.slice(0, win.visible);
  const visibleChildren = children.slice(
    0,
    Math.max(0, win.visible - items.length),
  );

  const className = [
    'oge-avatar-group',
    `oge-avatar-group-${size}`,
    overlap && 'oge-avatar-group-overlap',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AvatarGroupContext.Provider
      value={{ size: props.size, shape: props.shape }}
    >
      <div
        className={className}
        style={props.style}
        role={props.ariaLabel ? 'group' : undefined}
        aria-label={props.ariaLabel || undefined}
      >
        {visibleItems.map((item, index) => (
          <OgeAvatar
            key={item.key ?? index}
            name={item.name}
            src={item.src}
            initials={item.initials}
            status={item.status}
            icon={item.icon}
            locale={props.locale}
          />
        ))}
        {visibleChildren}
        {win.overflow > 0 && (
          <span
            className={`oge-avatar oge-avatar-overflow oge-avatar-${size} oge-avatar-${shape}`}
            role="img"
            aria-label={ogeAvatarOverflowLabel(
              win.overflow,
              config.messages,
              locale,
            )}
          >
            <span className="oge-avatar-initials" aria-hidden="true">
              {ogeAvatarOverflowText(win.overflow, locale)}
            </span>
          </span>
        )}
      </div>
    </AvatarGroupContext.Provider>
  );
}
