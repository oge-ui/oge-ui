'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type AriaAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  OgeButtonPress,
  resolveAutoRepeat,
  resolveClickGuard,
  resolveHoldToConfirm,
  type OgeAutoRepeatOptions,
  type OgeButtonIconPosition,
  type OgeButtonSeverity,
  type OgeButtonSize,
  type OgeButtonStylingMode,
  type OgeButtonsMessages,
  type OgeClickGuardOptions,
  type OgeHoldToConfirmOptions,
} from '@oge-ui/behavior';
import { isDevMode } from './dev';
import { useOgeButtonsConfig } from './buttons-config';
import { useOgeButtonGroup } from './button-group-context';

export interface OgeButtonProps {
  /** Label text; alternative (or addition) to `children`. */
  text?: string;
  /** Tooltip — rendered as the native `title` attribute. */
  hint?: string;
  disabled?: boolean;
  /** Fill style; falls back to the enclosing group, then `'contained'`. */
  stylingMode?: OgeButtonStylingMode;
  /** Semantic color; falls back to the enclosing group, then `'normal'`. */
  severity?: OgeButtonSeverity;
  /** Size preset; falls back to the enclosing group, then `'md'`. */
  size?: OgeButtonSize;
  /**
   * Custom main color (any CSS color) — overrides the severity palette; the
   * soft tint is derived automatically. For theme-wide changes override the
   * `--oge-*` tokens instead.
   */
  color?: string;
  /** Icon node rendered before or after the label. */
  icon?: ReactNode;
  /** Where `icon` renders relative to the label. */
  iconPosition?: OgeButtonIconPosition;
  tabIndex?: number;
  /** Native `accesskey` of the inner button. */
  accessKey?: string;
  /** Renders `type="submit"` so the button submits the enclosing form. */
  useSubmitBehavior?: boolean;
  /** Native button type; `useSubmitBehavior` is sugar for `'submit'`. */
  buttonType?: 'button' | 'submit' | 'reset';
  /** Accessible name of the native button — required for icon-only buttons. */
  ariaLabel?: string;
  /** Selection key inside an `<OgeButtonGroup>`; unused standalone. */
  value?: string;
  /**
   * `aria-haspopup` of the native button — for popup triggers. Typed to the
   * ARIA vocabulary rather than `string`, which is what React's own DOM
   * typings accept.
   */
  ariaHasPopup?: AriaAttributes['aria-haspopup'];
  /** `aria-expanded` of the native button; `undefined` omits the attribute. */
  ariaExpanded?: boolean;
  /** `aria-controls` of the native button — id of the controlled popup. */
  ariaControls?: string;
  /** Busy state. Managed automatically while `action` is pending. */
  loading?: boolean;
  /** Notified whenever the busy state changes (controlled `loading`). */
  onLoadingChange?: (loading: boolean) => void;
  /**
   * Async click handler: a click invokes it, turns `loading` on while the
   * returned promise is pending and ignores further clicks until it settles
   * (single-flight). Synchronous return values call `onActionDone` immediately.
   */
  action?: () => unknown;
  /**
   * Rate-limits `onClick` against double/spam clicks.
   * `true` = throttle with `config.clickGuardMs`.
   */
  clickGuard?: boolean | OgeClickGuardOptions;
  /**
   * Notification badge: a string/number renders a pill (numbers cap at `99+`
   * and join the accessible name), `true` renders a plain dot.
   */
  badge?: string | number | boolean;
  /**
   * Fires `onClick` only after an uninterrupted press of the configured
   * duration — for destructive actions. Mutually exclusive with `autoRepeat`
   * (`holdToConfirm` wins). `true` = `config.holdToConfirmMs`.
   */
  holdToConfirm?: boolean | OgeHoldToConfirmOptions;
  /**
   * Repeats `onClick` while the button is held (spinner/counter buttons).
   * Ignored when `holdToConfirm` is also set. `true` = config delay/interval.
   */
  autoRepeat?: boolean | OgeAutoRepeatOptions;
  /** Per-instance overrides of user-facing strings. */
  messages?: Partial<OgeButtonsMessages>;
  /**
   * Fires after the gesture/guard pipeline accepts a click. Use this instead
   * of a native click handler — the native event bypasses `clickGuard`,
   * `holdToConfirm`, `autoRepeat` and the single-flight `action` protection.
   */
  onClick?: (event: MouseEvent | KeyboardEvent) => void;
  /** Fires when the `action` callback settles successfully. */
  onActionDone?: (result: unknown) => void;
  /** Fires when the `action` callback throws or rejects. */
  onActionFailed?: (error: unknown) => void;
  /** Extra class names appended to the host element. */
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Imperative handle, mirroring the Angular component's public methods. */
export interface OgeButtonHandle {
  /** Moves keyboard focus to the inner native button. */
  focus(): void;
}

/**
 * Action button with severity/styling variants, async single-flight `action`
 * handling, click guarding, a badge, hold-to-confirm and auto-repeat gestures.
 *
 * ```tsx
 * <OgeButton text="Save" severity="accent" action={save} onActionDone={onSaved} />
 * <OgeButton text="Delete" severity="danger" holdToConfirm onClick={remove} />
 * ```
 *
 * Inside an `<OgeButtonGroup>` the button inherits the group's `stylingMode`,
 * `severity`, `size` and `disabled` unless set locally.
 *
 * The press pipeline is `@oge-ui/behavior`'s `OgeButtonPress` — the same
 * machine the Angular button runs, not a re-implementation of it.
 */
export const OgeButton = forwardRef<OgeButtonHandle, OgeButtonProps>(
  function OgeButton(props, ref) {
    const {
      text = '',
      hint,
      disabled = false,
      stylingMode,
      severity,
      size,
      color,
      icon,
      iconPosition = 'before',
      tabIndex = 0,
      accessKey,
      useSubmitBehavior = false,
      buttonType = 'button',
      ariaLabel,
      value,
      ariaHasPopup,
      ariaExpanded,
      ariaControls,
      loading: loadingProp,
      onLoadingChange,
      action,
      clickGuard = false,
      badge,
      holdToConfirm = false,
      autoRepeat = false,
      messages,
      onClick,
      onActionDone,
      onActionFailed,
      className,
      style,
      children,
    } = props;

    const config = useOgeButtonsConfig();
    const group = useOgeButtonGroup();
    const nativeRef = useRef<HTMLButtonElement>(null);

    const [uncontrolledLoading, setUncontrolledLoading] = useState(false);
    const loading = loadingProp ?? uncontrolledLoading;
    const [hold, setHold] = useState({ holding: false, ready: false });

    const msg = useMemo(
      () => ({ ...config.messages, ...messages }),
      [config.messages, messages],
    );

    const effectiveStylingMode =
      stylingMode ?? group?.stylingMode ?? 'contained';
    const effectiveSeverity = severity ?? group?.severity ?? 'normal';
    const effectiveSize = size ?? group?.size ?? 'md';
    const isDisabled = disabled || loading || (group?.disabled ?? false);

    const selected = group ? group.isSelected(value) : false;

    const holdOpts = resolveHoldToConfirm(
      holdToConfirm,
      config.holdToConfirmMs,
    );
    const repeatOpts = resolveAutoRepeat(autoRepeat, holdOpts !== null, {
      delayMs: config.autoRepeatDelayMs,
      intervalMs: config.autoRepeatIntervalMs,
    });
    const guardOpts = resolveClickGuard(clickGuard, config.clickGuardMs);

    // The machine is created once and reads live values through the ref-backed
    // getters below, so a re-render never restarts an in-flight gesture.
    const latest = useRef({
      holdOpts,
      repeatOpts,
      guardOpts,
      isDisabled,
      action,
      onClick,
      onActionDone,
      onActionFailed,
      onLoadingChange,
      value,
      group,
      loadingControlled: loadingProp !== undefined,
    });
    latest.current = {
      holdOpts,
      repeatOpts,
      guardOpts,
      isDisabled,
      action,
      onClick,
      onActionDone,
      onActionFailed,
      onLoadingChange,
      value,
      group,
      loadingControlled: loadingProp !== undefined,
    };

    const pressRef = useRef<OgeButtonPress>(undefined);
    if (!pressRef.current) {
      pressRef.current = new OgeButtonPress({
        hold: () => latest.current.holdOpts,
        repeat: () => latest.current.repeatOpts,
        guard: () => latest.current.guardOpts,
        isDisabled: () => latest.current.isDisabled,
        action: () => latest.current.action,
        captureTarget: () => nativeRef.current,
        onClick: (event) => {
          latest.current.onClick?.(event);
          latest.current.group?.notifyClick(latest.current.value, event);
        },
        onHoldStateChange: (state) => setHold(state),
        onLoadingChange: (busy) => {
          if (!latest.current.loadingControlled) setUncontrolledLoading(busy);
          latest.current.onLoadingChange?.(busy);
        },
        onActionDone: (result) => latest.current.onActionDone?.(result),
        onActionFailed: (error) => latest.current.onActionFailed?.(error),
      });
    }
    const press = pressRef.current;

    // The cleanup destroys the machine; the mount side revives it. Under
    // StrictMode the pair runs destroy → remount with the machine still in
    // the ref, so without the revive every button would go permanently dead
    // in development. On the first mount the revive is a no-op.
    useEffect(() => {
      press.revive();
      return () => press.destroy();
    }, [press]);

    // A disabled (or newly loading) button must not keep a live gesture.
    useEffect(() => {
      if (isDisabled) press.cancel();
    }, [isDisabled, press]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus({ preventScroll: true }),
      }),
      [],
    );

