import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { OGE_BUTTONS_CONFIG, type OgeButtonsMessages } from '../config';
import { OGE_BUTTON_GROUP } from '../button-group/button-group-context';
import type {
  OgeAutoRepeatOptions,
  OgeButtonActionDoneEvent,
  OgeButtonActionFailedEvent,
  OgeButtonClickEvent,
  OgeButtonIconPosition,
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonStylingMode,
  OgeClickGuardOptions,
  OgeHoldToConfirmOptions,
} from './button-types';

import { isThenable } from '../internal/thenable';

declare const ngDevMode: boolean | undefined;

type PressSource = 'idle' | 'pointer' | 'keyboard';

/**
 * Action button with severity/styling variants, async single-flight `action`
 * handling, click guarding, a badge, hold-to-confirm and auto-repeat gestures:
 *
 * ```html
 * <oge-button text="Save" severity="accent" [action]="save" (actionDone)="onSaved($event)" />
 * <oge-button text="Delete" severity="danger" [holdToConfirm]="true" (clicked)="remove()" />
 * ```
 *
 * Inside an `<oge-button-group>` the button inherits the group's
 * `stylingMode`, `severity`, `size` and `disabled` unless set locally.
 */
@Component({
  selector: 'oge-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-button',
    '[class.oge-disabled]': 'isDisabled()',
    '[class.oge-button-loading]': 'loading()',
    '[class.oge-button-holding]': 'holding()',
    '[class.oge-button-hold-ready]': 'holdReady()',
    '[class.oge-button-selected]': 'selected()',
    '[class.oge-button-colored]':
      "effectiveSeverity() !== 'normal' || !!color()",
    '[style.--oge-btn-main]': 'color() ?? null',
    '[style.--oge-btn-soft]': 'customSoftColor()',
    '[class.oge-button-outlined]': "effectiveStylingMode() === 'outlined'",
    '[class.oge-button-text-mode]': "effectiveStylingMode() === 'text'",
    '[class.oge-button-severity-accent]': "effectiveSeverity() === 'accent'",
    '[class.oge-button-severity-success]': "effectiveSeverity() === 'success'",
    '[class.oge-button-severity-warning]': "effectiveSeverity() === 'warning'",
    '[class.oge-button-severity-danger]': "effectiveSeverity() === 'danger'",
    '[class.oge-button-sm]': "effectiveSize() === 'sm'",
    '[class.oge-button-lg]': "effectiveSize() === 'lg'",
    '[class.oge-button-icon-after]': "iconPosition() === 'after'",
    '[class.oge-button-gesture]': 'hasGesture()',
    '[style.--oge-hold-ms]': 'holdDuration()',
  },
  styleUrl: './button.scss',
  template: `
    <button
      #btn
      class="oge-button-native"
      [type]="useSubmitBehavior() ? 'submit' : buttonType()"
      [attr.aria-label]="ariaLabel() ?? null"
      [disabled]="isDisabled()"
      [attr.tabindex]="effectiveTabIndex()"
      [attr.title]="hintText() ?? null"
      [attr.accesskey]="accessKey() ?? null"
      [attr.aria-busy]="loading() ? 'true' : null"
      [attr.role]="nativeRole()"
      [attr.aria-checked]="ariaChecked()"
      [attr.aria-pressed]="ariaPressed()"
      [attr.aria-haspopup]="ariaHasPopup() ?? null"
      [attr.aria-expanded]="ariaExpandedAttr()"
      [attr.aria-controls]="ariaControls() ?? null"
      (click)="onClick($event)"
      (pointerdown)="onPointerDown($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel()"
      (contextmenu)="onContextMenu($event)"
      (keydown)="onKeyDown($event)"
      (keyup)="onKeyUp($event)"
    >
      @if (loading()) {
        <svg
          class="oge-button-spinner"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M8 1.5 A 6.5 6.5 0 1 1 1.5 8" />
        </svg>
        <span class="oge-button-sr">{{ msg().loading }}</span>
      }
      <span class="oge-button-icon"
        ><ng-content select="[ogeButtonIcon]"
      /></span>
      @if (text()) {
        <span class="oge-button-text">{{ text() }}</span>
      }
      <ng-content />
      @if (badgeText(); as badgeValue) {
        <span class="oge-button-sr">{{ badgeValue }}</span>
      }
      @if (holdOpts()) {
        <span class="oge-button-hold-bar" aria-hidden="true"></span>
      }
    </button>
    @if (badgeText(); as badgeValue) {
      <span class="oge-button-badge" aria-hidden="true">{{ badgeValue }}</span>
    } @else if (showDot()) {
      <span
        class="oge-button-badge oge-button-badge-dot"
        aria-hidden="true"
      ></span>
    }
  `,
})
export class OgeButton {
  private readonly config = inject(OGE_BUTTONS_CONFIG);
  private readonly group = inject(OGE_BUTTON_GROUP, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly nativeButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('btn');

  /** Label text; alternative (or addition) to projecting content. */
  readonly text = input('');
  /** Tooltip — rendered as the native `title` attribute. */
  readonly hint = input<string | undefined>(undefined);
  readonly disabled = input(false);
  /** Fill style; falls back to the enclosing group, then `'contained'`. */
  readonly stylingMode = input<OgeButtonStylingMode | undefined>(undefined);
  /** Semantic color; falls back to the enclosing group, then `'normal'`. */
  readonly severity = input<OgeButtonSeverity | undefined>(undefined);
  /** Size preset; falls back to the enclosing group, then `'md'`. */
  readonly size = input<OgeButtonSize | undefined>(undefined);
  /**
   * Custom main color (any CSS color) — overrides the severity palette; the
   * soft tint is derived automatically. For theme-wide changes override the
   * `--oge-*` tokens instead.
   */
  readonly color = input<string | undefined>(undefined);
  /** Where `[ogeButtonIcon]` content renders relative to the label. */
  readonly iconPosition = input<OgeButtonIconPosition>('before');
  readonly tabIndex = input(0);
  /** Native `accesskey` of the inner button. */
  readonly accessKey = input<string | undefined>(undefined);
  /** Renders `type="submit"` so the button submits the enclosing form. */
  readonly useSubmitBehavior = input(false);
  /** Native button type; `useSubmitBehavior` is sugar for `'submit'`. */
  readonly buttonType = input<'button' | 'submit' | 'reset'>('button');
  /** Accessible name of the native button — required for icon-only buttons. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Selection key inside an `<oge-button-group>`; unused standalone. */
  readonly value = input<string | undefined>(undefined);
  /** `aria-haspopup` of the native button — for popup triggers (drop-down). */
  readonly ariaHasPopup = input<string | undefined>(undefined);
  /** `aria-expanded` of the native button; `undefined` omits the attribute. */
  readonly ariaExpanded = input<boolean | undefined>(undefined);
  /** `aria-controls` of the native button — id of the controlled popup. */
  readonly ariaControls = input<string | undefined>(undefined);

  /** Busy state — two-way; managed automatically while `action` is pending. */
  readonly loading = model(false);
  /**
   * Async click handler: a click invokes it, turns `loading` on while the
   * returned promise is pending and ignores further clicks until it settles
   * (single-flight). Synchronous return values emit `actionDone` immediately.
   */
  readonly action = input<(() => unknown) | undefined>(undefined);
  /**
   * Rate-limits the `click` output against double/spam clicks.
   * `true` = throttle with `config.clickGuardMs`.
   */
  readonly clickGuard = input<boolean | OgeClickGuardOptions>(false);
  /**
   * Notification badge: a string/number renders a pill (numbers cap at `99+`
   * and join the accessible name), `true` renders a plain dot.
   */
  readonly badge = input<string | number | boolean | undefined>(undefined);
  /**
   * Fires `click` only after an uninterrupted press of the configured
   * duration — for destructive actions. Mutually exclusive with `autoRepeat`
   * (`holdToConfirm` wins). `true` = `config.holdToConfirmMs`.
   */
  readonly holdToConfirm = input<boolean | OgeHoldToConfirmOptions>(false);
  /**
   * Repeats `click` while the button is held (stepper/counter buttons).
   * Ignored when `holdToConfirm` is also set. `true` = config delay/interval.
   */
  readonly autoRepeat = input<boolean | OgeAutoRepeatOptions>(false);
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<Partial<OgeButtonsMessages> | undefined>(undefined);

  /**
   * Fires after the gesture/guard pipeline accepts a click. Bind this instead
   * of the native `(click)` — the native event bypasses `clickGuard`,
   * `holdToConfirm`, `autoRepeat` and the single-flight `action` protection.
   */
  readonly clicked = output<OgeButtonClickEvent>();
  /** Fires when the `action` callback settles successfully. */
  readonly actionDone = output<OgeButtonActionDoneEvent>();
  /** Fires when the `action` callback throws or rejects. */
  readonly actionFailed = output<OgeButtonActionFailedEvent>();

  protected readonly msg = computed<OgeButtonsMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly effectiveStylingMode = computed<OgeButtonStylingMode>(
    () => this.stylingMode() ?? this.group?.stylingMode() ?? 'contained',
  );
  protected readonly effectiveSeverity = computed<OgeButtonSeverity>(
    () => this.severity() ?? this.group?.severity() ?? 'normal',
  );
  protected readonly effectiveSize = computed<OgeButtonSize>(
    () => this.size() ?? this.group?.size() ?? 'md',
  );
  /** Disabled, busy, or inside a disabled group. */
  readonly isDisabled = computed(
    () =>
      this.disabled() || this.loading() || (this.group?.disabled() ?? false),
  );
  protected readonly effectiveTabIndex = computed(() =>
    this.group ? this.group.tabIndexFor(this) : this.tabIndex(),
  );
  protected readonly selected = computed(() =>
    this.group ? this.group.isSelected(this.value()) : false,
  );
  protected readonly nativeRole = computed(() =>
    this.group?.selectionMode() === 'single' ? 'radio' : null,
  );
  protected readonly ariaChecked = computed(() =>
    this.group?.selectionMode() === 'single' ? String(this.selected()) : null,
  );
  protected readonly ariaPressed = computed(() =>
    this.group?.selectionMode() === 'multiple' ? String(this.selected()) : null,
  );
  protected readonly ariaExpandedAttr = computed(() => {
    const expanded = this.ariaExpanded();
    return expanded === undefined ? null : String(expanded);
  });
  protected readonly customSoftColor = computed(() => {
    const color = this.color();
    return color ? `color-mix(in srgb, ${color} 14%, transparent)` : null;
  });

  protected readonly badgeText = computed<string | null>(() => {
    const badge = this.badge();
    if (badge === undefined || typeof badge === 'boolean') return null;
    if (typeof badge === 'number') return badge > 99 ? '99+' : String(badge);
    return badge;
  });
  protected readonly showDot = computed(() => this.badge() === true);

  private readonly guardOpts = computed<{
    mode: 'debounce' | 'throttle';
    ms: number;
  } | null>(() => {
    const guard = this.clickGuard();
    if (!guard) return null;
    if (guard === true) {
      return { mode: 'throttle', ms: this.config.clickGuardMs };
    }
    return { mode: guard.mode, ms: guard.ms ?? this.config.clickGuardMs };
  });
  protected readonly holdOpts = computed<{ ms: number } | null>(() => {
    const hold = this.holdToConfirm();
    if (!hold) return null;
    return {
      ms:
        hold === true
          ? this.config.holdToConfirmMs
          : (hold.ms ?? this.config.holdToConfirmMs),
    };
  });
  private readonly repeatOpts = computed<{
    delayMs: number;
    intervalMs: number;
  } | null>(() => {
    if (this.holdOpts()) return null; // holdToConfirm wins
    const repeat = this.autoRepeat();
    if (!repeat) return null;
    if (repeat === true) {
      return {
        delayMs: this.config.autoRepeatDelayMs,
        intervalMs: this.config.autoRepeatIntervalMs,
      };
    }
    return {
      delayMs: repeat.delayMs ?? this.config.autoRepeatDelayMs,
      intervalMs: repeat.intervalMs ?? this.config.autoRepeatIntervalMs,
    };
  });
  protected readonly hasGesture = computed(
    () => this.holdOpts() !== null || this.repeatOpts() !== null,
  );
  protected readonly holdDuration = computed(() => {
    const hold = this.holdOpts();
    return hold ? `${hold.ms}ms` : null;
  });
  protected readonly hintText = computed<string | undefined>(() => {
    const hint = this.hint();
    if (!this.holdOpts()) return hint;
    const holdMsg = this.msg().holdToConfirm;
    return hint ? `${hint} (${holdMsg})` : holdMsg;
  });

  /** Hold gesture in progress — drives the fill animation. */
  protected readonly holding = signal(false);
  /** Hold duration elapsed — releasing now confirms. */
  protected readonly holdReady = signal(false);

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

  constructor() {
    // A disabled (or newly loading) button must not keep a live gesture.
    effect(() => {
      if (this.isDisabled()) untracked(() => this.cancelPress());
    });
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      effect(() => {
        if (this.holdToConfirm() && this.autoRepeat()) {
          console.error(
            '[oge-button] `holdToConfirm` and `autoRepeat` are mutually exclusive; `holdToConfirm` wins.',
          );
        }
      });
    }
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.clearHoldTimer();
      this.clearRepeatTimers();
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    });
  }

  /** Moves keyboard focus to the inner native button. */
  focus(): void {
    this.nativeButton().nativeElement.focus({ preventScroll: true });
  }

  /** Whether the given DOM node lives inside this button (used by the group). */
  hostContains(node: Node): boolean {
    return this.host.nativeElement.contains(node);
  }

  // --- native event pipeline -------------------------------------------------

  protected onClick(event: MouseEvent): void {
    // Gesture modes produce their own dispatches; physical clicks are swallowed
    // and must not bubble — a quick tap on a hold-to-confirm button would
    // otherwise still reach native `(click)` listeners up the tree.
    if (this.hasGesture()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.dispatchClick(event);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.hasGesture() || this.press !== 'idle') {
      return;
    }
    this.press = 'pointer';
    this.pressPointerId = event.pointerId;
    this.lastPressEvent = event;
    // Capture on the button itself — a pressed descendant span could be
    // removed mid-gesture, which would silently release the capture.
    this.nativeButton().nativeElement.setPointerCapture?.(event.pointerId);
    if (this.holdOpts()) this.startHold();
    else this.startRepeat(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.press !== 'pointer' || event.pointerId !== this.pressPointerId) {
      return;
    }
    this.finishPress(event);
  }

  protected onPointerCancel(): void {
    if (this.press !== 'pointer') return;
    this.cancelPress();
  }

  protected onContextMenu(event: Event): void {
    // Long-press context menus would break hold/repeat gestures on touch.
    if (this.hasGesture()) event.preventDefault();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelPress();
      return;
    }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (!this.hasGesture()) return; // plain mode: native click path
    event.preventDefault();
    if (event.repeat || this.press !== 'idle') return;
    this.press = 'keyboard';
    this.pressKey = event.key;
    this.lastPressEvent = event;
    if (this.holdOpts()) this.startHold();
    else this.startRepeat(event);
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (this.press !== 'keyboard') return;
    // Only the key that started the gesture may finish it.
    if (event.key !== this.pressKey) return;
    this.finishPress(event);
  }

  // --- gestures --------------------------------------------------------------

  private startHold(): void {
    const hold = this.holdOpts();
    if (!hold) return;
    this.holdReady.set(false);
    this.holding.set(true);
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      this.holdReady.set(true);
    }, hold.ms);
  }

  private startRepeat(event: MouseEvent | KeyboardEvent): void {
    const repeat = this.repeatOpts();
    if (!repeat) return;
    this.dispatchClick(event);
    this.repeatDelayTimer = setTimeout(() => {
      this.repeatDelayTimer = null;
      this.repeatIntervalTimer = setInterval(() => {
        if (this.destroyed || this.isDisabled()) {
          this.cancelPress();
          return;
        }
        if (this.lastPressEvent) this.dispatchClick(this.lastPressEvent);
      }, repeat.intervalMs);
    }, repeat.delayMs);
  }

  private finishPress(event: MouseEvent | KeyboardEvent): void {
    if (this.holdOpts()) {
      const confirmed = this.holdReady();
      this.resetHold();
      this.resetPress();
      if (confirmed) this.dispatchClick(event);
      return;
    }
    this.clearRepeatTimers();
    this.resetPress();
  }

  private cancelPress(): void {
    if (this.press === 'idle') return;
    this.resetHold();
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
    this.holdReady.set(false);
    this.holding.set(false);
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

  private dispatchClick(event: MouseEvent | KeyboardEvent): void {
    const guard = this.guardOpts();
    if (guard) {
      if (guard.mode === 'throttle') {
        const now = performance.now();
        if (now - this.lastFiredAt < guard.ms) return;
        this.lastFiredAt = now;
      } else {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.debounceTimer = null;
          this.fireClick(event);
        }, guard.ms);
        return;
      }
    }
    this.fireClick(event);
  }

  private fireClick(event: MouseEvent | KeyboardEvent): void {
    // Re-checked because debounced fires arrive later.
    if (this.destroyed || this.isDisabled()) return;
    if (this.pendingRunId !== null) return; // single-flight
    this.clicked.emit({ event });
    this.group?.notifyClick(this.value(), event, this);
    const action = this.action();
    if (!action) return;
    let result: unknown;
    try {
      result = action();
    } catch (error) {
      this.actionFailed.emit({ error });
      return;
    }
    if (!isThenable(result)) {
      this.actionDone.emit({ result });
      return;
    }
    const runId = ++this.actionSeq;
    this.pendingRunId = runId;
    this.loading.set(true);
    result.then(
      (value) =>
        this.settleAction(runId, () => this.actionDone.emit({ result: value })),
      (error: unknown) =>
        this.settleAction(runId, () => this.actionFailed.emit({ error })),
    );
  }

  private settleAction(runId: number, emit: () => void): void {
    if (this.destroyed || runId !== this.pendingRunId) return;
    this.pendingRunId = null;
    this.loading.set(false);
    emit();
  }
}
