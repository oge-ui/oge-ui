'use client';

import {
  useRef,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  OGE_DIALOG_ICONS,
  OGE_DIALOG_TRIANGLE_PATH,
  ogeDialogEnterIsPrimary,
  type OgeAlertBaseOptions,
  type OgeConfirmBaseOptions,
  type OgeDialogCore,
  type OgePromptBaseOptions,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeResolvedDialog,
} from '@oge-ui/behavior';

/** Options of `useOgeModals().confirm()`; a custom `icon` is any React node. */
export type OgeConfirmOptions = OgeConfirmBaseOptions<ReactNode>;

/** Options of `useOgeModals().alert()`; a custom `icon` is any React node. */
export type OgeAlertOptions = OgeAlertBaseOptions<ReactNode>;

/** Options of `useOgeModals().prompt()`; a custom `icon` is any React node. */
export type OgePromptOptions = OgePromptBaseOptions<ReactNode>;

/**
 * @internal A versioned store behind `OgeDialogCore`'s cells: the core is
 * built outside render (in `confirm()` / `prompt()`), so its writes bump a
 * version the content component subscribes to.
 */
export interface OgeDialogStore {
  readonly adapter: OgeReactivityAdapter;
  subscribe(listener: () => void): () => void;
  version(): number;
}

/** @internal */
export function createOgeDialogStore(): OgeDialogStore {
  let version = 0;
  const listeners = new Set<() => void>();
  return {
    adapter: {
      cell<T>(initial: T): OgeReactiveCell<T> {
        let value = initial;
        const cell = (() => value) as OgeReactiveCell<T>;
        cell.set = (next) => {
          if (Object.is(next, value)) return;
          value = next;
          version++;
          for (const listener of [...listeners]) listener();
        };
        return cell;
      },
      derived: (compute) => compute,
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
  };
}

/** @internal Props of the helper dialogs' body. */
export interface OgeDialogContentProps {
  readonly dialog: OgeResolvedDialog;
  readonly core: OgeDialogCore;
  readonly store: OgeDialogStore;
  /** Per-dialog id prefix (message / field / error ids). */
  readonly id: string;
  readonly icon: ReactNode;
}

/**
 * @internal The body of a `confirm()` / `alert()` / `prompt()` dialog — the
 * same markup as Angular's `OgeDialogContent`, drawn from the same
 * `OgeDialogCore` decisions.
 */
export function OgeDialogContent({
  dialog,
  core,
  store,
  id,
  icon,
}: OgeDialogContentProps) {
  useSyncExternalStore(store.subscribe, store.version, store.version);
  const field = useRef<HTMLInputElement>(null);
  const glyph = OGE_DIALOG_ICONS[dialog.severity ?? 'info'];
  const error = core.error();
  const prompt = dialog.prompt;

  const submit = (): void => {
    core.submit();
    // a sync validation error sends the user back to the field
    if (core.error()) field.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (!ogeDialogEnterIsPrimary(event.nativeEvent)) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="oge-dialog" onKeyDown={onKeyDown}>
      <div className="oge-dialog-body">
        {dialog.icon !== 'none' && (
          <span
            className={`oge-dialog-icon oge-dialog-icon-${dialog.severity ?? 'info'}`}
            aria-hidden="true"
          >
            {dialog.icon === 'custom' ? (
              icon
            ) : (
              <svg viewBox="0 0 16 16" width="22" height="22">
                {glyph.frame === 'triangle' ? (
                  <path
                    d={OGE_DIALOG_TRIANGLE_PATH}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                ) : (
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                )}
                {glyph.paths.map((d) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            )}
          </span>
        )}
        <div className="oge-dialog-text">
          {dialog.message && (
            <p className="oge-dialog-message" id={`${id}-message`}>
              {dialog.message}
            </p>
          )}
          {prompt && (
            <div className="oge-dialog-field">
              {prompt.label && (
                <label className="oge-dialog-label" htmlFor={`${id}-input`}>
                  {prompt.label}
                </label>
              )}
              <input
                ref={field}
                className="oge-dialog-input"
                id={`${id}-input`}
                type={prompt.inputType}
                value={core.value()}
                placeholder={prompt.placeholder}
                aria-label={
                  prompt.label ? undefined : (dialog.message ?? dialog.title)
                }
                aria-required={prompt.required || undefined}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => core.input(event.target.value)}
              />
              {error && (
                <p className="oge-dialog-error" id={`${id}-error`}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="oge-dialog-actions">
        {dialog.cancelText !== null && (
          <button
            type="button"
            className="oge-dialog-button oge-dialog-cancel"
            onClick={() => core.cancel()}
          >
            {dialog.cancelText}
          </button>
        )}
        <button
          type="button"
          className={[
            'oge-dialog-button',
            'oge-dialog-ok',
            dialog.danger && 'oge-dialog-button-danger',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-disabled={core.pending() || undefined}
          onClick={submit}
        >
          {dialog.okText}
        </button>
      </div>
    </div>
  );
}
