'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  OgeToastCore,
  OgeToastRef,
  type OgeToastAction,
  type OgeToastBaseOptions,
  type OgeToastBasePatch,
  type OgeToastClosedEvent,
  type OgeToastEntry,
  type OgeToastPosition,
  type OgeToastPromiseBaseOptions,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';

// The handle class is the engine's own, shared with the Angular service.
export { OgeToastRef } from '@oge-ui/behavior';

/** Context of a `renderContent` toast body. */
export interface OgeToastSlotContext<D = unknown> {
  /** Closes the toast (reason `'api'`). */
  close: () => void;
  /** The `data` value the toast was shown with, if any. */
  data?: D;
}

/**
 * Options accepted by `show()` (and the severity sugar): the shared base
 * options plus the React-only custom-content members.
 */
export interface OgeToastOptions<D = unknown> extends OgeToastBaseOptions<D> {
  /** Replaces the severity icon (the `loading` spinner still wins). */
  icon?: ReactNode;
  /** Replaces the title/message body; `close` dismisses the toast. */
  renderContent?: (context: OgeToastSlotContext<D>) => ReactNode;
}

/**
 * Patch accepted by `OgeToastRef.update()`. Changing `displayTime`, `sticky`
 * or `loading` restarts the auto-dismiss timer; a changed `message`
 * re-announces.
 */
export type OgeToastUpdate<D = unknown> = Partial<
  Omit<OgeToastOptions<D>, 'position' | 'id'>
>;

/** Options of `promise()`. */
export type OgeToastPromiseOptions<T, D = unknown> = OgeToastPromiseBaseOptions<
  T,
  OgeToastOptions<D>
>;

/**
 * The toast API — the React counterpart of injecting `OgeToastService`.
 */
