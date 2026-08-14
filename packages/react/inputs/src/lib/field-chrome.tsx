'use client';

import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
  formatPattern,
  type OgeInputsMessages,
  type OgeInputSubscriptSizing,
} from '@oge-ui/behavior';

/** Character-counter display state, mirrored from the Angular host contract. */
export interface OgeInputCounterState {
  count: number;
  max: number | undefined;
  over: boolean;
}

/** Password-reveal rail feature, when the editor supports it. */
export interface OgeInputRevealState {
  visible: boolean;
  active: boolean;
  toggle(): void;
}

/** Copy-to-clipboard rail feature, when the editor supports it. */
export interface OgeInputCopyState {
  visible: boolean;
  copied: boolean;
  trigger(): void;
}

/** Number-box spin rail feature, when the editor supports it. */
export interface OgeInputSpinState {
  visible: boolean;
  canUp: boolean;
  canDown: boolean;
  press(direction: 1 | -1, event: ReactPointerEvent): void;
  release(): void;
}

/** Drop-down toggle rail feature, when the editor supports it. */
export interface OgeInputDropDownState {
  visible: boolean;
  expanded: boolean;
  icon?: 'chevron' | 'calendar' | 'clock';
  toggle(): void;
}

/**
 * What the chrome reads from its owning editor — the React mirror of the
 * Angular `OGE_INPUT_HOST` contract, as plain values per render.
 */
export interface OgeFieldChromeHost {
  msg: OgeInputsMessages;
  inputId: string;
  labelId: string;
  hintId: string;
  errorId: string;
  counterId: string;
  label: string;
  labelMode: 'static' | 'floating' | 'hidden' | 'outside';
  required: boolean;
  pendingVisible: boolean;
  successVisible: boolean;
  showClear: boolean;
  clear(): void;
  subscriptSizing: OgeInputSubscriptSizing;
  showError: boolean;
  resolvedErrorText: string | null;
  hint: string | undefined;
  counter: OgeInputCounterState | null;
  reveal: OgeInputRevealState | null;
  copy: OgeInputCopyState | null;
  spin: OgeInputSpinState | null;
  dropdown: OgeInputDropDownState | null;
}

export interface OgeFieldChromeProps {
  host: OgeFieldChromeHost;
  /** Content of the `[ogeInputPrefix]` slot. */
  prefix?: ReactNode;
  /** Content of the `[ogeInputSuffix]` slot. */
  suffix?: ReactNode;
  /** The native control. */
  children: ReactNode;
}

const requiredMark = (
  <span className="oge-input-required-mark" aria-hidden="true">
    *
  </span>
);

/**
 * Internal presentational chrome of every oge React editor — the exact
 * markup, classes and rail order (`prefix | input | pending⊻success | copy |
 * reveal | clear | dropdown | spin | suffix`) of the Angular
 * `<oge-field-chrome>`, styled by the same SCSS.
 */
