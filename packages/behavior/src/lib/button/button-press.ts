/**
 * Press pipeline of an action button, as a framework-free model class.
 *
 * Everything between "the user touched the button" and "a click is real" lives
 * here: the hold-to-confirm and auto-repeat gestures, the debounce/throttle
 * click guard, and the single-flight `action` lifecycle that keeps a second
 * click from starting while the first is still pending.
 *
 * The host owns rendering and reactivity. It feeds live values in through
 * getters and receives state back through callbacks, so an Angular component
 * can map them onto `signal()`s and a React component onto `useState` without
 * either dialect leaking in here.
 *
 * ```ts
 * const press = new OgeButtonPress({
 *   hold: () => ({ ms: 800 }),
 *   isDisabled: () => disabled,
 *   onClick: (event) => emit(event),
 * });
 * // wire press.pointerDown / pointerUp / keyDown / keyUp / click to the DOM
 * ```
 */

/** Duck-typed promise detection — a thenable settles the action pipeline. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/** Resolved hold-to-confirm timing. `null` disables the gesture. */
export interface OgeButtonHoldTiming {
  ms: number;
}

/** Resolved auto-repeat timing. `null` disables the gesture. */
export interface OgeButtonRepeatTiming {
  delayMs: number;
  intervalMs: number;
}

/** Resolved click-guard timing. `null` disables rate limiting. */
export interface OgeButtonGuardTiming {
  mode: 'debounce' | 'throttle';
  ms: number;
}

/** Visual state of the hold gesture, pushed to the host on every change. */
export interface OgeButtonHoldState {
  /** A hold is in progress — drives the fill animation. */
  holding: boolean;
  /** The hold duration elapsed; releasing now confirms. */
  ready: boolean;
}

export interface OgeButtonPressOptions {
  /**
   * Reactive getters — read the host's live state inside, so the machine
   * always sees current values without being told about them changing.
   */
  hold?: () => OgeButtonHoldTiming | null;
  repeat?: () => OgeButtonRepeatTiming | null;
  guard?: () => OgeButtonGuardTiming | null;
  /** Disabled *or* busy: blocks new presses and cancels a live gesture. */
  isDisabled: () => boolean;
  /** The async click handler, when the host has one. */
  action?: () => (() => unknown) | undefined;
  /** Element that should hold the pointer capture for the gesture. */
  captureTarget?: () => { setPointerCapture?(pointerId: number): void } | null;

  /** A click survived the gesture, the guard and the single-flight check. */
  onClick: (event: MouseEvent | KeyboardEvent) => void;
  /** Hold gesture state changed — render the fill/ready affordances. */
  onHoldStateChange?: (state: OgeButtonHoldState) => void;
  /** The single-flight `action` started or settled. */
  onLoadingChange?: (loading: boolean) => void;
  /** The `action` resolved (or returned a non-promise). */
  onActionDone?: (result: unknown) => void;
  /** The `action` threw or rejected. */
  onActionFailed?: (error: unknown) => void;
}

type PressSource = 'idle' | 'pointer' | 'keyboard';

export class OgeButtonPress {
  private press: PressSource = 'idle';
  private pressPointerId: number | null = null;
  private pressKey: string | null = null;
  private lastPressEvent: MouseEvent | KeyboardEvent | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private repeatDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private repeatIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFiredAt = Number.NEGATIVE_INFINITY;
  private pendingRunId: number | null = null;
  private actionSeq = 0;
  private destroyed = false;
  private holding = false;
  private holdReady = false;

  constructor(private readonly options: OgeButtonPressOptions) {}

  /** `true` when a hold or auto-repeat gesture is configured. */
  hasGesture(): boolean {
    return this.holdTiming() !== null || this.repeatTiming() !== null;
  }

