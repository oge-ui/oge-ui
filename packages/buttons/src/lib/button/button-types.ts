/** Fill style of a button. */
export type OgeButtonStylingMode = 'contained' | 'outlined' | 'text';

/**
 * Semantic color of a button, mapped to the `--oge-accent` /
 * `--oge-success` / `--oge-warning` / `--oge-danger` design tokens.
 */
export type OgeButtonSeverity =
  'normal' | 'accent' | 'success' | 'warning' | 'danger';

/** Height/padding preset of a button. */
export type OgeButtonSize = 'sm' | 'md' | 'lg';

/** Where projected `[ogeButtonIcon]` content renders relative to the label. */
export type OgeButtonIconPosition = 'before' | 'after';

/**
 * Payload of the `click` output. `event` is the raw DOM event — a
 * `KeyboardEvent` when the click was produced by Space/Enter during a
 * hold-to-confirm or auto-repeat gesture.
 */
export interface OgeButtonClickEvent {
  event: MouseEvent | KeyboardEvent;
}

/** Emitted when the `action` callback settles successfully. */
export interface OgeButtonActionDoneEvent {
  /** Resolved value of the action's promise (or its synchronous return value). */
  result: unknown;
}

/** Emitted when the `action` callback throws or rejects. */
export interface OgeButtonActionFailedEvent {
  error: unknown;
}

/**
 * Rate-limits the `click` output. The `true` shorthand equals
 * `{ mode: 'throttle', ms: config.clickGuardMs }`.
 */
export interface OgeClickGuardOptions {
  /** `throttle` fires immediately then ignores the window; `debounce` fires trailing. */
  mode: 'debounce' | 'throttle';
  /** Guard window in milliseconds; defaults to `config.clickGuardMs`. */
  ms?: number;
}

/**
 * Requires press-and-hold before `click` fires. The `true` shorthand equals
 * `{ ms: config.holdToConfirmMs }`.
 */
export interface OgeHoldToConfirmOptions {
  /** Hold duration in milliseconds; defaults to `config.holdToConfirmMs`. */
  ms?: number;
}

/**
 * Repeats `click` while the button is held (spinner use case). The `true`
 * shorthand uses `config.autoRepeatDelayMs` / `config.autoRepeatIntervalMs`.
 */
export interface OgeAutoRepeatOptions {
  /** Delay before repeating starts; defaults to `config.autoRepeatDelayMs`. */
  delayMs?: number;
  /** Interval between repeats; defaults to `config.autoRepeatIntervalMs`. */
  intervalMs?: number;
}
