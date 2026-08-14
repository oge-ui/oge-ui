/**
 * The public *vocabulary* of the button family — variant names and option
 * shapes — shared by every render layer.
 *
 * Event payload types are deliberately absent: those are shaped by how a
 * framework delivers events (Angular `output()` objects vs. React callback
 * arguments), so each render layer declares its own. What must never diverge
 * is the set of severities, sizes and styling modes, which is what lives here.
 */

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

/** Where icon content renders relative to the label. */
export type OgeButtonIconPosition = 'before' | 'after';

/**
 * Rate-limits the click callback. The `true` shorthand equals
 * `{ mode: 'throttle', ms: config.clickGuardMs }`.
 */
export interface OgeClickGuardOptions {
  /** `throttle` fires immediately then ignores the window; `debounce` fires trailing. */
  mode: 'debounce' | 'throttle';
  /** Guard window in milliseconds; defaults to `config.clickGuardMs`. */
  ms?: number;
}

/**
 * Requires press-and-hold before the click fires. The `true` shorthand equals
 * `{ ms: config.holdToConfirmMs }`.
 */
export interface OgeHoldToConfirmOptions {
  /** Hold duration in milliseconds; defaults to `config.holdToConfirmMs`. */
  ms?: number;
}

/**
 * Repeats the click while the button is held (spinner use case). The `true`
 * shorthand uses `config.autoRepeatDelayMs` / `config.autoRepeatIntervalMs`.
 */
export interface OgeAutoRepeatOptions {
  /** Delay before repeating starts; defaults to `config.autoRepeatDelayMs`. */
  delayMs?: number;
  /** Interval between repeats; defaults to `config.autoRepeatIntervalMs`. */
  intervalMs?: number;
}

/** Selection behaviour of a button group. */
export type OgeButtonGroupSelectionMode = 'none' | 'single' | 'multiple';

// --- shared resolution of the shorthand-or-options inputs -------------------

/** Resolves `clickGuard` to the timing the press machine wants, or `null`. */
export function resolveClickGuard(
  guard: boolean | OgeClickGuardOptions | undefined,
  defaultMs: number,
): { mode: 'debounce' | 'throttle'; ms: number } | null {
  if (!guard) return null;
  if (guard === true) return { mode: 'throttle', ms: defaultMs };
  return { mode: guard.mode, ms: guard.ms ?? defaultMs };
}

/** Resolves `holdToConfirm` to the timing the press machine wants, or `null`. */
export function resolveHoldToConfirm(
  hold: boolean | OgeHoldToConfirmOptions | undefined,
  defaultMs: number,
): { ms: number } | null {
  if (!hold) return null;
  return { ms: hold === true ? defaultMs : (hold.ms ?? defaultMs) };
}

/**
 * Resolves `autoRepeat` to the timing the press machine wants, or `null`.
 * Returns `null` whenever a hold gesture is active — `holdToConfirm` wins.
 */
export function resolveAutoRepeat(
  repeat: boolean | OgeAutoRepeatOptions | undefined,
  holdActive: boolean,
  defaults: { delayMs: number; intervalMs: number },
): { delayMs: number; intervalMs: number } | null {
  if (holdActive) return null;
  if (!repeat) return null;
  if (repeat === true) return { ...defaults };
  return {
    delayMs: repeat.delayMs ?? defaults.delayMs,
    intervalMs: repeat.intervalMs ?? defaults.intervalMs,
  };
}
