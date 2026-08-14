'use client';

import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type {
  OgeCardActionsAlign,
  OgeCardOrientation,
  OgeCardSeverity,
  OgeCardSize,
  OgeCardStylingMode,
} from '@oge-ui/behavior';
import { useOgeCardConfig } from './layout-config';

export interface OgeCardProps {
  /**
   * Header title. Named after the PrimeNG input rather than `title` — a
   * static `title` attribute would double as a native tooltip.
   */
  header?: string;
  /** Line rendered under `header` in the muted color. */
  subheader?: string;
  /**
   * Chrome preset: `outlined` (border, the default), `raised` (shadow),
   * `filled` (tinted surface) or `flat` (no chrome — for a card nested in
   * another surface).
   */
  stylingMode?: OgeCardStylingMode;
  /**
   * `horizontal` turns the card into a two-column grid with the `media`
   * element spanning the inline-start column.
   */
  orientation?: OgeCardOrientation;
  /** Density preset — scales the section padding and type ramp together. */
  size?: OgeCardSize;
  /**
   * Colored rail on the inline-start edge for status cards — the toast's rail
   * idiom on a static surface. `undefined` renders no rail.
   */
  severity?: OgeCardSeverity;
  /**
   * Purely visual affordance for the documented clickable-card pattern: a
   * hover/focus-within lift and a keyboard focus ring on the surface. It adds
   * **no** role, tabindex or wrapper — pair it with one primary `<a>` in the
   * content whose hit area you stretch with CSS.
   */
  interactive?: boolean;
  /**
   * Replaces the content and action row with a shimmer skeleton and marks the
   * card `aria-busy`. Header, media and footer stay, so the card keeps its
   * footprint while the data arrives.
   */
  loading?: boolean;

  // The React counterparts of the Angular attribute slots — nodes instead of
  // `[ogeCardAvatar]` / `[ogeCardMedia]` / … projection targets.
  /** Leading element of the header row (`[ogeCardAvatar]`). */
  avatar?: ReactNode;
  /** Trailing element of the header row (`[ogeCardHeaderActions]`). */
  headerActions?: ReactNode;
  /** Full-bleed media element (`[ogeCardMedia]`). */
  media?: ReactNode;
  /** Action row under the content (`[ogeCardActions]`). */
  actions?: ReactNode;
  /** Justification of the action row — the directive's `align` input. */
  actionsAlign?: OgeCardActionsAlign;
  /** Footer strip (`[ogeCardFooter]`). */
  footer?: ReactNode;

  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Adds a section class to a slot node the way the Angular attribute
 * directives do — on the consumer's own element, not on a wrapper, so the
 * card's grid keeps the exact child structure the stylesheet expects. A slot
 * that is not a single element (a bare string) gets no class, exactly like an
 * attribute directive that has nothing to attach to.
 */
function withSlotClass(node: ReactNode, className: string): ReactNode {
  if (!isValidElement<{ className?: string }>(node)) return node;
  const existing = node.props.className;
  return cloneElement(node, {
    className: existing ? `${existing} ${className}` : className,
  });
}

/**
 * Content surface with the card chrome — the React render of the Angular
 * `<oge-card>`. The Angular attribute slots (`[ogeCardAvatar]`,
 * `[ogeCardMedia]`, `[ogeCardActions]`, …) arrive here as node props; the
 * default content is `children`.
 *
 * ```tsx
 * <OgeCard header="Revenue" subheader="Last 30 days" actions={<OgeButton text="Details" />}>
 *   <p>…</p>
 * </OgeCard>
 * ```
 */
export function OgeCard(props: OgeCardProps) {
  const config = useOgeCardConfig();
  const {
    header,
    subheader,
    severity,
    interactive = false,
    loading = false,
    avatar,
    headerActions,
    media,
    actions,
    actionsAlign = 'start',
    footer,
    children,
  } = props;

  const stylingMode = props.stylingMode ?? config.stylingMode ?? 'outlined';
  const orientation = props.orientation ?? config.orientation ?? 'vertical';
  const size = props.size ?? config.size ?? 'md';

  const hasHeader =
    header !== undefined ||
    subheader !== undefined ||
    avatar !== undefined ||
    headerActions !== undefined;

  const className = [
    'oge-card',
    stylingMode === 'raised' && 'oge-card-raised',
    stylingMode === 'filled' && 'oge-card-filled',
    stylingMode === 'flat' && 'oge-card-flat',
    orientation === 'horizontal' && 'oge-card-horizontal',
    size === 'sm' && 'oge-card-sm',
    size === 'lg' && 'oge-card-lg',
    interactive && 'oge-card-interactive',
    loading && 'oge-card-loading',
    severity === 'accent' && 'oge-card-severity-accent',
    severity === 'success' && 'oge-card-severity-success',
    severity === 'warning' && 'oge-card-severity-warning',
    severity === 'danger' && 'oge-card-severity-danger',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={props.style}
      aria-busy={loading ? true : undefined}
    >
      {hasHeader && (
        <div className="oge-card-header">
          {withSlotClass(avatar, 'oge-card-avatar')}
          {(header || subheader) && (
            <div className="oge-card-titles">
              {header && <div className="oge-card-title">{header}</div>}
              {subheader && (
                <div className="oge-card-subtitle">{subheader}</div>
              )}
            </div>
          )}
          {withSlotClass(headerActions, 'oge-card-header-actions')}
        </div>
      )}
      {withSlotClass(media, 'oge-card-media')}
      {loading ? (
        <div className="oge-card-skeleton" aria-hidden="true">
          <div className="oge-card-skeleton-line"></div>
          <div className="oge-card-skeleton-line"></div>
          <div className="oge-card-skeleton-line"></div>
        </div>
      ) : (
        <>
          <div className="oge-card-content">{children}</div>
          {withSlotClass(
            actions,
            [
              'oge-card-actions',
              actionsAlign === 'center' && 'oge-card-actions-center',
              actionsAlign === 'end' && 'oge-card-actions-end',
              actionsAlign === 'stretched' && 'oge-card-actions-stretched',
            ]
              .filter(Boolean)
              .join(' '),
          )}
        </>
      )}
      {withSlotClass(footer, 'oge-card-footer')}
    </div>
  );
}
