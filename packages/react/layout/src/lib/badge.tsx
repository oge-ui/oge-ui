'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  ogeBadgeDescription,
  ogeBadgeText,
  ogeBadgeVisible,
  syncOgeBadgeHostAria,
  type OgeBadgeOverlap,
  type OgeBadgePosition,
  type OgeBadgeSeverity,
  type OgeBadgeSize,
  type OgeBadgeValue,
} from '@oge-ui/behavior';
import { useOgeBadgeConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export interface OgeBadgeProps {
  /** A number, a short text, or `null` (no badge). */
  value?: OgeBadgeValue;
  /** Counts above it show the `overflow` pattern ("99+"); `undefined` = config → 99. */
  max?: number;
  /** A small dot instead of a value. */
  dot?: boolean;
  /** Show a `0` count (hidden by default). */
  showZero?: boolean;
  /** Force-hide the badge, e.g. while a count loads. */
  invisible?: boolean;
  /** Colour; `undefined` = config → `danger`. */
  severity?: OgeBadgeSeverity;
  /** Size preset of the count badge. */
  size?: OgeBadgeSize;
  /** Corner of the wrapped content (logical); `undefined` = config → `top-end`. */
  position?: OgeBadgePosition;
  /** `circle` pulls the badge onto the outline of a round host (an avatar). */
  overlap?: OgeBadgeOverlap;
  /** Accessible text override — the default reads the catalog's `count` / `dot`. */
  description?: string;
  /** Announce later changes through a polite live region. */
  announce?: boolean;
  /** BCP 47 locale of the digits and the plural; `undefined` = config → runtime default. */
  locale?: string;
  /** The content the badge overlays; without it the badge is standalone. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A count, a short text or a dot — standalone, or overlaid on its children.
 * The React render of the Angular `<oge-badge>`: the glyph is `aria-hidden`
 * decoration, the description ("5 new items") reaches the wrapped control
 * through `aria-describedby` (or renders as visually hidden text when
 * standalone), counts above `max` show "99+", and `announce` speaks later
 * changes through a polite live region.
 *
 * ```tsx
 * <OgeBadge value={unread}>
 *   <button type="button">Inbox</button>
 * </OgeBadge>
 * <OgeBadge value="Beta" severity="accent" />
 * ```
 */
export function OgeBadge(props: OgeBadgeProps) {
  const config = useOgeBadgeConfig();
  const {
    value = null,
    dot = false,
    showZero = false,
    invisible = false,
    size = 'md',
    overlap = 'rectangle',
    announce = false,
  } = props;
  const descriptionId = `oge-badge-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const ariaRef = useRef<{ target: Element; id: string } | null>(null);
  const overlay = props.children !== undefined && props.children !== null;

  const max = props.max ?? config.max;
  const locale = props.locale ?? config.locale;
  const visible = ogeBadgeVisible({ value, dot, showZero, invisible });
  const text = ogeBadgeText({
    value,
    dot,
    max,
    messages: config.messages,
    locale,
  });
  const description = visible
    ? ogeBadgeDescription({
        value,
        dot,
        max,
        description: props.description,
        messages: config.messages,
        locale,
      })
    : '';

  // the wrapped control is the consumer's markup — wire it imperatively
  useIsomorphicLayoutEffect(() => {
    ariaRef.current = syncOgeBadgeHostAria(
      anchorRef.current,
      overlay && visible ? descriptionId : null,
      ariaRef.current,
    );
  });
  useEffect(
    () => () => {
      if (ariaRef.current) syncOgeBadgeHostAria(null, null, ariaRef.current);
      ariaRef.current = null;
    },
    [],
  );

  // later changes only — the initial value is part of the page, not news
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (
      announce &&
      previous.current !== null &&
      description !== previous.current
    )
      setAnnouncement(description);
    previous.current = description;
  }, [description, announce]);

  const className = [
    'oge-badge',
    `oge-badge-${props.severity ?? config.severity ?? 'danger'}`,
    `oge-badge-${props.position ?? config.position ?? 'top-end'}`,
    `oge-badge-size-${size}`,
    overlay && 'oge-badge-overlay',
    dot && 'oge-badge-dot',
    overlap === 'circle' && 'oge-badge-circle',
    !visible && 'oge-badge-hidden',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className} style={props.style}>
      <span className="oge-badge-anchor" ref={anchorRef}>
        {props.children}
      </span>
      {visible && (
        <>
          <span className="oge-badge-indicator" aria-hidden="true">
            {text}
          </span>
          {overlay ? (
            <span id={descriptionId} hidden>
              {description}
            </span>
          ) : (
            <span className="oge-badge-sr">{description}</span>
          )}
        </>
      )}
      {announce && (
        <span className="oge-badge-sr" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      )}
    </span>
  );
}