export interface OgeToastsHandle {
  /** Shows a toast; a bare string becomes an info toast. */
  show<D = unknown>(toast: string | OgeToastOptions<D>): OgeToastRef<D>;
  /** Success-severity sugar for `show()`. */
  success(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef;
  /** Info-severity sugar for `show()`. */
  info(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef;
  /** Warning-severity sugar for `show()`. */
  warning(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef;
  /** Error-severity sugar for `show()` (announces assertively). */
  error(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef;
  /**
   * Shows a loading toast that morphs in place when the promise settles —
   * the auto-dismiss timer only starts then.
   */
  promise<T, D = unknown>(
    promise: Promise<T>,
    options: OgeToastPromiseOptions<T, D>,
  ): OgeToastRef<D>;
  /** Closes every toast (or every toast of one position); reason `'clear'`. */
  clear(position?: OgeToastPosition): void;
}

type Entry = OgeToastEntry<OgeToastOptions>;

const ToastsContext = createContext<OgeToastsHandle | null>(null);

/** An inert handle for SSR / outside a provider: nothing renders. */
function inertRef<D>(): OgeToastRef<D> {
  return new OgeToastRef<D>(new Promise<OgeToastClosedEvent>(() => void 0));
}

/**
 * Hosts the toasts shown through `useOgeToasts()` — the React counterpart of
 * Angular's `OgeToastService`. Mount it once near the app root:
 *
 * ```tsx
 * <OgeToastProvider>
 *   <App />
 * </OgeToastProvider>
 * ```
 *
 * Toasts render in body-appended fixed regions (`--oge-z-toast`, above
 * modals), never take focus, never join the Escape stack, and announce via
 * permanently-mounted hidden live regions (`error` asserts, the rest are
 * polite). Timers pause on hover, focus-within and while the tab is hidden,
 * and always resume with the remaining time. The engine itself — queue,
 * timers, coalescing, announcements — is `@oge-ui/behavior`'s
 * `OgeToastCore`, shared verbatim with the Angular service (ADR 0001).
 */
export function OgeToastProvider({ children }: { children?: ReactNode }) {
  const config = useOgeOverlayConfig();
  const configRef = useRef(config);
  configRef.current = config;

  const [, setVersion] = useState(0);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const coreRef = useRef<OgeToastCore<OgeToastOptions>>(undefined);
  coreRef.current ??= new OgeToastCore<OgeToastOptions>({
    defaults: () => ({
      position: configRef.current.toastPosition,
      displayTime: configRef.current.toastDisplayTime,
      maxVisible: configRef.current.toastMaxVisible,
      progressBar: configRef.current.toastProgressBar,
      coalesceDuplicates: configRef.current.toastCoalesceDuplicates,
    }),
    onChange: () => setVersion((v) => v + 1),
    announce: (mode, text) => {
      const el =
        mode === 'assertive' ? assertiveRef.current : politeRef.current;
      if (el) el.textContent = text;
    },
  });
  const core = coreRef.current;

  // destroy() clears timers and the document listener; the next show()
  // re-attaches, so StrictMode's destroy → remount cycle needs no revive.
  useEffect(() => () => core.destroy(), [core]);

  const handleRef = useRef<OgeToastsHandle>(undefined);
  if (!handleRef.current) {
    const show = <D,>(toast: string | OgeToastOptions<D>): OgeToastRef<D> =>
      typeof document === 'undefined'
        ? inertRef<D>()
        : (core.show(toast as string | OgeToastOptions) as OgeToastRef<D>);
    handleRef.current = {
      show,
      success: (message, options) =>
        show({ ...options, message, severity: 'success' }),
      info: (message, options) =>
        show({ ...options, message, severity: 'info' }),
      warning: (message, options) =>
        show({ ...options, message, severity: 'warning' }),
      error: (message, options) =>
        show({ ...options, message, severity: 'error' }),
      promise: <T, D>(
        promise: Promise<T>,
        options: OgeToastPromiseOptions<T, D>,
      ) =>
        typeof document === 'undefined'
          ? inertRef<D>()
          : (core.promise(
              promise,
              options as unknown as OgeToastPromiseOptions<T>,
            ) as OgeToastRef<D>),
      clear: (position) => core.clear(position),
    };
  }

  const regions = core.regions();

  // Entrance: newly rendered entries get their ready class one frame later.
  const pending = regions
    .flatMap((region) => region.visible)
    .filter((entry) => !entry.ready && !entry.closing);
  const pendingKeys = pending.map((entry) => entry.key).join(',');
  useEffect(() => {
    if (pending.length === 0) return;
    let alive = true;
    requestAnimationFrame(() => {
      if (alive) core.markReady(pending);
    });
    return () => {
      alive = false;
    };
    // `pending` is derived from the engine state keyed by entry identity,
    // which `pendingKeys` captures.
  }, [core, pendingKeys]);

  const messages = config.messages;

  const onToastClick = (entry: Entry, event: ReactMouseEvent): void => {
    if (!entry.options.closeOnClick) return;
    if ((event.target as HTMLElement).closest('button')) return;
    core.dismiss(entry, 'click');
  };

  const onAction = (
    entry: Entry,
    action: OgeToastAction,
    event: ReactMouseEvent,
  ): void => {
    action.handler?.({ data: entry.options.data, event: event.nativeEvent });
    core.dismiss(entry, 'action');
  };

  // Only when focus enters from / leaves to outside — moving between the
  // toast's own buttons must not double-count the pause.
  const onFocusIn = (entry: Entry, event: ReactFocusEvent): void => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null))
      return;
    core.pause(entry);
  };
  const onFocusOut = (entry: Entry, event: ReactFocusEvent): void => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null))
      return;
    core.resume(entry);
  };

  const host = (
    <>
      {regions.map((region) => (
        <div
          key={region.position}
          className={`oge-toast-region oge-toast-region-${region.position}`}
          role="region"
          aria-label={messages.toastRegionLabel}
        >
          {region.visible.map((entry) => {
            const options = entry.options;
            return (
              <div
                key={entry.key}
                className={[
                  'oge-toast-cell',
                  entry.ready && 'oge-toast-cell-ready',
                  entry.closing && 'oge-toast-cell-closing',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* click-to-dismiss is opt-in; buttons keep their own semantics */}
                <div
                  className={[
                    'oge-toast',
                    `oge-toast-${options.severity}`,
                    options.closeOnClick && 'oge-toast-clickable',
                    options.cssClass,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={(event) => onToastClick(entry, event)}
                  onMouseEnter={() => core.pause(entry)}
                  onMouseLeave={() => core.resume(entry)}
                  onFocus={(event) => onFocusIn(entry, event)}
                  onBlur={(event) => onFocusOut(entry, event)}
                >
                  <span className="oge-toast-icon" aria-hidden="true">
                    {options.loading ? (
                      <span className="oge-toast-spinner"></span>
                    ) : options.icon !== undefined ? (
                      options.icon
                    ) : (
                      <SeverityIcon severity={options.severity} />
                    )}
                  </span>
                  <div className="oge-toast-body">
                    {options.renderContent ? (
                      options.renderContent({
                        close: () => core.dismiss(entry, 'api'),
                        data: options.data,
                      })
                    ) : (
                      <>
                        {options.title && (
                          <div className="oge-toast-title">{options.title}</div>
                        )}
                        <div className="oge-toast-message">
                          {options.message}
                        </div>
                      </>
                    )}
                  </div>
                  {entry.count > 1 && (
                    <span className="oge-toast-count" aria-hidden="true">
                      {messages.toastCountBadge.replace(
                        '{count}',
                        String(entry.count),
                      )}
                    </span>
                  )}
                  {options.action && (
                    <ActionButton
                      action={options.action}
                      onPress={(event) =>
                        onAction(entry, options.action as OgeToastAction, event)
                      }
                    />
                  )}
                  {options.closable && (
                    <button
                      type="button"
                      className="oge-toast-close"
                      aria-label={messages.toastClose}
                      onClick={() => core.dismiss(entry, 'closeButton')}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                      >
                        <path
                          d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    </button>
                  )}
                  {options.progressBar &&
                    !options.sticky &&
                    !options.loading && (
                      <div className="oge-toast-progress" aria-hidden="true">
                        <div
                          className="oge-toast-progress-bar"
                          style={entry.progressStyle ?? undefined}
                        ></div>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div
        ref={politeRef}
        className="oge-toast-announcer"
        role="status"
        aria-live="polite"
      ></div>
      <div
        ref={assertiveRef}
        className="oge-toast-announcer"
        role="alert"
        aria-live="assertive"
      ></div>
    </>
  );

  return (
    <ToastsContext.Provider value={handleRef.current}>
      {children}
      {typeof document !== 'undefined' && createPortal(host, document.body)}
    </ToastsContext.Provider>
  );
}

function ActionButton({
  action,
  onPress,
}: {
  action: OgeToastAction;
  onPress: (event: ReactMouseEvent) => void;
}) {
  return (
    <button type="button" className="oge-toast-action" onClick={onPress}>
      {action.text}
    </button>
  );
}

function SeverityIcon({ severity }: { severity: OgeToastOptions['severity'] }) {
  switch (severity) {
    case 'success':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16">
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m5 8 2 2 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path
            d="M8 2 15 14H1L8 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M8 6.5v3.2M8 11.6v.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'error':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16">
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" width="16" height="16">
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 7.4v3.6M8 4.9v.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/**
 * Imperative toasts — the React counterpart of injecting `OgeToastService`:
 *
 * ```tsx
 * const toasts = useOgeToasts();
 * toasts.success('Saved');
 * toasts.show({ message: 'Row deleted', sticky: true,
 *               action: { text: 'Undo', handler: () => restore() } });
 * toasts.promise(publish(), { loading: 'Publishing…', success: 'Published',
 *                             error: (e) => `Failed: ${String(e)}` });
 * ```
 */
export function useOgeToasts(): OgeToastsHandle {
  const handle = useContext(ToastsContext);
  if (!handle) {
    throw new Error(
      '[oge-overlay] useOgeToasts() needs an <OgeToastProvider> above it.',
    );
  }
  return handle;
}

/** Re-exported for consumers typing their own update patches. */
export type { OgeToastBasePatch };
