/**
 * Framework-free half of the toast service (ADR 0001): the vocabulary, the
 * option defaults, and the whole notification engine — chronological entry
 * list, per-position FIFO queue against `maxVisible`, ref-counted pause /
 * resume timers, the progress-bar freeze/arm dance, duplicate coalescing,
 * in-place updates (`promise()` morphing), two-phase dismissal and the
 * live-region announcement rule. The render layers own the DOM: they render
 * `regions()`, wire hover/focus to `pause`/`resume`, flip `ready` one frame
 * after mount via `markReady`, and provide the two live-region elements.
 */

import { prefersReducedMotion } from '../a11y/motion';
import {
  beginPointerGesture,
  type OgePointerGestureInput,
} from '../gesture/pointer-gesture';

// --- vocabulary -------------------------------------------------------------

/** Visual + semantic severity of a toast. */
export type OgeToastSeverity = 'info' | 'success' | 'warning' | 'error';

/** Viewport edge the toast stack is pinned to (logical, RTL-aware). */
export type OgeToastPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

/** Why a toast closed. */
export type OgeToastCloseReason =
  'timeout' | 'closeButton' | 'click' | 'action' | 'api' | 'clear' | 'swipe';

/**
 * Screen-reader announcement mode. When omitted it derives from severity:
 * `error` announces assertively, everything else politely.
 */
export type OgeToastAnnounce = 'polite' | 'assertive' | 'off';

/** Payload of a toast action button press. */
export interface OgeToastActionEvent<D = unknown> {
  /** The `data` value the toast was shown with, if any. */
  readonly data?: D;
  /** The originating click. */
  readonly event: MouseEvent;
}

/**
 * Inline action button ('Undo', 'Retry', …). Pressing it runs `handler`
 * and closes the toast with reason `'action'`.
 */
export interface OgeToastAction<D = unknown> {
  /** Button label. */
  text: string;
  /** Invoked before the toast closes. */
  handler?: (event: OgeToastActionEvent<D>) => void;
}

/** Resolved when a toast has closed (after its exit transition). */
export interface OgeToastClosedEvent {
  /** What triggered the close. */
  readonly reason: OgeToastCloseReason;
}

/**
 * The render-layer-agnostic toast options. Each layer extends these with its
 * own custom-content members (`TemplateRef`s in Angular, render props /
 * nodes in React).
 */
export interface OgeToastBaseOptions<D = unknown> {
  /** Body text; also the screen-reader announcement. */
  message: string;
  /** Optional bold first line above the message. */
  title?: string;
  /** Severity — drives the accent bar, icon and announcement mode. Default `'info'`. */
  severity?: OgeToastSeverity;
  /** Auto-dismiss time in ms. Default: config `toastDisplayTime`. */
  displayTime?: number;
  /** Never auto-dismisses. Default `false` (`loading` toasts are implicitly sticky). */
  sticky?: boolean;
  /** Shows the ✕ button. Default `true`. */
  closable?: boolean;
  /** A click anywhere on the toast closes it (reason `'click'`). Default `false`. */
  closeOnClick?: boolean;
  /** Shows the remaining-time bar. Default: config `toastProgressBar`. */
  progressBar?: boolean;
  /** Inline action button; closing reason becomes `'action'`. */
  action?: OgeToastAction<D>;
  /** Region override. Default: config `toastPosition`. */
  position?: OgeToastPosition;
  /** Announcement mode override. Default derives from severity. */
  announce?: OgeToastAnnounce;
  /**
   * Screen-reader text override — announced instead of `title` + `message`.
   * Lets the visual text stay short while the announcement carries full
   * context ("Saved" vs "Document saved to Drafts").
   */
  announceText?: string;
  /** Spinner instead of the severity icon; implicitly sticky while `true`. */
  loading?: boolean;
  /** Merge with an identical visible toast into one with a ×N badge. Default: config `toastCoalesceDuplicates`. */
  coalesce?: boolean;
  /** Coalesce key and `update` identity; defaults to severity+title+message. */
  id?: string;
  /** Extra class(es) on the toast element. */
  cssClass?: string;
  /** Arbitrary payload surfaced in the content context and action event. */
  data?: D;
}

