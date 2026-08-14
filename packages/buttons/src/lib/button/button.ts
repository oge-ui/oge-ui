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
import {
  OgeButtonPress,
  resolveAutoRepeat,
  resolveClickGuard,
  resolveHoldToConfirm,
} from '@oge-ui/behavior';
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

declare const ngDevMode: boolean | undefined;

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
   * Repeats `click` while the button is held (spinner/counter buttons).
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

  // The shorthand-or-options resolution is shared with the React button, so a
  // change to what `holdToConfirm: true` means lands in both at once.
  private readonly guardOpts = computed(() =>
    resolveClickGuard(this.clickGuard(), this.config.clickGuardMs),
  );
  protected readonly holdOpts = computed(() =>
    resolveHoldToConfirm(this.holdToConfirm(), this.config.holdToConfirmMs),
  );
  private readonly repeatOpts = computed(() =>
    resolveAutoRepeat(this.autoRepeat(), this.holdOpts() !== null, {
      delayMs: this.config.autoRepeatDelayMs,
      intervalMs: this.config.autoRepeatIntervalMs,
    }),
  );
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

  /**
   * The whole press pipeline — gestures, click guard, single-flight `action` —
   * lives in `@oge-ui/behavior` so the React button runs the identical
   * machine rather than a re-implementation of it (ADR 0001). This component
   * only maps its getters and callbacks onto signals.
   */
  private readonly pressMachine = new OgeButtonPress({
    hold: () => this.holdOpts(),
    repeat: () => this.repeatOpts(),
    guard: () => this.guardOpts(),
    isDisabled: () => this.isDisabled(),
    action: () => this.action(),
    captureTarget: () => this.nativeButton().nativeElement,
    onClick: (event) => {
      this.clicked.emit({ event });
      this.group?.notifyClick(this.value(), event, this);
    },
    onHoldStateChange: ({ holding, ready }) => {
      this.holding.set(holding);
      this.holdReady.set(ready);
    },
    onLoadingChange: (loading) => this.loading.set(loading),
    onActionDone: (result) => this.actionDone.emit({ result }),
    onActionFailed: (error) => this.actionFailed.emit({ error }),
  });

  constructor() {
    // A disabled (or newly loading) button must not keep a live gesture.
    effect(() => {
      if (this.isDisabled()) untracked(() => this.pressMachine.cancel());
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
    this.destroyRef.onDestroy(() => this.pressMachine.destroy());
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
    if (this.pressMachine.click(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pressMachine.pointerDown(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pressMachine.pointerUp(event);
  }

  protected onPointerCancel(): void {
    this.pressMachine.pointerCancel();
  }

  protected onContextMenu(event: Event): void {
    if (this.pressMachine.contextMenu()) event.preventDefault();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.pressMachine.keyDown(event)) event.preventDefault();
  }

  protected onKeyUp(event: KeyboardEvent): void {
    this.pressMachine.keyUp(event);
  }
}
