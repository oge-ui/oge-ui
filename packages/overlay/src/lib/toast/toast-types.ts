import type { TemplateRef } from '@angular/core';

/** Visual + semantic severity of a toast. */
export type OgeToastSeverity = 'info' | 'success' | 'warning' | 'error';

/** Viewport edge the toast stack is pinned to (logical, RTL-aware). */
export type OgeToastPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

/** Why a toast closed. */
export type OgeToastCloseReason =
  'timeout' | 'closeButton' | 'click' | 'action' | 'api' | 'clear';

/**
 * Screen-reader announcement mode. When omitted it derives from severity:
 * `error` announces assertively, everything else politely.
 */
export type OgeToastAnnounce = 'polite' | 'assertive' | 'off';

/** Payload of a toast action button press. */
export interface OgeToastActionEvent<D = unknown> {
  /** The `data` value the toast was shown with, if any. */
  readonly data?: D;
  /** The originating click. */
  readonly event: MouseEvent;
}

/**
 * Inline action button ('Undo', 'Retry', …). Pressing it runs `handler`
 * and closes the toast with reason `'action'`.
 */
export interface OgeToastAction<D = unknown> {
  /** Button label. */
  text: string;
  /** Invoked before the toast closes. */
  handler?: (event: OgeToastActionEvent<D>) => void;
}

/** Resolved when a toast has closed (after its exit transition). */
export interface OgeToastClosedEvent {
  /** What triggered the close. */
  readonly reason: OgeToastCloseReason;
}

/** Context of a `template` toast body. */
export interface OgeToastSlotContext<D = unknown> {
  /** Closes the toast (reason `'api'`). */
  $implicit: () => void;
  /** The `data` value the toast was shown with, if any. */
  data?: D;
}

/** Options accepted by `OgeToastService.show()` (and the severity sugar). */
export interface OgeToastOptions<D = unknown> {
  /** Body text; also the screen-reader announcement. */
  message: string;
  /** Optional bold first line above the message. */
  title?: string;
  /** Severity — drives the accent bar, icon and announcement mode. Default `'info'`. */
  severity?: OgeToastSeverity;
  /** Auto-dismiss time in ms. Default: config `toastDisplayTime`. */
  displayTime?: number;
  /** Never auto-dismisses. Default `false` (`loading` toasts are implicitly sticky). */
  sticky?: boolean;
  /** Shows the ✕ button. Default `true`. */
  closable?: boolean;
  /** A click anywhere on the toast closes it (reason `'click'`). Default `false`. */
  closeOnClick?: boolean;
  /** Shows the remaining-time bar. Default: config `toastProgressBar`. */
  progressBar?: boolean;
  /** Inline action button; closing reason becomes `'action'`. */
  action?: OgeToastAction<D>;
  /** Region override. Default: config `toastPosition`. */
  position?: OgeToastPosition;
  /** Announcement mode override. Default derives from severity. */
  announce?: OgeToastAnnounce;
  /**
   * Screen-reader text override — announced instead of `title` + `message`.
   * Lets the visual text stay short while the announcement carries full
   * context ("Saved" vs "Document saved to Drafts").
   */
  announceText?: string;
  /** Replaces the severity icon (the `loading` spinner still wins). */
  icon?: TemplateRef<void>;
  /** Spinner instead of the severity icon; implicitly sticky while `true`. */
  loading?: boolean;
  /** Merge with an identical visible toast into one with a ×N badge. Default: config `toastCoalesceDuplicates`. */
  coalesce?: boolean;
  /** Coalesce key and `update` identity; defaults to severity+title+message. */
  id?: string;
  /** Extra class(es) on the toast element. */
  cssClass?: string;
  /** Replaces the title/message body; `$implicit` closes the toast. */
  template?: TemplateRef<OgeToastSlotContext<D>>;
  /** Arbitrary payload surfaced in the template context and action event. */
  data?: D;
}

/**
 * Patch accepted by `OgeToastRef.update()`. Changing `displayTime`, `sticky`
 * or `loading` restarts the auto-dismiss timer; a changed `message`
 * re-announces.
 */
export type OgeToastUpdate<D = unknown> = Partial<
  Omit<OgeToastOptions<D>, 'position' | 'id'>
>;

/** Options of `OgeToastService.promise()`. */
export interface OgeToastPromiseOptions<T, D = unknown> extends Omit<
  OgeToastOptions<D>,
  'message' | 'severity' | 'loading'
> {
  /** Message shown while the promise is pending (spinner, sticky). */
  loading: string;
  /** Message or patch applied when the promise resolves. */
  success: string | ((value: T) => string | OgeToastUpdate<D>);
  /** Message or patch applied when the promise rejects. */
  error: string | ((error: unknown) => string | OgeToastUpdate<D>);
}
