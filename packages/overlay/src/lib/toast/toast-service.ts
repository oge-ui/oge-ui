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
} from '@angular/core';
import {
  OgeToastCore,
  OgeToastRef,
  type OgeToastClosedEvent,
  type OgeToastEntry,
  type OgeToastRegion,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG } from '../config';
import type {
  OgeToastAction,
  OgeToastCloseReason,
  OgeToastOptions,
  OgeToastPosition,
  OgeToastPromiseOptions,
  OgeToastSlotContext,
} from './toast-types';

// The handle class is the engine's own, shared with the React toast;
// re-exported so `@oge-ui/overlay` remains the Angular import path.
export { OgeToastRef } from '@oge-ui/behavior';

/** @internal One live toast as the engine holds it; the host renders these. */
export type ToastEntry = OgeToastEntry<OgeToastOptions>;

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
            [class.oge-toast-cell-ready]="entry.ready"
            [class.oge-toast-cell-closing]="entry.closing"
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
                @if (entry.options.loading) {
                  <span class="oge-toast-spinner"></span>
                } @else if (entry.options.icon) {
                  <ng-container [ngTemplateOutlet]="entry.options.icon" />
                } @else {
                  @switch (entry.options.severity) {
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
                @if (entry.options.template; as tpl) {
                  <ng-container
                    [ngTemplateOutlet]="tpl"
                    [ngTemplateOutletContext]="slotContext(entry)"
                  />
                } @else {
                  @if (entry.options.title) {
                    <div class="oge-toast-title">
                      {{ entry.options.title }}
                    </div>
                  }
                  <div class="oge-toast-message">
                    {{ entry.options.message }}
                  </div>
                }
              </div>
              @if (entry.count > 1) {
                <span class="oge-toast-count" aria-hidden="true">{{
                  countBadge(entry.count)
                }}</span>
              }
              @if (entry.options.action; as action) {
                <button
                  type="button"
                  class="oge-toast-action"
                  (click)="onAction(entry, action, $event)"
                >
                  {{ action.text }}
                </button>
              }
              @if (entry.options.closable) {
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
                entry.options.progressBar &&
                !entry.options.sticky &&
                !entry.options.loading
              ) {
                <div class="oge-toast-progress" aria-hidden="true">
                  <div
                    class="oge-toast-progress-bar"
                    [style]="entry.progressStyle"
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
  protected readonly regions = computed<OgeToastRegion<OgeToastOptions>[]>(
    () => {
      this.svc.version();
      return this.svc.regions();
    },
  );

  /** One stable context per entry, so the template outlet never re-creates. */
  private readonly contexts = new WeakMap<ToastEntry, OgeToastSlotContext>();

  constructor() {
    let alive = true;
    inject(DestroyRef).onDestroy(() => (alive = false));
    // Entrance: newly rendered entries get their ready class one frame later.
    afterRenderEffect(() => {
      const pending = this.regions()
        .flatMap((region) => region.visible)
        .filter((entry) => !entry.ready && !entry.closing);
      if (pending.length === 0) return;
      untracked(() => {
        requestAnimationFrame(() => {
          if (!alive) return;
          this.svc.markReady(pending);
        });
      });
    });
  }

  protected slotContext(entry: ToastEntry): OgeToastSlotContext {
    let context = this.contexts.get(entry);
    if (!context) {
      context = { $implicit: () => this.svc.dismiss(entry, 'api') };
      this.contexts.set(entry, context);
    }
    context.data = entry.options.data;
    return context;
  }

  protected toastClasses(entry: ToastEntry): string {
    const options = entry.options;
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
    if (!entry.options.closeOnClick) return;
    if ((event.target as HTMLElement).closest('button')) return;
    this.svc.dismiss(entry, 'click');
  }

  protected onAction(
    entry: ToastEntry,
    action: OgeToastAction,
    event: MouseEvent,
  ): void {
    action.handler?.({ data: entry.options.data, event });
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
 *
 * The engine itself — queue, timers, coalescing, announcements — is
 * `@oge-ui/behavior`'s `OgeToastCore`, shared verbatim with the React toast
 * (ADR 0001); this service is the Angular seam that hosts it.
 */
@Injectable({ providedIn: 'root' })
export class OgeToastService {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly core = new OgeToastCore<OgeToastOptions>({
    defaults: () => ({
      position: this.config.toastPosition,
      displayTime: this.config.toastDisplayTime,
      maxVisible: this.config.toastMaxVisible,
      progressBar: this.config.toastProgressBar,
      coalesceDuplicates: this.config.toastCoalesceDuplicates,
    }),
    onChange: () => this._version.update((v) => v + 1),
    announce: (mode, text) => {
      const el = mode === 'assertive' ? this.assertiveEl : this.politeEl;
      if (el) el.textContent = text;
    },
  });

  /** @internal bumps after every engine change; the host re-reads through it. */
  private readonly _version = signal(0);
  /** @internal */
  readonly version = this._version.asReadonly();

  private hostRef: ComponentRef<OgeToastHost> | null = null;
  private politeEl: HTMLElement | null = null;
  private assertiveEl: HTMLElement | null = null;

  /** Shows a toast; a bare string becomes an info toast. */
  show<D = unknown>(toast: string | OgeToastOptions<D>): OgeToastRef<D> {
    if (typeof document === 'undefined') {
      // SSR: inert handle — nothing renders, `closed` never resolves.
      return new OgeToastRef<D>(new Promise<OgeToastClosedEvent>(() => void 0));
    }
    this.ensureHost();
    return this.core.show(toast as string | OgeToastOptions) as OgeToastRef<D>;
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
    if (typeof document === 'undefined') {
      return new OgeToastRef<D>(new Promise<OgeToastClosedEvent>(() => void 0));
    }
    this.ensureHost();
    return this.core.promise(
      promise,
      options as unknown as OgeToastPromiseOptions<T>,
    ) as OgeToastRef<D>;
  }

  /** Closes every toast (or every toast of one position); reason `'clear'`. */
  clear(position?: OgeToastPosition): void {
    this.core.clear(position);
  }

  // ── internal engine (called by the host) ─────────────────────────────────

  /** @internal */
  regions(): OgeToastRegion<OgeToastOptions>[] {
    return this.core.regions();
  }

  /** @internal */
  markReady(entries: readonly ToastEntry[]): void {
    this.core.markReady(entries);
  }

  /** @internal Two-phase dismissal: closing class → removal + resolve. */
  dismiss(entry: ToastEntry, reason: OgeToastCloseReason): void {
    this.core.dismiss(entry, reason);
  }

  /** @internal Ref-counted pause (hover / focus-within / tab hidden). */
  pause(entry: ToastEntry): void {
    this.core.pause(entry);
  }

  /** @internal Resumes with the remaining time once every cause released. */
  resume(entry: ToastEntry): void {
    this.core.resume(entry);
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
    this.destroyRef.onDestroy(() => {
      this.core.destroy();
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
}