    // In an effect, not the render body: render-phase side effects fire on
    // every re-render (and twice under StrictMode); the effect warns once per
    // actual change of the offending pair. Keyed on booleans, not the props —
    // the options are often inline object literals whose identity changes
    // every render.
    const holdRequested = !!holdToConfirm;
    const repeatRequested = !!autoRepeat;
    useEffect(() => {
      if (isDevMode() && holdRequested && repeatRequested) {
        console.error(
          '[OgeButton] `holdToConfirm` and `autoRepeat` are mutually exclusive; `holdToConfirm` wins.',
        );
      }
    }, [holdRequested, repeatRequested]);

    const hasGesture = holdOpts !== null || repeatOpts !== null;

    const badgeText =
      badge === undefined || typeof badge === 'boolean'
        ? null
        : typeof badge === 'number'
          ? badge > 99
            ? '99+'
            : String(badge)
          : badge;
    const showDot = badge === true;

    const hintText = !holdOpts
      ? hint
      : hint
        ? `${hint} (${msg.holdToConfirm})`
        : msg.holdToConfirm;

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (press.click(event.nativeEvent)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      [press],
    );

    const hostClass = [
      'oge-button',
      isDisabled && 'oge-disabled',
      loading && 'oge-button-loading',
      hold.holding && 'oge-button-holding',
      hold.ready && 'oge-button-hold-ready',
      selected && 'oge-button-selected',
      (effectiveSeverity !== 'normal' || !!color) && 'oge-button-colored',
      effectiveStylingMode === 'outlined' && 'oge-button-outlined',
      effectiveStylingMode === 'text' && 'oge-button-text-mode',
      effectiveSeverity !== 'normal' &&
        `oge-button-severity-${effectiveSeverity}`,
      effectiveSize === 'sm' && 'oge-button-sm',
      effectiveSize === 'lg' && 'oge-button-lg',
      iconPosition === 'after' && 'oge-button-icon-after',
      hasGesture && 'oge-button-gesture',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const hostStyle = {
      ...style,
      ...(color
        ? {
            ['--oge-btn-main' as string]: color,
            ['--oge-btn-soft' as string]: `color-mix(in srgb, ${color} 14%, transparent)`,
          }
        : null),
      ...(holdOpts
        ? { ['--oge-hold-ms' as string]: `${holdOpts.ms}ms` }
        : null),
    } as CSSProperties;

    return (
      <span className={hostClass} style={hostStyle}>
        <button
          ref={nativeRef}
          className="oge-button-native"
          // read by the enclosing group when it writes the roving tabindex and
          // resolves arrow-key selection straight off the DOM
          data-oge-value={value}
          type={useSubmitBehavior ? 'submit' : buttonType}
          aria-label={ariaLabel}
          disabled={isDisabled}
          // the group's server-renderable first-paint answer wins over the
          // button's own prop; the group's layout effect refines it on the
          // client from real DOM order
          tabIndex={group?.initialTabIndex(value) ?? tabIndex}
          title={hintText}
          accessKey={accessKey}
          aria-busy={loading ? true : undefined}
          role={group?.selectionMode === 'single' ? 'radio' : undefined}
          aria-checked={
            group?.selectionMode === 'single' ? selected : undefined
          }
          aria-pressed={
            group?.selectionMode === 'multiple' ? selected : undefined
          }
          aria-haspopup={ariaHasPopup}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          onClick={handleClick}
          onPointerDown={(e) => press.pointerDown(e.nativeEvent)}
          onPointerUp={(e) => press.pointerUp(e.nativeEvent)}
          onPointerCancel={() => press.pointerCancel()}
          onContextMenu={(e) => {
            if (press.contextMenu()) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (press.keyDown(e.nativeEvent)) e.preventDefault();
          }}
          onKeyUp={(e) => press.keyUp(e.nativeEvent)}
        >
          {loading && (
            <>
              <svg
                className="oge-button-spinner"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M8 1.5 A 6.5 6.5 0 1 1 1.5 8" />
              </svg>
              <span className="oge-button-sr">{msg.loading}</span>
            </>
          )}
          <span className="oge-button-icon">{icon}</span>
          {text && <span className="oge-button-text">{text}</span>}
          {children}
          {badgeText !== null && (
            <span className="oge-button-sr">{badgeText}</span>
          )}
          {holdOpts && (
            <span className="oge-button-hold-bar" aria-hidden="true" />
          )}
        </button>
        {badgeText !== null ? (
          <span className="oge-button-badge" aria-hidden="true">
            {badgeText}
          </span>
        ) : showDot ? (
          <span
            className="oge-button-badge oge-button-badge-dot"
            aria-hidden="true"
          />
        ) : null}
      </span>
    );
  },
);