  /** Releases every timer; call from the host's destroy hook. */
  destroy(): void {
    this.destroyed = true;
    this.clearHoldTimer();
    this.clearRepeatTimers();
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Undoes `destroy()` so the machine accepts input again.
   *
   * Exists for React's StrictMode, which simulates an unmount — running the
   * effect cleanup that destroys the machine — and then remounts the same
   * component holding the same instance in a ref. The mount side of the
   * effect revives it, tying the machine's lifetime to the effect rather
   * than to the ref. A real unmount destroys it for good because nothing
   * mounts again. Angular destroys are final and never call this.
   */
  revive(): void {
    if (!this.destroyed) return;
    this.destroyed = false;
    this.cancel();
  }

  /** Abandons a live gesture — used when the button becomes disabled. */
  cancel(): void {
    if (this.press === 'idle') return;
    this.resetHold();
    this.clearRepeatTimers();
    this.resetPress();
  }

  // --- native event pipeline -------------------------------------------------

  /**
   * Returns `true` when the host should suppress the native click: gesture
   * modes produce their own dispatches, so a quick tap on a hold-to-confirm
   * button must not still reach `click` listeners up the tree.
   */
  click(event: MouseEvent): boolean {
    if (this.hasGesture()) return true;
    this.dispatch(event);
    return false;
  }

  pointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.hasGesture() || this.press !== 'idle') {
      return;
    }
    this.press = 'pointer';
    this.pressPointerId = event.pointerId;
    this.lastPressEvent = event;
    // Capture on the button itself — a pressed descendant could be removed
    // mid-gesture, which would silently release the capture.
    this.options.captureTarget?.()?.setPointerCapture?.(event.pointerId);
    if (this.holdTiming()) this.startHold();
    else this.startRepeat(event);
  }

  pointerUp(event: PointerEvent): void {
    if (this.press !== 'pointer' || event.pointerId !== this.pressPointerId) {
      return;
    }
    this.finishPress(event);
  }

  pointerCancel(): void {
    if (this.press !== 'pointer') return;
    this.cancel();
  }

  /** `true` when the host should `preventDefault()` the context menu. */
  contextMenu(): boolean {
    // Long-press context menus would break hold/repeat gestures on touch.
    return this.hasGesture();
  }

  /** `true` when the host should `preventDefault()` the key event. */
  keyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      this.cancel();
      return false;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return false;
    if (!this.hasGesture()) return false; // plain mode: native click path
    if (event.repeat || this.press !== 'idle') return true;
    this.press = 'keyboard';
    this.pressKey = event.key;
    this.lastPressEvent = event;
    if (this.holdTiming()) this.startHold();
    else this.startRepeat(event);
    return true;
  }

  keyUp(event: KeyboardEvent): void {
    if (this.press !== 'keyboard') return;
    // Only the key that started the gesture may finish it.
    if (event.key !== this.pressKey) return;
    this.finishPress(event);
  }

  // --- gestures --------------------------------------------------------------

  private holdTiming(): OgeButtonHoldTiming | null {
    return this.options.hold?.() ?? null;
  }

  private repeatTiming(): OgeButtonRepeatTiming | null {
    if (this.holdTiming()) return null; // holdToConfirm wins
    return this.options.repeat?.() ?? null;
  }

  private setHoldState(holding: boolean, ready: boolean): void {
    if (this.holding === holding && this.holdReady === ready) return;
    this.holding = holding;
    this.holdReady = ready;
    this.options.onHoldStateChange?.({ holding, ready });
  }

  private startHold(): void {
    const hold = this.holdTiming();
    if (!hold) return;
    this.setHoldState(true, false);
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      this.setHoldState(true, true);
    }, hold.ms);
  }

  private startRepeat(event: MouseEvent | KeyboardEvent): void {
    const repeat = this.repeatTiming();
    if (!repeat) return;
    this.dispatch(event);
    this.repeatDelayTimer = setTimeout(() => {
      this.repeatDelayTimer = null;
      this.repeatIntervalTimer = setInterval(() => {
        if (this.destroyed || this.options.isDisabled()) {
          this.cancel();
          return;
        }
        if (this.lastPressEvent) this.dispatch(this.lastPressEvent);
      }, repeat.intervalMs);
    }, repeat.delayMs);
  }

  private finishPress(event: MouseEvent | KeyboardEvent): void {
    if (this.holdTiming()) {
      const confirmed = this.holdReady;
      this.resetHold();
      this.resetPress();
      if (confirmed) this.dispatch(event);
      return;
    }
    this.clearRepeatTimers();
    this.resetPress();
  }

  private resetPress(): void {
    this.press = 'idle';
    this.pressPointerId = null;
    this.pressKey = null;
    this.lastPressEvent = null;
  }

  private resetHold(): void {
    this.clearHoldTimer();
    this.setHoldState(false, false);
  }

  private clearHoldTimer(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private clearRepeatTimers(): void {
    if (this.repeatDelayTimer !== null) {
      clearTimeout(this.repeatDelayTimer);
      this.repeatDelayTimer = null;
    }
    if (this.repeatIntervalTimer !== null) {
      clearInterval(this.repeatIntervalTimer);
      this.repeatIntervalTimer = null;
    }
  }

  // --- click guard → single-flight → emit → action ---------------------------

  private dispatch(event: MouseEvent | KeyboardEvent): void {
    const guard = this.options.guard?.() ?? null;
    if (guard) {
      if (guard.mode === 'throttle') {
        const now = performance.now();
        if (now - this.lastFiredAt < guard.ms) return;
        this.lastFiredAt = now;
      } else {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.debounceTimer = null;
          this.fire(event);
        }, guard.ms);
        return;
      }
    }
    this.fire(event);
  }

  private fire(event: MouseEvent | KeyboardEvent): void {
    // Re-checked because debounced fires arrive later.
    if (this.destroyed || this.options.isDisabled()) return;
    if (this.pendingRunId !== null) return; // single-flight
    this.options.onClick(event);
    const action = this.options.action?.();
    if (!action) return;
    let result: unknown;
    try {
      result = action();
    } catch (error) {
      this.options.onActionFailed?.(error);
      return;
    }
    if (!isThenable(result)) {
      this.options.onActionDone?.(result);
      return;
    }
    const runId = ++this.actionSeq;
    this.pendingRunId = runId;
    this.options.onLoadingChange?.(true);
    result.then(
      (value) => this.settle(runId, () => this.options.onActionDone?.(value)),
      (error: unknown) =>
        this.settle(runId, () => this.options.onActionFailed?.(error)),
    );
  }

  private settle(runId: number, emit: () => void): void {
    if (this.destroyed || runId !== this.pendingRunId) return;
    this.pendingRunId = null;
    this.options.onLoadingChange?.(false);
    emit();
  }
}
