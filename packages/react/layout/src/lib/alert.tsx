'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  OGE_ALERT_DISMISS_PATH,
  OGE_ALERT_ICON_PATHS,
  ogeAlertFocusAfterClose,
  ogeAlertRole,
  ogeAlertSeverityLabel,
  type OgeAlertClosedEvent,
  type OgeAlertClosingEvent,
  type OgeAlertLive,
  type OgeAlertSeverity,
  type OgeAlertStylingMode,
} from '@oge-ui/behavior';
import { useOgeAlertConfig } from './layout-config';

export interface OgeAlertProps {
  /** Meaning of the message; falls back to the config, then `info`. */
  severity?: OgeAlertSeverity;
  /** Bold first line above the message. */
  title?: string;
  /** `soft` (tinted, default), `outlined` or `filled`; falls back to the config. */
  stylingMode?: OgeAlertStylingMode;
  /** Renders a dismiss button that closes the alert (cancelable `onClosing`). */
  dismissible?: boolean;
  /**
   * Live-region behaviour: `auto` (default) derives `alert` / `status` from
   * the severity, `assertive` / `polite` force one, `off` renders no role.
   */
  live?: OgeAlertLive;
  /** Shows the severity glyph (or the custom `icon`). */
  showIcon?: boolean;
  /** Replaces the default severity glyph (rendered `aria-hidden`). */
  icon?: ReactNode;
  /** A row of controls under the message — real buttons in the Tab order. */
  actions?: ReactNode;
  /** Accessible name of the live region (only written while it has a role). */
  ariaLabel?: string;
  /** Whether the alert is shown (controlled). `false` renders nothing. */
  visible?: boolean;
  /** Initial visibility when uncontrolled (default `true`). */
  defaultVisible?: boolean;
  /** The visibility a close / show committed — the controlled half of `visible`. */
  onVisibleChange?: (visible: boolean) => void;
  /** The alert is about to close — set `cancel` to keep it. */
  onClosing?: (event: OgeAlertClosingEvent) => void;
  /** The alert closed. */
  onClosed?: (event: OgeAlertClosedEvent) => void;
  /** The message. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeAlert>`. */
export interface OgeAlertHandle {
  /** Shows the alert again. */
  show(): void;
  /** Runs the cancelable close, as the dismiss button does. */
  close(): void;
}

/**
 * An inline message — the React render of the Angular `<oge-alert>`, same
 * markup and the same role rule (`ogeAlertRole`): `error` / `warning` are
 * `role="alert"`, `info` / `success` `role="status"`, `live="off"` none. The
 * role stays while hidden, so showing the alert again inserts content into an
 * existing live region and is announced.
 *
 * ```tsx
 * <OgeAlert severity="warning" title="Storage almost full" dismissible>
 *   You have used 92% of your quota.
 * </OgeAlert>
 * ```
 */
export const OgeAlert = forwardRef<OgeAlertHandle, OgeAlertProps>(
  function OgeAlert(props, ref) {
    const config = useOgeAlertConfig();
    const severity = props.severity ?? config.severity ?? 'info';
    const stylingMode = props.stylingMode ?? config.stylingMode ?? 'soft';
    const showIcon = props.showIcon ?? true;
    const [uncontrolled, setUncontrolled] = useState(
      props.defaultVisible ?? true,
    );
    const visible = props.visible ?? uncontrolled;
    const hostRef = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    latest.current = props;
    const visibleRef = useRef(visible);
    visibleRef.current = visible;

    const setVisible = (next: boolean) => {
      if (latest.current.visible === undefined) setUncontrolled(next);
      latest.current.onVisibleChange?.(next);
    };

    const runClose = (event?: Event) => {
      if (!visibleRef.current) return;
      const closing: OgeAlertClosingEvent = { event, cancel: false };
      latest.current.onClosing?.(closing);
      if (closing.cancel) return;
      // computed before the content disappears: afterwards focus is on <body>
      const next = ogeAlertFocusAfterClose(hostRef.current);
      visibleRef.current = false;
      setVisible(false);
      latest.current.onClosed?.({ event });
      next?.focus();
    };
    const runCloseRef = useRef(runClose);
    runCloseRef.current = runClose;

    useImperativeHandle(
      ref,
      () => ({
        show: () => setVisible(true),
        close: () => runCloseRef.current(),
      }),
      [],
    );

    const role = ogeAlertRole(severity, props.live ?? 'auto');
    const prefix = ogeAlertSeverityLabel(severity, config.messages);
    const className = [
      'oge-alert',
      `oge-alert-${severity}`,
      stylingMode === 'outlined' && 'oge-alert-outlined',
      stylingMode === 'filled' && 'oge-alert-filled',
      !showIcon && 'oge-alert-no-icon',
      props.className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={hostRef}
        className={className}
        style={props.style}
        role={role ?? undefined}
        aria-label={role ? props.ariaLabel : undefined}
        hidden={!visible}
      >
        {visible && (
          <>
            {showIcon && (
              <span className="oge-alert-icon" aria-hidden="true">
                {props.icon ?? (
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    focusable="false"
                  >
                    <path d={OGE_ALERT_ICON_PATHS[severity]} />
                  </svg>
                )}
              </span>
            )}
            <div className="oge-alert-body">
              {props.title && (
                <div className="oge-alert-title">
                  <span className="oge-sr-only">{prefix} </span>
                  {props.title}
                </div>
              )}
              <div className="oge-alert-message">
                {!props.title && <span className="oge-sr-only">{prefix} </span>}
                {props.children}
              </div>
              {props.actions && (
                <div className="oge-alert-actions">{props.actions}</div>
              )}
            </div>
            {props.dismissible && (
              <button
                type="button"
                className="oge-alert-dismiss"
                aria-label={config.messages.dismiss}
                onClick={(event) => runClose(event.nativeEvent)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d={OGE_ALERT_DISMISS_PATH} />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    );
  },
);