export function OgeFieldChrome({
  host,
  prefix,
  suffix,
  children,
}: OgeFieldChromeProps) {
  const counterText = (state: OgeInputCounterState): string =>
    state.max === undefined
      ? formatPattern(host.msg.counterNoMax, { count: String(state.count) })
      : formatPattern(host.msg.counter, {
          count: String(state.count),
          max: String(state.max),
        });
  const counterAria = (state: OgeInputCounterState): string =>
    state.max === undefined
      ? formatPattern(host.msg.counterAriaNoMax, { count: String(state.count) })
      : formatPattern(host.msg.counterAria, {
          count: String(state.count),
          max: String(state.max),
        });

  const labelBody = (
    <>
      {host.label}
      {host.required && requiredMark}
    </>
  );

  return (
    <span className="oge-input-field">
      {host.label &&
        (host.labelMode === 'outside' || host.labelMode === 'static') && (
          <label
            className="oge-input-label"
            id={host.labelId}
            htmlFor={host.inputId}
          >
            {labelBody}
          </label>
        )}
      <div className="oge-input-container">
        <span className="oge-input-prefix">{prefix}</span>
        <span className="oge-input-infix">
          {host.label && host.labelMode === 'floating' && (
            <label
              className="oge-input-label oge-input-label-float"
              id={host.labelId}
              htmlFor={host.inputId}
            >
              {labelBody}
            </label>
          )}
          {children}
        </span>
        <span className="oge-input-rail">
          {host.pendingVisible ? (
            <>
              <svg
                className="oge-input-pending"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M8 1.5 A 6.5 6.5 0 1 1 1.5 8" />
              </svg>
              <span className="oge-input-sr">{host.msg.pending}</span>
            </>
          ) : host.successVisible ? (
            <>
              <svg
                className="oge-input-success"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m3 8.5 3.5 3.5L13 4.5" />
              </svg>
              <span className="oge-input-sr">{host.msg.valid}</span>
            </>
          ) : null}
          {host.copy?.visible && (
            <button
              type="button"
              className={[
                'oge-input-rail-btn',
                'oge-input-copy',
                host.copy.copied && 'oge-input-copy-done',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={host.msg.copyButton}
              title={host.copy.copied ? host.msg.copied : host.msg.copyButton}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => host.copy?.trigger()}
            >
              {host.copy.copied ? (
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m3 8.5 3.5 3.5L13 4.5" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                  <path d="M10.5 5.5v-2a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3.5V9A1.5 1.5 0 0 0 4 10.5h1.5" />
                </svg>
              )}
            </button>
          )}
          {host.reveal?.visible && (
            <button
              type="button"
              className="oge-input-rail-btn oge-input-reveal"
              aria-label={host.msg.showPassword}
              title={
                host.reveal.active
                  ? host.msg.hidePassword
                  : host.msg.showPassword
              }
              aria-pressed={host.reveal.active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => host.reveal?.toggle()}
            >
              {host.reveal.active ? (
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
          {host.showClear && (
            <button
              type="button"
              className="oge-input-rail-btn oge-input-clear"
              tabIndex={-1}
              aria-label={host.msg.clearButton}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => host.clear()}
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m4 4 8 8m0-8-8 8" />
              </svg>
            </button>
          )}
          {host.dropdown?.visible && (
            <button
              type="button"
              className="oge-input-rail-btn oge-input-dropdown"
              tabIndex={-1}
              aria-label={host.msg.dropDownToggle}
              aria-expanded={host.dropdown.expanded}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => host.dropdown?.toggle()}
            >
              {(host.dropdown.icon ?? 'chevron') === 'calendar' ? (
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="3" width="12" height="11" rx="1.5" />
                  <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
                </svg>
              ) : (host.dropdown.icon ?? 'chevron') === 'clock' ? (
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 4.5V8l2.5 1.5" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              )}
            </button>
          )}
          {host.spin?.visible && (
            <span className="oge-input-spin">
              <button
                type="button"
                className="oge-input-spin-btn"
                tabIndex={-1}
                disabled={!host.spin.canUp}
                aria-label={host.msg.spinIncrement}
                onPointerDown={(event) => host.spin?.press(1, event)}
                onPointerUp={() => host.spin?.release()}
                onPointerLeave={() => host.spin?.release()}
                onPointerCancel={() => host.spin?.release()}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m4 10 4-4 4 4" />
                </svg>
              </button>
              <button
                type="button"
                className="oge-input-spin-btn"
                tabIndex={-1}
                disabled={!host.spin.canDown}
                aria-label={host.msg.spinDecrement}
                onPointerDown={(event) => host.spin?.press(-1, event)}
                onPointerUp={() => host.spin?.release()}
                onPointerLeave={() => host.spin?.release()}
                onPointerCancel={() => host.spin?.release()}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="10"
                  height="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
            </span>
          )}
          {suffix}
        </span>
      </div>
      {host.subscriptSizing !== 'none' && (
        <div
          className={[
            'oge-input-subscript',
            host.subscriptSizing === 'fixed' && 'oge-input-subscript-fixed',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="oge-input-subscript-text" aria-live="polite">
            {host.showError && host.resolvedErrorText ? (
              <span className="oge-input-error" id={host.errorId}>
                {host.resolvedErrorText}
              </span>
            ) : host.hint ? (
              <span className="oge-input-hint" id={host.hintId}>
                {host.hint}
              </span>
            ) : null}
          </span>
          {host.counter && (
            <span
              className={[
                'oge-input-counter',
                host.counter.over && 'oge-input-counter-over',
              ]
                .filter(Boolean)
                .join(' ')}
              id={host.counterId}
            >
              <span aria-hidden="true">{counterText(host.counter)}</span>
              <span className="oge-input-sr">{counterAria(host.counter)}</span>
            </span>
          )}
        </div>
      )}
      {host.copy && (
        <span className="oge-input-sr" aria-live="polite">
          {host.copy.copied ? host.msg.copied : ''}
        </span>
      )}
    </span>
  );
}
