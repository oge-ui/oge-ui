'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import type {
  OgeFabClickEvent,
  OgeFabPosition,
  OgeFabPositionMode,
  OgeFabSeverity,
  OgeFabSize,
} from '@oge-ui/behavior';
import { useOgeFabConfig } from './buttons-config';

export interface OgeFabProps {
  /** Accessible name — and the visible text when `extended`. */
  label?: string;
  /** SVG path data (`d`, 24×24 viewBox) of the icon; or pass `children`. */
  icon?: string;
  /** Shows `label` beside the icon in a pill (Material's extended FAB). */
  extended?: boolean;
  /** Corner or edge the FAB is pinned to (logical: RTL mirrors). */
  position?: OgeFabPosition;
  /** `fixed` (viewport), `absolute` (positioned ancestor) or `static` (flow). */
  positionMode?: OgeFabPositionMode;
  /** 40 / 56 / 72 px. */
  size?: OgeFabSize;
  /** Fill colour — the button severity vocabulary (default `accent`). */
  severity?: OgeFabSeverity;
  /** Gap to the pinned edges (any CSS length); default `16px`. */
  offset?: string;
  /** Disables the button. */
  disabled?: boolean;
  /** The FAB was pressed. */
  onClick?: (event: OgeFabClickEvent) => void;
  /** A custom `aria-hidden` icon, rendered after the `icon` path. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of {@link OgeFab}. */
export interface OgeFabHandle {
  /** Moves focus to the button. */
  focus(): void;
}

/** Host classes shared by the FAB and the speed dial (their positioning layer). */
export function ogeFabLayerClasses(state: {
  position: OgeFabPosition;
  positionMode: OgeFabPositionMode;
  size: OgeFabSize;
  severity: OgeFabSeverity;
  extended?: boolean;
}): string {
  return [
    `oge-fab-${state.positionMode}`,
    `oge-fab-position-${state.position}`,
    `oge-fab-size-${state.size}`,
    `oge-fab-severity-${state.severity}`,
    state.extended ? 'oge-fab-extended' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * A floating action button — the React render of the Angular `<oge-fab>`:
 * the screen's one primary action, pinned to a viewport corner or edge
 * (`positionMode="fixed"`, the default) with `env(safe-area-inset-*)` as the
 * floor of its `offset` gap.
 *
 * ```tsx
 * <OgeFab label="New message" icon={plusPath} onClick={compose} />
 * <OgeFab label="Compose" extended position="bottom-center" />
 * ```
 */
export const OgeFab = forwardRef<OgeFabHandle, OgeFabProps>(
  function OgeFabRender(props, ref) {
    const config = useOgeFabConfig();
    const { label = '', icon, extended = false, disabled = false } = props;
    const button = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => ({ focus: () => button.current?.focus() }));

    const className = [
      'oge-fab oge-fab-layer',
      ogeFabLayerClasses({
        position: props.position ?? config.position ?? 'bottom-end',
        positionMode: props.positionMode ?? config.positionMode ?? 'fixed',
        size: props.size ?? config.size ?? 'md',
        severity: props.severity ?? config.severity ?? 'accent',
        extended,
      }),
      props.className,
    ]
      .filter(Boolean)
      .join(' ');
    const style = props.offset
      ? ({ ...props.style, '--oge-fab-offset': props.offset } as CSSProperties)
      : props.style;

    return (
      <div className={className} style={style}>
        <button
          ref={button}
          type="button"
          className="oge-fab-button"
          disabled={disabled}
          aria-label={extended ? undefined : label || undefined}
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) =>
            props.onClick?.({ event: event.nativeEvent })
          }
        >
          {icon && (
            <svg
              className="oge-fab-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d={icon} />
            </svg>
          )}
          {props.children}
          {extended && <span className="oge-fab-label">{label}</span>}
        </button>
      </div>
    );
  },
);
