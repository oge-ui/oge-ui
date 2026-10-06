'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  ogeAppBarAcceptsLabel,
  ogeAppBarRole,
  type OgeAppBarCenterAlign,
  type OgeAppBarColor,
  type OgeAppBarLandmark,
  type OgeAppBarPosition,
  type OgeAppBarPositionMode,
  type OgeAppBarSize,
} from '@oge-ui/behavior';
import { useOgeAppBarConfig } from './layout-config';

export interface OgeAppBarProps {
  /** Edge the bar belongs to. Default: config, else `top`. */
  position?: OgeAppBarPosition;
  /**
   * `static` flows with the page, `sticky` sticks to its edge of the nearest
   * scroll container, `fixed` pins to the viewport. Default: config, else
   * `static`.
   */
  positionMode?: OgeAppBarPositionMode;
  /** Surface colour. Default: config, else `default`. */
  color?: OgeAppBarColor;
  /** Density preset — 48 / 56 / 64 px. Default: config, else `md`. */
  size?: OgeAppBarSize;
  /** Draws a shadow on the bar's content edge. */
  elevated?: boolean;
  /** Landmark role the bar exposes; `none` (default) adds none. */
  landmark?: OgeAppBarLandmark;
  /** Accessible name — written only when `landmark` is not `none`. */
  ariaLabel?: string;
  /** Alignment of the center section's content. */
  centerAlign?: OgeAppBarCenterAlign;
  /** Start section — a menu button, a logo. */
  start?: ReactNode;
  /** Center section content, rendered before `children`. */
  center?: ReactNode;
  /** End section — actions, an avatar. */
  end?: ReactNode;
  /** Center section content (the title). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A horizontal application bar with start / center / end sections — the
 * React render of the Angular `<oge-app-bar>`, same markup and stylesheet.
 * `positionMode` `sticky` / `fixed` pins it to its `position` edge with
 * `env(safe-area-inset-*)` padding as a floor. The bar adds no keyboard
 * model (its controls stay in the Tab order; put an `<OgeToolbar>` inside for
 * the APG toolbar) and a landmark only on request.
 *
 * ```tsx
 * <OgeAppBar
 *   positionMode="sticky"
 *   landmark="banner"
 *   start={<button aria-label="Open menu">☰</button>}
 *   end={<button>Sign out</button>}
 * >
 *   <h1>Inbox</h1>
 * </OgeAppBar>
 * ```
 */
export function OgeAppBar(props: OgeAppBarProps) {
  const config = useOgeAppBarConfig();
  const position = props.position ?? config.position ?? 'top';
  const mode = props.positionMode ?? config.positionMode ?? 'static';
  const color = props.color ?? config.color ?? 'default';
  const size = props.size ?? config.size ?? 'md';
  const landmark = props.landmark ?? 'none';

  const className = [
    'oge-app-bar',
    `oge-app-bar-${position}`,
    `oge-app-bar-${mode}`,
    `oge-app-bar-color-${color}`,
    `oge-app-bar-${size}`,
    props.elevated && 'oge-app-bar-elevated',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={props.style}
      role={ogeAppBarRole(landmark) ?? undefined}
      aria-label={ogeAppBarAcceptsLabel(landmark) ? props.ariaLabel : undefined}
    >
      <div className="oge-app-bar-start">{props.start}</div>
      <div
        className={[
          'oge-app-bar-center',
          props.centerAlign === 'center' && 'oge-app-bar-center-centered',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {props.center}
        {props.children}
      </div>
      <div className="oge-app-bar-end">{props.end}</div>
    </div>
  );
}
