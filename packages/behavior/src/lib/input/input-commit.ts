/**
 * The commit/debounce pipeline of every oge value editor, as a framework-free
 * machine (ADR 0001): keystrokes queue through an optional debounce, blur and
 * Enter flush synchronously (with an optional transform — the number box
 * clamps there), programmatic writes cancel staged commits, and a direct
 * commit supersedes anything staged. Extracted from the Angular
 * `OgeControlBase` so the React editors run the exact same rules.
 *
 * The host owns the value store and reactivity: it receives every commit
 * through `onCommit` with the previous value and the originating DOM event
 * (`undefined` for programmatic paths) and decides what to emit.
 */
export interface OgeInputCommitOptions<T> {
  /** Reactive getter — the live debounce setting. `undefined`/0 = immediate. */
  debounceMs: () => number | undefined;
  /** Reactive getter — the current committed value (`previousValue` source). */
  current: () => T;
  /** The single sink: update the store, notify forms, emit events. */
  onCommit: (value: T, previousValue: T, event: Event | undefined) => void;
}

export class OgeInputCommit<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private staged: { value: T; event: Event | undefined } | null = null;

  constructor(private readonly options: OgeInputCommitOptions<T>) {}

  /** `true` while a debounced value is staged and not yet committed. */
  hasPending(): boolean {
    return this.staged !== null;
  }

  /** Queues a value through the debounce; immediate when none is set. */
  queue(value: T, event?: Event): void {
    const ms = this.options.debounceMs();
    if (!ms) {
      this.commitNow(value, event);
      return;
    }
    this.staged = { value, event };
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      const staged = this.staged;
      this.staged = null;
      if (staged) this.commitNow(staged.value, staged.event);
    }, ms);
  }

  /**
   * Commits any staged debounced value synchronously (blur/Enter/teardown).
   * `transform` is applied to the flushed value — the number box clamps here.
   */
  flush(transform?: (value: T) => T): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const staged = this.staged;
    this.staged = null;
    if (staged) {
      this.commitNow(
        transform ? transform(staged.value) : staged.value,
        staged.event,
      );
    }
  }

  /** Drops any staged value — programmatic writes supersede user typing. */
  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.staged = null;
  }

  /** Commits immediately; supersedes anything staged (spin during debounce). */
  commitNow(value: T, event?: Event): void {
    this.cancel();
    this.options.onCommit(value, this.options.current(), event);
  }
}