/**
 * Patch accepted by `OgeToastRef.update()`. Changing `displayTime`, `sticky`
 * or `loading` restarts the auto-dismiss timer; a changed `message`
 * re-announces. Render layers widen it with their custom-content members.
 */
export type OgeToastBasePatch<D = unknown> = Partial<
  Omit<OgeToastBaseOptions<D>, 'position' | 'id'>
> & { [custom: string]: unknown };

/** The per-layer option defaults the engine resolves against. */
export interface OgeToastDefaults {
  /** Default toast stack position. */
  position: OgeToastPosition;
  /** Default auto-dismiss time in ms. */
  displayTime: number;
  /** Max simultaneously visible toasts per position; extras queue FIFO. */
  maxVisible: number;
  /** Show the remaining-time progress bar by default. */
  progressBar: boolean;
  /** Coalesce identical toasts into one with a count badge by default. */
  coalesceDuplicates: boolean;
  /**
   * Stack mode: each region collapses into a deck (the newest toast in
   * front, up to {@link OGE_TOAST_STACK_VISIBLE} peeking behind it) that
   * expands into a list on hover / focus-within, and toasts swipe away
   * sideways. Optional so layers built before it keep type-checking.
   */
  stacked?: boolean;
}

export const OGE_DEFAULT_TOAST_DEFAULTS: OgeToastDefaults = {
  position: 'bottom-end',
  displayTime: 4000,
  maxVisible: 5,
  progressBar: false,
  coalesceDuplicates: false,
  stacked: false,
};

/** Toasts a collapsed stack shows: the front one and two peeking behind it. */
export const OGE_TOAST_STACK_VISIBLE = 3;
/** Horizontal travel (px) past which a released swipe dismisses a toast. */
export const OGE_TOAST_SWIPE_DISMISS = 48;

/**
 * Exit-transition length; must cover `--oge-toast-transition` (default
 * `--oge-motion-duration-fast`, 120ms).
 */
export const OGE_TOAST_EXIT_MS = 150;
/** Delay before writing announcer text (guarantees live-region pickup). */
export const OGE_TOAST_ANNOUNCE_DELAY_MS = 100;

/** Every region position, in render order. */
export const OGE_TOAST_POSITIONS: readonly OgeToastPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];

/**
 * Constraint for a layer's option type. `any` on purpose: the action
 * handler's parameter makes `OgeToastBaseOptions<D>` contravariant in `D`,
 * so a generic layer type could never satisfy `OgeToastBaseOptions<unknown>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToastOptions = OgeToastBaseOptions<any>;

/** Options with every defaulted field filled in. */
export type OgeResolvedToastOptions<O extends AnyToastOptions> = O & {
  severity: OgeToastSeverity;
  position: OgeToastPosition;
  displayTime: number;
  sticky: boolean;
  closable: boolean;
  closeOnClick: boolean;
  progressBar: boolean;
  coalesce: boolean;
  loading: boolean;
};

/** Inline style of the progress bar: frozen at a fraction or counting down. */
export interface OgeToastProgressStyle {
  readonly transition: string;
  readonly transform: string;
}

/** One live toast; the engine owns it, the render layer renders it. */
export interface OgeToastEntry<
  O extends AnyToastOptions = OgeToastBaseOptions,
> {
  readonly key: number;
  options: OgeResolvedToastOptions<O>;
  /** Entrance class applied one frame after mount (`markReady`). */
  ready: boolean;
  /** Exit transition in progress; removed after `OGE_TOAST_EXIT_MS`. */
  closing: boolean;
  /** Coalesced duplicate count (renders the ×N badge above 1). */
  count: number;
  /** Inline style of the progress bar, `null` when it does not render. */
  progressStyle: OgeToastProgressStyle | null;
  readonly ref: OgeToastRef;
  /** @internal */
  timerId: ReturnType<typeof setTimeout> | null;
  /** @internal */
  startedAt: number;
  /** @internal */
  remaining: number;
  /** @internal */
  total: number;
  /** @internal */
  pauseCauses: number;
  /** @internal paused because its stacked region is expanded */
  stackPaused: boolean;
  /** @internal */
  resolveClosed: (event: OgeToastClosedEvent) => void;
}

