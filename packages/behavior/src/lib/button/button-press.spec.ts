import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OgeButtonPress,
  type OgeButtonGuardTiming,
  type OgeButtonHoldTiming,
  type OgeButtonRepeatTiming,
} from './button-press';

/**
 * Direct, framework-free specs for the press machine. The Angular and React
 * button suites exercise it through their render layers; these cover the
 * timer/lifecycle edges that are awkward to reach through a DOM — destroy
 * mid-debounce, stale-run settles, pointer-cancel mid-hold, revive.
 */
describe('OgeButtonPress', () => {
  let onClick: ReturnType<typeof vi.fn>;
  let onLoadingChange: ReturnType<typeof vi.fn>;
  let onActionDone: ReturnType<typeof vi.fn>;
  let onActionFailed: ReturnType<typeof vi.fn>;
  let onHoldStateChange: ReturnType<typeof vi.fn>;
  let disabled: boolean;
  let hold: OgeButtonHoldTiming | null;
  let repeat: OgeButtonRepeatTiming | null;
  let guard: OgeButtonGuardTiming | null;
  let action: (() => unknown) | undefined;

  const machine = () =>
    new OgeButtonPress({
      hold: () => hold,
      repeat: () => repeat,
      guard: () => guard,
      isDisabled: () => disabled,
      action: () => action,
      onClick,
      onHoldStateChange,
      onLoadingChange,
      onActionDone,
      onActionFailed,
    });

  const click = () => new MouseEvent('click', { button: 0 });
  const pointer = (type: string, pointerId = 1) => {
    // jsdom has no PointerEvent; the machine only reads button/pointerId.
    const event = new MouseEvent(type, {
      button: 0,
    }) as unknown as PointerEvent;
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    return event;
  };

  beforeEach(() => {
    // `performance` included: the throttle guard reads `performance.now()`,
    // which vitest's fake timers do not fake by default.
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
        'performance',
      ],
    });
    onClick = vi.fn();
    onLoadingChange = vi.fn();
    onActionDone = vi.fn();
    onActionFailed = vi.fn();
    onHoldStateChange = vi.fn();
    disabled = false;
    hold = null;
    repeat = null;
    guard = null;
    action = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a debounced fire scheduled before destroy() never lands', () => {
    guard = { mode: 'debounce', ms: 300 };
    const press = machine();
    press.click(click());
    press.destroy();
    vi.advanceTimersByTime(1000);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('a debounced fire re-checks disabled at fire time, not at click time', () => {
    guard = { mode: 'debounce', ms: 300 };
    const press = machine();
    press.click(click());
    disabled = true; // turned off while the debounce was pending
    vi.advanceTimersByTime(1000);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('a stale run settling does not clear a newer run', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    action = () => new Promise((resolve) => resolvers.push(resolve));
    const press = machine();

    press.click(click()); // run 1 (pending)
    expect(onLoadingChange).toHaveBeenLastCalledWith(true);

    // single-flight: a second click while pending is swallowed entirely
    press.click(click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(resolvers).toHaveLength(1);

    resolvers[0](undefined);
    await vi.runAllTimersAsync();
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    expect(onActionDone).toHaveBeenCalledTimes(1);

    // a fresh click is accepted again after the settle
    press.click(click());
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('a run that settles after destroy() emits nothing', async () => {
    let resolve!: (v: unknown) => void;
    action = () => new Promise((r) => (resolve = r));
    const press = machine();
    press.click(click());
    onLoadingChange.mockClear();

    press.destroy();
    resolve('late');
    await vi.runAllTimersAsync();
    expect(onActionDone).not.toHaveBeenCalled();
    expect(onLoadingChange).not.toHaveBeenCalled();
  });

  it('pointerCancel mid-hold abandons the gesture without firing', () => {
    hold = { ms: 500 };
    const press = machine();
    press.pointerDown(pointer('pointerdown'));
    expect(onHoldStateChange).toHaveBeenLastCalledWith({
      holding: true,
      ready: false,
    });

    vi.advanceTimersByTime(300); // not ready yet
    press.pointerCancel();
    expect(onHoldStateChange).toHaveBeenLastCalledWith({
      holding: false,
      ready: false,
    });

    // releasing later must not fire either — the press was abandoned
    press.pointerUp(pointer('pointerup'));
    vi.advanceTimersByTime(1000);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('auto-repeat stops itself when the button becomes disabled mid-press', () => {
    repeat = { delayMs: 100, intervalMs: 50 };
    const press = machine();
    press.pointerDown(pointer('pointerdown'));
    expect(onClick).toHaveBeenCalledTimes(1); // immediate first fire

    vi.advanceTimersByTime(200); // delay + 2 intervals
    const fired = onClick.mock.calls.length;
    expect(fired).toBeGreaterThan(1);

    disabled = true;
    vi.advanceTimersByTime(500);
    expect(onClick.mock.calls.length).toBe(fired); // no fires after disable
  });

  it('revive() after destroy() makes the machine accept input again', () => {
    const press = machine();
    press.destroy();
    press.click(click());
    expect(onClick).not.toHaveBeenCalled(); // dead machine swallows input

    press.revive();
    press.click(click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('revive() on a live machine is a no-op', () => {
    hold = { ms: 500 };
    const press = machine();
    press.pointerDown(pointer('pointerdown'));
    press.revive(); // must not cancel the live gesture
    vi.advanceTimersByTime(600);
    press.pointerUp(pointer('pointerup'));
    expect(onClick).toHaveBeenCalledTimes(1); // hold confirmed normally
  });

  it('throttle guard swallows fires inside the window and accepts after it', () => {
    guard = { mode: 'throttle', ms: 500 };
    const press = machine();
    press.click(click());
    press.click(click());
    expect(onClick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(600);
    press.click(click());
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('only the pointer that started the gesture may finish it', () => {
    hold = { ms: 100 };
    const press = machine();
    press.pointerDown(pointer('pointerdown', 1));
    vi.advanceTimersByTime(200); // ready
    press.pointerUp(pointer('pointerup', 2)); // different pointer — ignored
    expect(onClick).not.toHaveBeenCalled();
    press.pointerUp(pointer('pointerup', 1));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
