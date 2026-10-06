/**
 * The framework-free half of the inline alert (W8a): the vocabulary, the
 * message catalog, the live-region role decision, the severity glyphs and
 * the focus rule for a dismissal.
 *
 * Role by severity, per the ARIA guidance: an error or a warning is
 * `role="alert"` (assertive — it interrupts), information and success are
 * `role="status"` (polite). Both only announce content that *changes*:
 * an alert present on first paint is read in document order like any other
 * text, which is the right behaviour for a static inline message.
 */
import { nextTabbableAfter } from '../overlay/popover-core';

/** Meaning of the message; drives the colour, the glyph and the role. */
export type OgeAlertSeverity = 'info' | 'success' | 'warning' | 'error';

/** `soft` is a tinted surface, `outlined` a coloured frame, `filled` solid. */
export type OgeAlertStylingMode = 'soft' | 'outlined' | 'filled';

/**
 * Live-region behaviour. `auto` derives the role from the severity;
 * `assertive` / `polite` force `alert` / `status`; `off` renders no live
 * role at all (a permanent note that should never interrupt).
 */
export type OgeAlertLive = 'auto' | 'polite' | 'assertive' | 'off';

/** Every user-facing string the alert renders, aria labels included. */
export interface OgeAlertMessages {
  /** Accessible name of the dismiss button. */
  dismiss: string;
  /** Visually hidden severity prefix of an `info` alert. */
  info: string;
  /** Visually hidden severity prefix of a `success` alert. */
  success: string;
  /** Visually hidden severity prefix of a `warning` alert. */
  warning: string;
  /** Visually hidden severity prefix of an `error` alert. */
  error: string;
}

export const OGE_DEFAULT_ALERT_MESSAGES: OgeAlertMessages = {
  dismiss: 'Dismiss',
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};

/** Application-wide defaults for `oge-alert`. */
export interface OgeAlertConfig {
  messages: OgeAlertMessages;
  /** Default for the `severity` input (`info`). */
  severity?: OgeAlertSeverity;
  /** Default for the `stylingMode` input (`soft`). */
  stylingMode?: OgeAlertStylingMode;
}

export const OGE_DEFAULT_ALERT_CONFIG: OgeAlertConfig = {
  messages: OGE_DEFAULT_ALERT_MESSAGES,
};

export type OgeAlertConfigInput = Partial<Omit<OgeAlertConfig, 'messages'>> & {
  messages?: Partial<OgeAlertMessages>;
};

export function resolveOgeAlertConfig(
  input: OgeAlertConfigInput | undefined,
): OgeAlertConfig {
  return {
    ...OGE_DEFAULT_ALERT_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_ALERT_MESSAGES, ...input?.messages },
  };
}

/** The live role of an alert (`null` = no role attribute). */
export function ogeAlertRole(
  severity: OgeAlertSeverity,
  live: OgeAlertLive = 'auto',
): 'alert' | 'status' | null {
  switch (live) {
    case 'off':
      return null;
    case 'assertive':
      return 'alert';
    case 'polite':
      return 'status';
    default:
      return severity === 'error' || severity === 'warning'
        ? 'alert'
        : 'status';
  }
}

/** The visually hidden severity prefix ("Warning"), from the catalog. */
export function ogeAlertSeverityLabel(
  severity: OgeAlertSeverity,
  messages: OgeAlertMessages,
): string {
  return messages[severity];
}

/**
 * Severity glyphs (24×24 viewBox path data, stroked): info "i", a check,
 * a triangle "!" and a circle "!" — so the meaning never rides on colour
 * alone (WCAG 1.4.1).
 */
export const OGE_ALERT_ICON_PATHS: Readonly<Record<OgeAlertSeverity, string>> =
  {
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v-5m0-3.5h.01',
    success: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4-10 2.8 2.8L16 9.5',
    warning:
      'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4m0 3.5h.01',
    error: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v5m0 3.5h.01',
  };

/** The dismiss glyph (an ✕, 24×24 viewBox, stroked). */
export const OGE_ALERT_DISMISS_PATH = 'M6 6l12 12M18 6 6 18';

/** An alert is about to close; set `cancel` to keep it. */
export interface OgeAlertClosingEvent {
  /** The originating DOM event (dismiss click), when a gesture started it. */
  readonly event?: Event;
  cancel: boolean;
}

/** An alert closed (its `open` model is now `false`). */
export interface OgeAlertClosedEvent {
  readonly event?: Event;
}

/**
 * Where focus goes when an alert that holds focus (its dismiss button, an
 * action) disappears: the next tabbable element after it, so the keyboard
 * user stays in place instead of being dropped to `<body>`. `null` when the
 * focus is elsewhere — nothing to restore — or there is nothing after it.
 */
export function ogeAlertFocusAfterClose(
  host: HTMLElement | null,
): HTMLElement | null {
  if (!host || typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (!active || !host.contains(active)) return null;
  return nextTabbableAfter(host, host);
}
