import { NgTemplateOutlet } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  createComponent,
  inject,
  signal,
  untracked,
  type ComponentRef,
  type WritableSignal,
} from '@angular/core';
import { OGE_OVERLAY_CONFIG } from '../config';
import type {
  OgeToastAction,
  OgeToastClosedEvent,
  OgeToastCloseReason,
  OgeToastOptions,
  OgeToastPosition,
  OgeToastPromiseOptions,
  OgeToastSeverity,
  OgeToastSlotContext,
  OgeToastUpdate,
} from './toast-types';

let nextToastKey = 0;

/** Exit-transition length; keep in sync with `--oge-toast-transition`. */
const EXIT_MS = 150;
/** Delay before writing announcer text (guarantees live-region pickup). */
const ANNOUNCE_DELAY_MS = 100;

const ALL_POSITIONS: readonly OgeToastPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];

type ResolvedToastOptions<D = unknown> = OgeToastOptions<D> & {
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

/** @internal One live toast; the host renders these, the service owns them. */
export interface ToastEntry {
  readonly key: number;
  readonly options: WritableSignal<ResolvedToastOptions>;
  readonly ready: WritableSignal<boolean>;
  readonly closing: WritableSignal<boolean>;
  readonly count: WritableSignal<number>;
  readonly progressStyle: WritableSignal<Record<string, string> | null>;
  readonly slotContext: OgeToastSlotContext;
  timerId: ReturnType<typeof setTimeout> | null;
  startedAt: number;
  remaining: number;
  total: number;
  pauseCauses: number;
  readonly ref: OgeToastRef;
  resolveClosed: (event: OgeToastClosedEvent) => void;
}

/**
 * Handle of a shown toast: close it, patch it live, await its dismissal.
 */
export class OgeToastRef<D = unknown> {
  /** @internal wired by the service. */
  _close: () => void = () => undefined;
  /** @internal wired by the service. */
  _update: (patch: OgeToastUpdate<D>) => void = () => undefined;

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
  update(patch: OgeToastUpdate<D>): void {
    this._update(patch);
  }
}

/**
 * Internal host rendered once into `document.body`: one fixed region per
 * used position plus the two permanently-mounted live-region announcers.
 * Not exported from the package barrel.
 */
@Component({
  selector: 'oge-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './toast.scss',
  template: `
    @for (region of regions(); track region.position) {
      <div
        class="oge-toast-region oge-toast-region-{{ region.position }}"
        role="region"
        [attr.aria-label]="messages().toastRegionLabel"
      >
        @for (entry of region.visible; track entry.key) {
          <div
            class="oge-toast-cell"
            [class.oge-toast-cell-ready]="entry.ready()"
            [class.oge-toast-cell-closing]="entry.closing()"
          >
            <!-- click-to-dismiss is opt-in; buttons keep their own semantics -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <div
              class="oge-toast"
              [class]="toastClasses(entry)"
              (click)="onToastClick(entry, $event)"
              (mouseenter)="svc.pause(entry)"
              (mouseleave)="svc.resume(entry)"
              (focusin)="onFocusIn(entry, $event)"
              (focusout)="onFocusOut(entry, $event)"
            >
              <span class="oge-toast-icon" aria-hidden="true">
                @if (entry.options().loading) {
                  <span class="oge-toast-spinner"></span>
                } @else {
                  @switch (entry.options().severity) {
                    @case ('success') {
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <circle
                          cx="8"
                          cy="8"
                          r="6.5"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                        />
                        <path
                          d="m5 8 2 2 4-4"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    }
                    @case ('warning') {
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <path
                          d="M8 2 15 14H1L8 2z"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M8 6.5v3.2M8 11.6v.4"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    }
                    @case ('error') {
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <circle
                          cx="8"
                          cy="8"
                          r="6.5"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                        />
                        <path
                          d="m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    }
                    @default {
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <circle
                          cx="8"
                          cy="8"
                          r="6.5"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                        />
                        <path
                          d="M8 7.4v3.6M8 4.9v.4"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    }
                  }
                }
              </span>
              <div class="oge-toast-body">
                @if (entry.options().template; as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl"
                    [ngTemplateOutletContext]="entry.slotContext"
                  />
                } @else {
                  @if (entry.options().title) {
                    <div class="oge-toast-title">
                      {{ entry.options().title }}
                    </div>
                  }
                  <div class="oge-toast-message">
                    {{ entry.options().message }}
                  </div>
                }
              </div>
              @if (entry.count() > 1) {
                <span class="oge-toast-count" aria-hidden="true">{{
                  countBadge(entry.count())
                }}</span>
              }
              @if (entry.options().action; as action) {
                <button
                  type="button"
                  class="oge-toast-action"
                  (click)="onAction(entry, action, $event)"
                >
                  {{ action.text }}
                </button>
              }
              @if (entry.options().closable) {
                <button
                  type="button"
                  class="oge-toast-close"
                  [attr.aria-label]="messages().toastClose"
                  (click)="svc.dismiss(entry, 'closeButton')"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                  >
                    <path
                      d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              }
              @if (
                entry.options().progressBar &&
                !entry.options().sticky &&
                !entry.options().loading
              ) {
                <div class="oge-toast-progress" aria-hidden="true">
                  <div
                    class="oge-toast-progress-bar"
                    [style]="entry.progressStyle()"
                  ></div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
    <div
      class="oge-toast-announcer"
      role="status"
      aria-live="polite"
      #polite
    ></div>
    <div
      class="oge-toast-announcer"
      role="alert"
      aria-live="assertive"
      #assertive
    ></div>
  `,
})
export class OgeToastHost {
  protected readonly svc = inject(OgeToastService);
  private readonly config = inject(OGE_OVERLAY_CONFIG);

  protected readonly messages = computed(() => this.config.messages);

  /** Entries grouped by position; only visible (non-queued) ones render. */
  protected readonly regions = computed(() => {
    const max = this.config.toastMaxVisible;
    const grouped = new Map<OgeToastPosition, ToastEntry[]>();
    for (const entry of this.svc.entries()) {
      const position = entry.options().position;
      const list = grouped.get(position) ?? [];
      list.push(entry);
      grouped.set(position, list);
    }
    return ALL_POSITIONS.filter((position) => grouped.has(position)).map(
      (position) => {
        const visible: ToastEntry[] = [];
        let shown = 0;
        for (const entry of grouped.get(position) ?? []) {
          // Closing toasts always render out their exit; the freed slot
          // promotes the next queued entry in the same pass.
          if (entry.closing()) {
            visible.push(entry);
          } else if (shown < max) {
            visible.push(entry);
            shown++;
          }
        }
        return { position, visible };
      },
    );
  });

  constructor() {
    let alive = true;
    inject(DestroyRef).onDestroy(() => (alive = false));
    // Entrance: newly rendered entries get their ready class one frame later.
    afterRenderEffect(() => {
      const pending = this.regions()
        .flatMap((region) => region.visible)
        .filter((entry) => !entry.ready() && !entry.closing());
      if (pending.length === 0) return;
      untracked(() => {
        requestAnimationFrame(() => {
          if (!alive) return;
          for (const entry of pending) entry.ready.set(true);
        });
      });
    });
  }

  protected toastClasses(entry: ToastEntry): string {
    const options = entry.options();
    let classes = `oge-toast-${options.severity}`;
    if (options.closeOnClick) classes += ' oge-toast-clickable';
    if (options.cssClass) classes += ` ${options.cssClass}`;
    return classes;
  }

  protected countBadge(count: number): string {
    return this.config.messages.toastCountBadge.replace(
      '{count}',
      String(count),
    );
  }

  protected onToastClick(entry: ToastEntry, event: MouseEvent): void {
    if (!entry.options().closeOnClick) return;
    if ((event.target as HTMLElement).closest('button')) return;
    this.svc.dismiss(entry, 'click');
  }

  protected onAction(
    entry: ToastEntry,
    action: OgeToastAction,
    event: MouseEvent,
  ): void {
    action.handler?.({ data: entry.options().data, event });
    this.svc.dismiss(entry, 'action');
  }

  protected onFocusIn(entry: ToastEntry, event: FocusEvent): void {
    // Only when focus enters from outside — moving between the toast's own
    // buttons must not double-count the pause.
    const toastEl = event.currentTarget as HTMLElement;
    if (toastEl.contains(event.relatedTarget as Node | null)) return;
    this.svc.pause(entry);
  }

  protected onFocusOut(entry: ToastEntry, event: FocusEvent): void {
    const toastEl = event.currentTarget as HTMLElement;
    if (toastEl.contains(event.relatedTarget as Node | null)) return;
    this.svc.resume(entry);
  }
}

/**
 * Imperative toast notifications — the suite's first service-first surface:
 *
 * ```ts
 * private readonly toasts = inject(OgeToastService);
 *
 * save(): void {
 *   this.toasts.success('Saved');                       // sugar per severity
 *   this.toasts.show({                                  // undo pattern
 *     message: 'Row deleted',
 *     sticky: true,
 *     action: { text: 'Undo', handler: () => this.restore() },
 *   });
 *   this.toasts.promise(this.api.publish(), {           // in-place morph
 *     loading: 'Publishing…',
 *     success: 'Published',
 *     error: (e) => `Failed: ${String(e)}`,
 *   });
 * }
 * ```
 *
 * Toasts render in body-appended fixed regions (`--oge-z-toast`, above
 * modals), never take focus, never join the Escape stack, and announce via
 * permanently-mounted hidden live regions (`error` asserts, the rest are
 * polite). Timers pause on hover, focus-within and while the tab is hidden,
 * and always resume with the remaining time.
 */
@Injectable({ providedIn: 'root' })
export class OgeToastService {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  /** @internal chronological list of live toasts; the host renders it. */
  readonly entries = signal<ToastEntry[]>([]);

  private hostRef: ComponentRef<OgeToastHost> | null = null;
  private politeEl: HTMLElement | null = null;
  private assertiveEl: HTMLElement | null = null;
  /** Deferred callbacks must not touch a destroyed ApplicationRef. */
  private destroyed = false;

  /** Shows a toast; a bare string becomes an info toast. */
  show<D = unknown>(toast: string | OgeToastOptions<D>): OgeToastRef<D> {
    if (typeof document === 'undefined') {
      // SSR: inert handle — nothing renders, `closed` never resolves.
      return new OgeToastRef<D>(new Promise<OgeToastClosedEvent>(() => void 0));
    }
    const options = this.resolveOptions(
      typeof toast === 'string' ? { message: toast } : toast,
    ) as ResolvedToastOptions;
    this.ensureHost();

    if (options.coalesce) {
      const existing = this.findCoalesceTarget(options);
      if (existing) {
        existing.count.update((count) => count + 1);
        this.restartTimer(existing);
        this.announce(existing.options());
        return existing.ref as OgeToastRef<D>;
      }
    }

    let resolveClosed!: (event: OgeToastClosedEvent) => void;
    const ref = new OgeToastRef<D>(
      new Promise<OgeToastClosedEvent>((resolve) => (resolveClosed = resolve)),
    );
    const entry: ToastEntry = {
      key: nextToastKey++,
      options: signal(options),
      ready: signal(false),
      closing: signal(false),
      count: signal(1),
      progressStyle: signal(null),
      slotContext: {
        $implicit: () => this.dismiss(entry, 'api'),
        data: options.data,
      },
      timerId: null,
      startedAt: 0,
      remaining: 0,
      total: 0,
      pauseCauses: document.hidden ? 1 : 0,
      ref: ref as OgeToastRef,
      resolveClosed,
    };
    ref._close = () => this.dismiss(entry, 'api');
    ref._update = (patch) => this.update(entry, patch as OgeToastUpdate);

    this.entries.update((list) => [...list, entry]);
    this.announce(options);
    this.scheduleClose(entry);
    return ref;
  }

  /** Success-severity sugar for `show()`. */
  success(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...options, message, severity: 'success' });
  }

  /** Info-severity sugar for `show()`. */
  info(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...options, message, severity: 'info' });
  }

  /** Warning-severity sugar for `show()`. */
  warning(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...options, message, severity: 'warning' });
  }

  /** Error-severity sugar for `show()` (announces assertively). */
  error(
    message: string,
    options?: Omit<OgeToastOptions, 'message' | 'severity'>,
  ): OgeToastRef {
    return this.show({ ...options, message, severity: 'error' });
  }

  /**
   * Shows a loading toast that morphs in place when the promise settles —
   * the auto-dismiss timer only starts then. `success`/`error` accept a
   * message or a function returning a message or a full update patch.
   */
  promise<T, D = unknown>(
    promise: Promise<T>,
    options: OgeToastPromiseOptions<T, D>,
  ): OgeToastRef<D> {
    const { loading, success, error, ...rest } = options;
    const ref = this.show<D>({
      ...(rest as OgeToastOptions<D>),
      message: loading,
      severity: 'info',
      loading: true,
      closable: rest.closable ?? false,
    });
    const settle = (
      outcome: string | ((v: never) => string | OgeToastUpdate<D>),
      value: unknown,
      severity: OgeToastSeverity,
    ): void => {
      const raw =
        typeof outcome === 'function'
          ? (outcome as (v: unknown) => string | OgeToastUpdate<D>)(value)
          : outcome;
      const patch: OgeToastUpdate<D> =
        typeof raw === 'string' ? { message: raw } : raw;
      ref.update({
        severity,
        loading: false,
        sticky: rest.sticky ?? false,
        closable: rest.closable ?? true,
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
    for (const entry of this.entries()) {
      if (position === undefined || entry.options().position === position) {
        this.dismiss(entry, 'clear');
      }
    }
  }

  // ── internal engine (called by the host) ─────────────────────────────────

  /** @internal Two-phase dismissal: closing class → removal + resolve. */
  dismiss(entry: ToastEntry, reason: OgeToastCloseReason): void {
    if (entry.closing()) return;
    entry.closing.set(true);
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    setTimeout(() => {
      if (this.destroyed) return;
      this.entries.update((list) => list.filter((e) => e !== entry));
      entry.resolveClosed({ reason });
    }, EXIT_MS);
  }

  /** @internal Ref-counted pause (hover / focus-within / tab hidden). */
  pause(entry: ToastEntry): void {
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
  }

  /** @internal Resumes with the remaining time once every cause released. */
  resume(entry: ToastEntry): void {
    if (entry.pauseCauses === 0 || --entry.pauseCauses > 0) return;
    if (!this.isTimed(entry)) return;
    this.startTimer(entry);
  }

  private isTimed(entry: ToastEntry): boolean {
    const options = entry.options();
    return !options.sticky && !options.loading && !entry.closing();
  }

  private scheduleClose(entry: ToastEntry): void {
    if (!this.isTimed(entry)) {
      entry.progressStyle.set(null);
      return;
    }
    entry.total = entry.remaining = entry.options().displayTime;
    if (entry.pauseCauses === 0) this.startTimer(entry);
    else this.freezeProgress(entry);
  }

  private restartTimer(entry: ToastEntry): void {
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    this.scheduleClose(entry);
  }

  private startTimer(entry: ToastEntry): void {
    entry.startedAt = Date.now();
    entry.timerId = setTimeout(() => {
      if (this.destroyed) return;
      entry.timerId = null;
      this.dismiss(entry, 'timeout');
    }, entry.remaining);
    if (entry.options().progressBar) {
      // Two-step write: jump to the current fraction, then transition to 0
      // over exactly the remaining time — provably in sync with the timer.
      this.freezeProgress(entry);
      requestAnimationFrame(() => {
        if (this.destroyed) return;
        if (entry.pauseCauses > 0 || !this.isTimed(entry)) return;
        entry.progressStyle.set({
          transition: `transform ${entry.remaining}ms linear`,
          transform: 'scaleX(0)',
        });
      });
    }
  }

  private freezeProgress(entry: ToastEntry): void {
    if (!entry.options().progressBar) return;
    const fraction = entry.total > 0 ? entry.remaining / entry.total : 0;
    entry.progressStyle.set({
      transition: 'none',
      transform: `scaleX(${fraction})`,
    });
  }

  private update(entry: ToastEntry, patch: OgeToastUpdate): void {
    if (entry.closing()) return;
    const previous = entry.options();
    const merged: Record<string, unknown> = { ...previous };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) merged[key] = value;
    }
    const next = merged as unknown as ResolvedToastOptions;
    entry.options.set(next);
    entry.slotContext.data = next.data;
    if (next.message !== previous.message) this.announce(next);
    const timingChanged =
      next.displayTime !== previous.displayTime ||
      next.sticky !== previous.sticky ||
      next.loading !== previous.loading;
    if (timingChanged) this.restartTimer(entry);
  }

  private findCoalesceTarget(
    options: ResolvedToastOptions,
  ): ToastEntry | undefined {
    const key = this.coalesceKey(options);
    return this.entries().find(
      (entry) => !entry.closing() && this.coalesceKey(entry.options()) === key,
    );
  }

  private coalesceKey(options: ResolvedToastOptions): string {
    return (
      options.id ??
      `${options.severity} ${options.title ?? ''} ${options.message}`
    );
  }

  private resolveOptions<D>(
    options: OgeToastOptions<D>,
  ): ResolvedToastOptions<D> {
    return {
      ...options,
      severity: options.severity ?? 'info',
      position: options.position ?? this.config.toastPosition,
      displayTime: options.displayTime ?? this.config.toastDisplayTime,
      sticky: options.sticky ?? false,
      closable: options.closable ?? true,
      closeOnClick: options.closeOnClick ?? false,
      progressBar: options.progressBar ?? this.config.toastProgressBar,
      coalesce: options.coalesce ?? this.config.toastCoalesceDuplicates,
      loading: options.loading ?? false,
    };
  }

  private announce(options: ResolvedToastOptions): void {
    const mode =
      options.announce ??
      (options.severity === 'error' ? 'assertive' : 'polite');
    if (mode === 'off') return;
    const el = mode === 'assertive' ? this.assertiveEl : this.politeEl;
    if (!el) return;
    const text = options.title
      ? `${options.title}. ${options.message}`
      : options.message;
    // Clear-then-set (delayed) forces re-announcement of repeated messages.
    el.textContent = '';
    setTimeout(() => {
      if (this.destroyed) return;
      el.textContent = text;
    }, ANNOUNCE_DELAY_MS);
  }

  private ensureHost(): void {
    if (this.hostRef) return;
    const hostRef = createComponent(OgeToastHost, {
      environmentInjector: this.envInjector,
    });
    const hostElement = hostRef.location.nativeElement as HTMLElement;
    document.body.appendChild(hostElement);
    this.appRef.attachView(hostRef.hostView);
    this.hostRef = hostRef;
    this.politeEl = hostElement.querySelector('[aria-live="polite"]');
    this.assertiveEl = hostElement.querySelector('[aria-live="assertive"]');
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      for (const entry of this.entries()) {
        if (entry.timerId !== null) clearTimeout(entry.timerId);
      }
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      // When this fires because the app itself is being destroyed, the view
      // is already being torn down — detaching again would warn (NG0406).
      if (!this.appRef.destroyed) {
        this.appRef.detachView(hostRef.hostView);
        hostRef.destroy();
      }
      hostElement.remove();
      this.hostRef = null;
    });
  }

  /** Pauses/resumes every timed toast while the tab is hidden. */
  private readonly onVisibilityChange = (): void => {
    const hidden = document.hidden;
    for (const entry of this.entries()) {
      if (hidden) this.pause(entry);
      else this.resume(entry);
    }
  };
}