/** Handle of a shown toast: close it, patch it live, await its dismissal. */
export class OgeToastRef<D = unknown> {
  /** @internal wired by the engine. */
  _close: () => void = () => undefined;
  /** @internal wired by the engine. */
  _update: (patch: OgeToastBasePatch<D>) => void = () => undefined;

  /** Resolves after the toast closed (exit transition included). */
  readonly closed: Promise<OgeToastClosedEvent>;

  constructor(closed: Promise<OgeToastClosedEvent>) {
    this.closed = closed;
  }

  /** Closes the toast (reason `'api'`). */
  close(): void {
    this._close();
  }

  /**
   * Patches the toast in place — message, severity, `loading`, timing….
   * Restarts the auto-dismiss timer when timing fields change and
   * re-announces when the message changes. Powers `promise()`.
   */
  update(patch: OgeToastBasePatch<D>): void {
    this._update(patch);
  }
}

/** Options of `promise()` over a layer's option type. */
export type OgeToastPromiseBaseOptions<T, O extends AnyToastOptions> = Omit<
  O,
  'message' | 'severity' | 'loading'
> & {
  /** Message shown while the promise is pending (spinner, sticky). */
  loading: string;
  /** Message or patch applied when the promise resolves. */
  success: string | ((value: T) => string | OgeToastBasePatch);
  /** Message or patch applied when the promise rejects. */
  error: string | ((error: unknown) => string | OgeToastBasePatch);
};

export interface OgeToastRegion<O extends AnyToastOptions> {
  readonly position: OgeToastPosition;
  /** Entries to render in this region — visible ones plus those exiting. */
  readonly visible: readonly OgeToastEntry<O>[];
  /** Stack mode (config `toastStacked`): the region renders as a deck. */
  readonly stacked: boolean;
  /** A stacked region the pointer or focus is in — laid out as a list, timers paused. */
  readonly expanded: boolean;
}

/** Why a stacked region is expanded — the pointer is over it, focus is in it. */
export type OgeToastExpandCause = 'hover' | 'focus';

export interface OgeToastCoreOptions {
  /** Live option defaults (a config read, so provider changes apply). */
  defaults: () => OgeToastDefaults;
  /** Notified after every change to the entries or to any entry's state. */
  onChange: () => void;
  /**
   * Writes the live-region text. The engine clears first and writes the
   * text `OGE_TOAST_ANNOUNCE_DELAY_MS` later, so repeated messages re-announce.
   */
  announce: (mode: 'polite' | 'assertive', text: string) => void;
}

let nextToastKey = 0;

/**
 * The toast engine. Generic over the layer's option type so custom-content
 * members (`template`, `icon`, `renderContent`…) ride along untouched.
 */
export class OgeToastCore<O extends AnyToastOptions = OgeToastBaseOptions> {
  /** Chronological list of live toasts. */
  entries: OgeToastEntry<O>[] = [];

  private destroyed = false;
  private listening = false;
  /** Stack mode: what keeps each region expanded. */
  private readonly expandCauses = new Map<
    OgeToastPosition,
    Set<OgeToastExpandCause>
  >();

  constructor(private readonly options: OgeToastCoreOptions) {}

  /** Shows a toast; a bare string becomes an info toast. */
  show(toast: string | O): OgeToastRef {
    const resolved = this.resolveOptions(
      (typeof toast === 'string' ? { message: toast } : toast) as O,
    );
    this.attach();

    if (resolved.coalesce) {
      const existing = this.findCoalesceTarget(resolved);
      if (existing) {
        existing.count += 1;
        this.restartTimer(existing);
        this.announce(existing.options);
        this.notify();
        return existing.ref;
      }
    }

    let resolveClosed!: (event: OgeToastClosedEvent) => void;
    const ref = new OgeToastRef(
      new Promise<OgeToastClosedEvent>((resolve) => (resolveClosed = resolve)),
    );
    const entry: OgeToastEntry<O> = {
      key: nextToastKey++,
      options: resolved,
      ready: false,
      closing: false,
      count: 1,
      progressStyle: null,
      ref,
      timerId: null,
      startedAt: 0,
      remaining: 0,
      total: 0,
      pauseCauses: typeof document !== 'undefined' && document.hidden ? 1 : 0,
      stackPaused: false,
      resolveClosed,
    };
    ref._close = () => this.dismiss(entry, 'api');
    ref._update = (patch) => this.update(entry, patch);

    this.entries = [...this.entries, entry];
    this.announce(resolved);
    this.scheduleClose(entry);
    // a toast arriving in an expanded stack waits like the rest of it
    if (this.isExpanded(resolved.position)) this.setStackPause(entry, true);
    this.notify();
    return ref;
  }

