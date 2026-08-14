import { describe, expect, it } from 'vitest';
import {
  resolveAutoRepeat,
  resolveClickGuard,
  resolveHoldToConfirm,
} from './button-types';

/**
 * The shorthand-or-options resolution behind three button inputs. Both render
 * layers hand the press machine the output of these, so a `true` shorthand
 * must mean the same milliseconds in either framework.
 */

describe('resolveClickGuard', () => {
  it('is off unless asked for', () => {
    expect(resolveClickGuard(undefined, 500)).toBe(null);
    expect(resolveClickGuard(false, 500)).toBe(null);
  });

  it('throttles by default on the true shorthand', () => {
    expect(resolveClickGuard(true, 500)).toEqual({
      mode: 'throttle',
      ms: 500,
    });
  });

  it('takes the mode from the options and falls back to the config timing', () => {
    expect(resolveClickGuard({ mode: 'debounce' }, 500)).toEqual({
      mode: 'debounce',
      ms: 500,
    });
    expect(resolveClickGuard({ mode: 'debounce', ms: 100 }, 500)).toEqual({
      mode: 'debounce',
      ms: 100,
    });
  });

  it('honours an explicit 0 rather than substituting the default', () => {
    expect(resolveClickGuard({ mode: 'throttle', ms: 0 }, 500)?.ms).toBe(0);
  });
});

describe('resolveHoldToConfirm', () => {
  it('is off unless asked for', () => {
    expect(resolveHoldToConfirm(undefined, 800)).toBe(null);
    expect(resolveHoldToConfirm(false, 800)).toBe(null);
  });

  it('uses the config duration on the shorthand and the option otherwise', () => {
    expect(resolveHoldToConfirm(true, 800)).toEqual({ ms: 800 });
    expect(resolveHoldToConfirm({ ms: 1500 }, 800)).toEqual({ ms: 1500 });
    expect(resolveHoldToConfirm({}, 800)).toEqual({ ms: 800 });
  });
});

describe('resolveAutoRepeat', () => {
  const defaults = { delayMs: 400, intervalMs: 80 };

  it('is off unless asked for', () => {
    expect(resolveAutoRepeat(undefined, false, defaults)).toBe(null);
    expect(resolveAutoRepeat(false, false, defaults)).toBe(null);
  });

  it('uses the config timings on the shorthand', () => {
    expect(resolveAutoRepeat(true, false, defaults)).toEqual(defaults);
    // a copy, so a caller cannot mutate the config through it
    expect(resolveAutoRepeat(true, false, defaults)).not.toBe(defaults);
  });

  it('fills each option independently', () => {
    expect(resolveAutoRepeat({ intervalMs: 20 }, false, defaults)).toEqual({
      delayMs: 400,
      intervalMs: 20,
    });
  });

  it('stands down while a hold gesture is running — holdToConfirm wins', () => {
    expect(resolveAutoRepeat(true, true, defaults)).toBe(null);
  });
});