  /** Severity sugar for `show()`. */
  success(
    message: string,
    options?: Omit<O, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...(options as O), message, severity: 'success' });
  }

  info(
    message: string,
    options?: Omit<O, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...(options as O), message, severity: 'info' });
  }

  warning(
    message: string,
    options?: Omit<O, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...(options as O), message, severity: 'warning' });
  }

  error(
    message: string,
    options?: Omit<O, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...(options as O), message, severity: 'error' });
  }

  /**
   * Shows a loading toast that morphs in place when the promise settles —
   * the auto-dismiss timer only starts then.
   */
  promise<T>(
    promise: Promise<T>,
    options: OgeToastPromiseBaseOptions<T, O>,
  ): OgeToastRef {
    const { loading, success, error, ...rest } = options;
    const base = rest as unknown as O;
    const ref = this.show({
      ...base,
      message: loading,
      severity: 'info',
      loading: true,
      closable: base.closable ?? false,
    });
    const settle = (
      outcome: string | ((v: never) => string | OgeToastBasePatch),
      value: unknown,
      severity: OgeToastSeverity,
    ): void => {
      const raw =
        typeof outcome === 'function'
          ? (outcome as (v: unknown) => string | OgeToastBasePatch)(value)
          : outcome;
      const patch: OgeToastBasePatch =
        typeof raw === 'string' ? { message: raw } : raw;
      ref.update({
        severity,
        loading: false,
        sticky: base.sticky ?? false,
        closable: base.closable ?? true,
        ...patch,
      });
    };
    promise.then(
      (value) => settle(success, value, 'success'),
      (reason) => settle(error, reason, 'error'),
    );
    return ref;
  }

  /** Closes every toast (or every toast of one position); reason `'clear'`. */
  clear(position?: OgeToastPosition): void {
    for (const entry of this.entries) {
      if (position === undefined || entry.options.position === position) {
        this.dismiss(entry, 'clear');
      }
    }
  }

  /**
   * Entries grouped by position in render order. Closing toasts always
   * render out their exit; the freed slot promotes the next queued entry in
   * the same pass.
   */
  regions(): OgeToastRegion<O>[] {
    const defaults = this.options.defaults();
    const max = defaults.maxVisible;
    const stacked = defaults.stacked ?? false;
    const grouped = new Map<OgeToastPosition, OgeToastEntry<O>[]>();
    for (const entry of this.entries) {
      const list = grouped.get(entry.options.position) ?? [];
      list.push(entry);
      grouped.set(entry.options.position, list);
    }
    return OGE_TOAST_POSITIONS.filter((position) => grouped.has(position)).map(
      (position) => {
        const visible: OgeToastEntry<O>[] = [];
        let shown = 0;
        for (const entry of grouped.get(position) ?? []) {
          if (entry.closing) {
            visible.push(entry);
          } else if (shown < max) {
            visible.push(entry);
            shown++;
          }
        }
        return {
          position,
          visible,
          stacked,
          expanded: stacked && this.isExpanded(position),
        };
      },
    );
  }

  /** Flips the entrance flag; call one frame after the entry rendered. */
  markReady(entries: readonly OgeToastEntry<O>[]): void {
    let changed = false;
    for (const entry of entries) {
      if (!entry.ready && !entry.closing) {
        entry.ready = true;
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  /** Two-phase dismissal: closing flag → removal + resolve after the exit. */
  dismiss(entry: OgeToastEntry<O>, reason: OgeToastCloseReason): void {
    if (entry.closing) return;
    entry.closing = true;
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    this.notify();
    setTimeout(() => {
      if (this.destroyed) return;
      this.entries = this.entries.filter((e) => e !== entry);
      // an emptied region forgets its expansion — the pointer may never
      // have left a node that was removed under it
      const position = entry.options.position;
      if (!this.entries.some((e) => e.options.position === position)) {
        this.expandCauses.delete(position);
      }
      entry.resolveClosed({ reason });
      this.notify();
    }, OGE_TOAST_EXIT_MS);
  }

  /**
   * Stack mode: the pointer entered / left a stacked region, or focus moved
   * in / out of it. While any cause holds, the region is expanded and every
   * toast in it is paused; the last cause leaving collapses it and resumes
   * them with their remaining time.
   */
  setRegionExpanded(
    position: OgeToastPosition,
    cause: OgeToastExpandCause,
    on: boolean,
  ): void {
    const before = this.isExpanded(position);
    const causes = new Set(this.expandCauses.get(position) ?? []);
    if (on) causes.add(cause);
    else causes.delete(cause);
    if (causes.size) this.expandCauses.set(position, causes);
    else this.expandCauses.delete(position);
    const after = this.isExpanded(position);
    if (before === after) return;
    for (const entry of this.entries) {
      if (entry.options.position === position) {
        this.setStackPause(entry, after);
      }
    }
    this.notify();
  }

  /** Whether a stacked region is expanded (any cause holds). */
  isExpanded(position: OgeToastPosition): boolean {
    return (this.expandCauses.get(position)?.size ?? 0) > 0;
  }

  /** Ref-counted pause (hover / focus-within / tab hidden). */
  pause(entry: OgeToastEntry<O>): void {
    if (++entry.pauseCauses > 1 || !this.isTimed(entry)) return;
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    entry.remaining = Math.max(
      0,
      entry.remaining - (Date.now() - entry.startedAt),
    );
    this.freezeProgress(entry);
    this.notify();
  }

  /** Resumes with the remaining time once every cause released. */
  resume(entry: OgeToastEntry<O>): void {
    if (entry.pauseCauses === 0 || --entry.pauseCauses > 0) return;
    if (!this.isTimed(entry)) return;
    this.startTimer(entry);
    this.notify();
  }

  /** Clears timers and the document listener; pending callbacks go inert. */
  destroy(): void {
    this.destroyed = true;
    for (const entry of this.entries) {
      if (entry.timerId !== null) clearTimeout(entry.timerId);
    }
    if (this.listening && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.listening = false;
    }
  }

  // ── internals ───────────────────────────────────────────────────────────

  private attach(): void {
    if (this.listening || typeof document === 'undefined') return;
    this.listening = true;
    this.destroyed = false;
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private setStackPause(entry: OgeToastEntry<O>, on: boolean): void {
    if (on && !entry.stackPaused && !entry.closing) {
      entry.stackPaused = true;
      this.pause(entry);
    } else if (!on && entry.stackPaused) {
      entry.stackPaused = false;
      this.resume(entry);
    }
  }

  private notify(): void {
    if (!this.destroyed) this.options.onChange();
  }

  private isTimed(entry: OgeToastEntry<O>): boolean {
    return !entry.options.sticky && !entry.options.loading && !entry.closing;
  }

  private scheduleClose(entry: OgeToastEntry<O>): void {
    if (!this.isTimed(entry)) {
      entry.progressStyle = null;
      return;
    }
    entry.total = entry.remaining = entry.options.displayTime;
    if (entry.pauseCauses === 0) this.startTimer(entry);
    else this.freezeProgress(entry);
  }

  private restartTimer(entry: OgeToastEntry<O>): void {
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    this.scheduleClose(entry);
  }

  private startTimer(entry: OgeToastEntry<O>): void {
    entry.startedAt = Date.now();
    entry.timerId = setTimeout(() => {
      if (this.destroyed) return;
      entry.timerId = null;
      this.dismiss(entry, 'timeout');
    }, entry.remaining);
    // Freeze at the current fraction, then arm the transition two frames
    // later: frame 1 paints the frozen state (freshly inserted elements have
    // no previous computed style — a same-frame write would skip the
    // transition entirely), frame 2 starts the countdown.
    if (entry.options.progressBar) {
      this.freezeProgress(entry);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => this.armProgress(entry)),
      );
    }
  }

  /** Transitions the frozen bar to 0 over the live remaining time. */
  private armProgress(entry: OgeToastEntry<O>): void {
    if (this.destroyed || entry.pauseCauses > 0 || !this.isTimed(entry)) return;
    if (entry.timerId === null || !entry.options.progressBar) return;
    const liveRemaining = Math.max(
      0,
      entry.remaining - (Date.now() - entry.startedAt),
    );
    entry.progressStyle = {
      transition: `transform ${liveRemaining}ms linear`,
      transform: 'scaleX(0)',
    };
    this.notify();
  }

  private freezeProgress(entry: OgeToastEntry<O>): void {
    if (!entry.options.progressBar) return;
    const fraction = entry.total > 0 ? entry.remaining / entry.total : 0;
    entry.progressStyle = {
      transition: 'none',
      transform: `scaleX(${fraction})`,
    };
  }

  private update(entry: OgeToastEntry<O>, patch: OgeToastBasePatch): void {
    if (entry.closing) return;
    const previous = entry.options;
    const merged: Record<string, unknown> = {
      ...(previous as unknown as Record<string, unknown>),
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) merged[key] = value;
    }
    const next = merged as unknown as OgeResolvedToastOptions<O>;
    entry.options = next;
    if (
      next.message !== previous.message ||
      next.announceText !== previous.announceText
    ) {
      this.announce(next);
    }
    const timingChanged =
      next.displayTime !== previous.displayTime ||
      next.sticky !== previous.sticky ||
      next.loading !== previous.loading;
    if (timingChanged) this.restartTimer(entry);
    this.notify();
  }

  private findCoalesceTarget(
    options: OgeResolvedToastOptions<O>,
  ): OgeToastEntry<O> | undefined {
    const key = this.coalesceKey(options);
    return this.entries.find(
      (entry) => !entry.closing && this.coalesceKey(entry.options) === key,
    );
  }

  private coalesceKey(options: OgeResolvedToastOptions<O>): string {
    return (
      options.id ??
      `${options.severity} ${options.title ?? ''} ${options.message}`
    );
  }

  private resolveOptions(options: O): OgeResolvedToastOptions<O> {
    const defaults = this.options.defaults();
    return {
      ...options,
      severity: options.severity ?? 'info',
      position: options.position ?? defaults.position,
      displayTime: options.displayTime ?? defaults.displayTime,
      sticky: options.sticky ?? false,
      closable: options.closable ?? true,
      closeOnClick: options.closeOnClick ?? false,
      progressBar: options.progressBar ?? defaults.progressBar,
      coalesce: options.coalesce ?? defaults.coalesceDuplicates,
      loading: options.loading ?? false,
    };
  }

  private announce(options: OgeResolvedToastOptions<O>): void {
    const mode =
      options.announce ??
      (options.severity === 'error' ? 'assertive' : 'polite');
    if (mode === 'off') return;
    const text =
      options.announceText ??
      (options.title
        ? `${options.title}. ${options.message}`
        : options.message);
    // Clear-then-set (delayed) forces re-announcement of repeated messages.
    this.options.announce(mode, '');
    setTimeout(() => {
      if (this.destroyed) return;
      this.options.announce(mode, text);
    }, OGE_TOAST_ANNOUNCE_DELAY_MS);
  }

  /** Pauses/resumes every timed toast while the tab is hidden. */
  private readonly onVisibilityChange = (): void => {
    const hidden = document.hidden;
    for (const entry of this.entries) {
      if (hidden) this.pause(entry);
      else this.resume(entry);
    }
  };
}

// --- stack mode: the deck layout and the swipe ------------------------------

/**
 * The full height of a toast — also while its cell still collapses it
 * (entering, `grid-template-rows: 0fr`): the clipped content's
 * `scrollHeight` plus the borders.
 */
function toastHeight(toast: HTMLElement | null): number {
  if (!toast) return 0;
  const borders = toast.offsetHeight - toast.clientHeight;
  return Math.max(toast.offsetHeight, toast.scrollHeight + borders);
}

/**
 * Lays out a stacked region after a render: every live (non-closing) cell,
 * newest first, gets its `--oge-toast-depth` (0 = front) and its
 * `--oge-toast-stack-offset` — the height of the newer toasts plus the gaps,
 * i.e. where the expanded list puts it — and cells from depth
 * {@link OGE_TOAST_STACK_VISIBLE} on are marked `data-oge-toast-buried`. The
 * stylesheet turns these into transforms with a transition, so collapsing,
 * expanding, a new toast and a dismissal all glide without moving layout
 * (`toast.scss`). A closing cell keeps its last values and leaves from
 * there. Heights are layout heights, unaffected by the transforms. Call it after every render of the host.
 */
export function ogeLayoutToastStack(region: HTMLElement): void {
  const cells = Array.from(
    region.querySelectorAll<HTMLElement>(':scope > .oge-toast-cell'),
  ).filter((cell) => !cell.classList.contains('oge-toast-cell-closing'));
  let gap = 0;
  try {
    gap = parseFloat(getComputedStyle(region).rowGap) || 0;
  } catch {
    gap = 0;
  }
  let offset = 0;
  for (let depth = 0; depth < cells.length; depth++) {
    const cell = cells[cells.length - 1 - depth];
    cell.style.setProperty('--oge-toast-depth', String(depth));
    cell.style.setProperty('--oge-toast-stack-offset', `${offset}px`);
    cell.toggleAttribute(
      'data-oge-toast-buried',
      depth >= OGE_TOAST_STACK_VISIBLE,
    );
    offset +=
      toastHeight(cell.querySelector<HTMLElement>(':scope > .oge-toast')) + gap;
  }
}

/** Whether a horizontal swipe of `deltaX` px dismisses the toast. */
export function ogeToastSwipeDismisses(deltaX: number): boolean {
  return Math.abs(deltaX) >= OGE_TOAST_SWIPE_DISMISS;
}

/** Options of {@link beginOgeToastSwipe}. */
export interface OgeToastSwipeOptions {
  /** The `.oge-toast` element that follows the pointer. */
  toast: HTMLElement;
  /** Called once: `true` when the release passed the dismiss distance. */
  onFinish: (dismiss: boolean) => void;
}

/** Controls inside a toast whose presses never start a swipe. */
const SWIPE_EXEMPT =
  'button, a[href], input, select, textarea, [contenteditable]';

/**
 * Stack mode's swipe-to-dismiss, from a `pointerdown` on a toast: the toast
 * follows the pointer sideways (fading as it goes) and a release past
 * {@link OGE_TOAST_SWIPE_DISMISS} px dismisses it — it then leaves from
 * where it was let go; a shorter one glides back. Runs on the shared
 * `beginPointerGesture` (pointer capture, Escape / `pointercancel` cancel,
 * the click after a swipe swallowed). Presses on the toast's own controls
 * (the close button, the action, links and fields in custom content) never
 * start one. Returns `null` when no swipe started.
 */
export function beginOgeToastSwipe(
  event: OgePointerGestureInput & { readonly button?: number },
  options: OgeToastSwipeOptions,
): { cancel(): void } | null {
  if (event.button !== undefined && event.button !== 0) return null;
  const target = event.target as Element | null;
  if (target?.closest?.(SWIPE_EXEMPT)) return null;
  const { toast } = options;
  let deltaX = 0;
  const width = (): number => toast.offsetWidth || 1;
  return beginPointerGesture(event, {
    source: toast,
    suppressClick: true,
    onMove(dx) {
      deltaX = dx;
      toast.classList.add('oge-toast-swiping');
      if (prefersReducedMotion()) return;
      toast.style.translate = `${dx}px 0`;
      toast.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / width()));
    },
    onFinish(commit) {
      toast.classList.remove('oge-toast-swiping');
      const dismiss = commit && ogeToastSwipeDismisses(deltaX);
      // a dismissed toast fades out from where it was let go; anything else
      // glides back (the stylesheet transitions `translate`)
      if (!dismiss) {
        toast.style.translate = '';
        toast.style.opacity = '';
      }
      options.onFinish(dismiss);
    },
  });
}
