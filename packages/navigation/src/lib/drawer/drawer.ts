import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { resolveDrawerMode } from '@oge-ui/core';
import {
  beginOgeDrawerSwipe,
  buildOgeDrawerItems,
  ogeDrawerItemNavIndex,
  ogeDrawerPhysicalEdge,
  ogeDrawerRailTooltipPlacement,
  ogeResolveDirection,
  runOgeDrawerItemClick,
  type OgeDirection,
  type OgeDrawerItem,
  type OgeDrawerItemClickEvent,
  type OgeDrawerItemView,
  type OgeDrawerSelectionChangedEvent,
  type OgePointerGestureHandle,
} from '@oge-ui/behavior';
import {
  OgeTooltip,
  getTabbableElements,
  isTopOverlay,
  lockBodyScroll,
  pushOverlay,
  removeOverlay,
  trapTabKey,
  unlockBodyScroll,
} from '@oge-ui/overlay';
import { OGE_DRAWER_CONFIG, type OgeDrawerMessages } from './config';
import { OgeDrawerItemTemplate } from './drawer-item-template';
import type {
  OgeDrawerAutoFocus,
  OgeDrawerClosedEvent,
  OgeDrawerClosingEvent,
  OgeDrawerCloseReason,
  OgeDrawerLandmark,
  OgeDrawerMode,
  OgeDrawerModeChangedEvent,
  OgeDrawerOpeningEvent,
  OgeDrawerItemTemplateContext,
  OgeDrawerPosition,
} from './drawer-types';

let nextDrawerId = 0;

/** `number` → px, everything else verbatim. */
function toCssSize(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * A drawer: a panel attached to one edge of its content, in one of three
 * layout modes.
 *
 * Unlike the reference drawers this is **one component, not three** — no
 * container/content wrapper trio. The panel goes in the `[ogeDrawerPanel]`
 * slot, everything else is the content:
 *
 * ```html
 * <oge-drawer [(opened)]="menuOpen" mode="side" position="start" [size]="260">
 *   <oge-tree-view ogeDrawerPanel [data]="nav" />
 *   <router-outlet />
 * </oge-drawer>
 * ```
 *
 * **Modality is derived from `mode`, never configured.** `'overlay'` and
 * `'push'` cover or displace the content, so they are modal: `role="dialog"`,
 * `aria-modal`, a focus trap, Escape, and `inert` on the background. `'side'`
 * is part of the layout, so it is a persistent landmark (`role` from
 * `landmark`) with none of those. The WAI-ARIA APG has no drawer pattern and
 * conditions modality on background interaction actually being blocked; an
 * independent `modal` flag is precisely what produces a panel claiming
 * `role="complementary"` and `aria-modal="true"` at once.
 *
 * The panel content stays mounted and becomes `inert` while closed, so a
 * trigger's `aria-controls` always resolves to a real element.
 *
 * **The panel element already carries the landmark role**, so project plain
 * content into it — a `<nav>` or `<aside>` inside it produces two nested
 * landmarks, and several unnamed ones on a page fail `landmark-unique`. For the
 * same reason, give each drawer on a page its own `ariaLabel`: the APG requires
 * landmarks of the same role to be distinguishable by name.
 */
@Component({
  selector: 'oge-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './drawer.scss',
  imports: [NgTemplateOutlet, OgeTooltip],
  host: {
    class: 'oge-drawer',
    '[class.oge-drawer-opened]': 'opened()',
    '[class.oge-drawer-rail]': 'rail()',
    '[class.oge-drawer-swipe]': 'swipeEnabled()',
    '(pointerdown)': 'onHostPointerDown($event)',
    '[class.oge-drawer-modal]': 'isModal()',
    '[class.oge-drawer-compact]': 'resolved().compact',
    '[class.oge-drawer-animated]': 'animationEnabled()',
    '[class.oge-disabled]': 'disabled()',
    // the RESOLVED mode: `compactBelow` must move the layout, not just the
    // modality, or the drawer claims to be a dialog while still laid out inline
    '[attr.data-mode]': 'resolved().mode',
    '[attr.data-position]': 'position()',
    '[style.--oge-drawer-size]': 'cssSize()',
    '[style.--oge-drawer-min-size]': 'cssMinSize()',
    '[style.--oge-drawer-duration]': 'cssDuration()',
  },
  template: `
    @if (isModal() && shading() && opened()) {
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- the backdrop is decorative; the keyboard path to the same action is Escape, handled on the document while this drawer is the topmost overlay -->
      <div
        class="oge-drawer-backdrop"
        (pointerdown)="onBackdropPointerDown()"
        (click)="onBackdropClick()"
      ></div>
    }

    <div
      class="oge-drawer-panel"
      #panel
      [id]="drawerId"
      [attr.role]="panelRole()"
      [attr.aria-modal]="isModal() ? 'true' : null"
      [attr.aria-label]="resolvedAriaLabel()"
      [attr.aria-labelledby]="ariaLabelledBy() ?? null"
      [attr.aria-hidden]="hidden() ? 'true' : null"
      [attr.inert]="hidden() ? '' : null"
      [attr.tabindex]="isModal() ? -1 : null"
      (keydown)="onPanelKeydown($event)"
    >
      @if (showCloseButton()) {
        <button
          type="button"
          class="oge-drawer-close"
          [attr.aria-label]="msg().close"
          [title]="msg().close"
          [disabled]="disabled() || closePending()"
          (click)="close()"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      }
      @if (itemViews().length > 0) {
        <!--
          A navigation list of real links / buttons, each in the Tab order
          (the APG disclosure-navigation shape, not a composite widget); the
          active entry is aria-current="page". Arrow / Home / End are a
          convenience on top. Separators are hidden from AT.
        -->
        <ul class="oge-drawer-items">
          @for (view of itemViews(); track view.key) {
            @if (view.separator) {
              <li class="oge-drawer-separator" aria-hidden="true"></li>
            } @else {
              <li class="oge-drawer-item-wrap">
                @if (view.item.url !== undefined && !view.disabled) {
                  <a
                    class="oge-drawer-item"
                    [class.oge-drawer-item-active]="view.active"
                    [attr.href]="view.item.url"
                    [attr.target]="view.item.target ?? null"
                    [attr.aria-current]="view.active ? 'page' : null"
                    [attr.data-drawer-item]="view.index"
                    [ogeTooltip]="view.text"
                    [tooltipDisabled]="!rail()"
                    [tooltipPlacement]="tooltipPlacement()"
                    (click)="onItemClick(view, $event)"
                    (keydown)="onItemsKeydown($event)"
                  >
                    <ng-container
                      *ngTemplateOutlet="itemBody; context: { $implicit: view }"
                    />
                  </a>
                } @else {
                  <button
                    type="button"
                    class="oge-drawer-item"
                    [class.oge-drawer-item-active]="view.active"
                    [class.oge-drawer-item-disabled]="view.disabled"
                    [disabled]="view.disabled"
                    [attr.aria-current]="view.active ? 'page' : null"
                    [attr.data-drawer-item]="view.index"
                    [ogeTooltip]="view.text"
                    [tooltipDisabled]="!rail()"
                    [tooltipPlacement]="tooltipPlacement()"
                    (click)="onItemClick(view, $event)"
                    (keydown)="onItemsKeydown($event)"
                  >
                    <ng-container
                      *ngTemplateOutlet="itemBody; context: { $implicit: view }"
                    />
                  </button>
                }
              </li>
            }
          }
        </ul>
      }
      <ng-content select="[ogeDrawerPanel]" />
    </div>

    <ng-template #itemBody let-view>
      @if (itemTemplate(); as tpl) {
        <ng-container
          *ngTemplateOutlet="tpl.templateRef; context: itemContext(view)"
        />
      } @else {
        <span class="oge-drawer-item-icon" aria-hidden="true">
          @if (view.item.icon; as icon) {
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                [attr.d]="icon"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        </span>
        <span class="oge-drawer-item-text">{{ view.text }}</span>
        @if (view.item.badge !== undefined && view.item.badge !== '') {
          <span class="oge-drawer-item-badge">{{ view.item.badge }}</span>
        }
      }
    </ng-template>

    @if (swipeEnabled() && !opened()) {
      <!-- the touch strip an opening edge swipe starts in (pointer: coarse only) -->
      <div class="oge-drawer-swipe-zone" aria-hidden="true"></div>
    }

    <div class="oge-drawer-content">
      <ng-content />
    </div>
  `,
})
export class OgeDrawer {
  private readonly config = inject(OGE_DRAWER_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** id of the panel element — the target of a trigger's `aria-controls`. */
  readonly drawerId = `oge-drawer-${nextDrawerId++}`;

  private readonly panelEl =
    viewChild.required<ElementRef<HTMLElement>>('panel');

  /** Whether the drawer is open. Two-way. */
  readonly opened = model(false);

  /** Layout mode; also what decides whether the drawer is modal. */
  readonly mode = input<OgeDrawerMode>(this.config.mode ?? 'overlay');
  /** Edge the panel is attached to. Logical: `start`/`end` mirror in RTL. */
  readonly position = input<OgeDrawerPosition>(this.config.position ?? 'start');
  /** Size of the open panel along its cross axis. `number` means px. */
  readonly size = input<number | string>(this.config.size ?? 260);
  /**
   * Size of the *closed* panel — the compact rail that keeps icons visible.
   * Only meaningful for `mode: 'side'`: a rail belongs to the layout, and a
   * modal drawer that is still partly on screen is not closed.
   */
  readonly minSize = input<number | string | undefined>(undefined);
  /**
   * Below this **container** inline size the drawer downgrades to `'overlay'`
   * and closes. Measured against the drawer's own box, never the window, so a
   * drawer nested in a dialog or a split pane adapts to the room it has.
   */
  readonly compactBelow = input<number | undefined>(undefined);
  /** Landmark role while persistent. Ignored while modal (always `dialog`). */
  readonly landmark = input<OgeDrawerLandmark>('navigation');
  /**
   * Blocks every open and close gesture — including `open()`/`close()`. A
   * drawer already open stays open and stays usable; this disables the
   * transitions, not the content.
   */
  readonly disabled = input(false);
  /** Renders a close button in the panel's top corner. */
  readonly showCloseButton = input(false);
  /** Renders the backdrop of a modal drawer. */
  readonly shading = input(true);
  /** Escape closes a modal drawer. Persistent drawers never take Escape. */
  readonly closeOnEscape = input(true);
  /** A click on the backdrop closes a modal drawer. */
  readonly closeOnBackdropClick = input(true);
  /**
   * Locks **document** scroll while a modal drawer is open. Off by default:
   * a drawer is usually an in-page region, and one opening inside a card must
   * not freeze the page around it. Turn it on for a page-level drawer.
   */
  readonly scrollLock = input(false);
  /** Marks the drawer's own content region `inert` while a modal drawer is open. */
  readonly inertBackground = input(true);
  /** Where focus lands when a modal drawer opens. */
  readonly autoFocus = input<OgeDrawerAutoFocus>('first-tabbable');
  /** Returns focus to the opener when the drawer closes. */
  readonly restoreFocus = input(true);
  /** Enables the open/close transition. */
  readonly animationEnabled = input(true);
  /** Duration of that transition, in milliseconds. */
  readonly animationDuration = input(240);
  /** Accessible name of the panel. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** id of an element naming the panel; wins over `ariaLabel`. */
  readonly ariaLabelledBy = input<string | undefined>(undefined);
  /**
   * Vetoes a close. Return `false`, throw, or reject to keep the drawer open;
   * a promise reports pending through {@link closePending}.
   */
  readonly closeGuard = input<(() => boolean | Promise<boolean>) | undefined>(
    undefined,
  );
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeDrawerMessages> | undefined>(undefined);
  /**
   * Built-in navigation entries rendered at the top of the panel, before the
   * `[ogeDrawerPanel]` content: links (`url`) or buttons, icons, badges and
   * separators. In the mini rail (`minSize`, closed) only the icons show and
   * the label becomes the accessible name and a tooltip.
   */
  readonly items = input<readonly OgeDrawerItem[] | undefined>(undefined);
  /** Key of the active entry (`aria-current="page"`). Two-way. */
  readonly selectedKey = model<string | undefined>(undefined);
  /**
   * Touch gestures: an edge swipe opens the drawer, a swipe toward the edge
   * closes it (reason `'swipe'`, through `closing` and `closeGuard`). Touch
   * pointers only; off by default so existing apps keep their behaviour.
   */
  readonly swipeEnabled = input(false);

  /** Cancelable — set `cancel` to keep the drawer closed. */
  readonly opening = output<OgeDrawerOpeningEvent>();
  /**
   * The drawer finished opening. Fires one frame after mount rather than on
   * `transitionend`: the transition is CSS-only and `prefers-reduced-motion`
   * zeroes it, so a transition-based signal would never arrive for those users.
   */
  readonly afterOpened = output<void>();
  /** Cancelable — set `cancel` to keep the drawer open. */
  readonly closing = output<OgeDrawerClosingEvent>();
  /** The drawer finished closing. */
  readonly closed = output<OgeDrawerClosedEvent>();
  /** The resolved layout mode changed. */
  readonly modeChanged = output<OgeDrawerModeChangedEvent>();
  /** An entry of `items` was activated (click, Enter or Space). */
  readonly itemClick = output<OgeDrawerItemClickEvent>();
  /** `selectedKey` changed through the item list. */
  readonly selectionChanged = output<OgeDrawerSelectionChangedEvent>();

  protected readonly itemTemplate = contentChild(OgeDrawerItemTemplate, {
    descendants: false,
  });

  /** The rendered entries, with the active one resolved. */
  protected readonly itemViews = computed<readonly OgeDrawerItemView[]>(() =>
    buildOgeDrawerItems(this.items(), this.selectedKey()),
  );

  private readonly direction = signal<OgeDirection>('ltr');
  private swipe: OgePointerGestureHandle | null = null;

  private readonly _closePending = signal(false);
  /** `true` while an async `closeGuard` is in flight. */
  readonly closePending = this._closePending.asReadonly();

  private readonly containerSize = signal(0);

  protected readonly msg = computed<OgeDrawerMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** Requested mode, downgraded by `compactBelow` when room runs out. */
  protected readonly resolved = computed(() =>
    resolveDrawerMode({
      requestedMode: this.mode(),
      containerSize: this.containerSize(),
      compactBelow: this.compactBelow(),
    }),
  );

  /**
   * Modality follows the layout mode: a drawer that covers or displaces the
   * content is a dialog, one that shares the row with it is a landmark.
   */
  protected readonly isModal = computed(() => this.resolved().mode !== 'side');

  protected readonly panelRole = computed(() =>
    this.isModal() ? 'dialog' : this.landmark(),
  );

  /**
   * A closed panel is hidden from AT and Tab — except a `side` drawer with a
   * rail, which is still visible and usable.
   */
  protected readonly hidden = computed(() => {
    if (this.opened()) return false;
    return !(this.resolved().mode === 'side' && this.minSize() !== undefined);
  });

  protected readonly resolvedAriaLabel = computed(() => {
    if (this.ariaLabelledBy()) return null;
    return this.ariaLabel() ?? this.msg().drawer;
  });

  /** Closed `side` drawer with a `minSize`: the icon-only mini rail. */
  protected readonly rail = computed(
    () =>
      !this.opened() &&
      this.resolved().mode === 'side' &&
      this.minSize() !== undefined,
  );

  protected readonly tooltipPlacement = computed(() =>
    ogeDrawerRailTooltipPlacement(
      ogeDrawerPhysicalEdge(this.position(), this.direction()),
    ),
  );

  protected readonly cssSize = computed(() => toCssSize(this.size()));
  protected readonly cssMinSize = computed(
    () => toCssSize(this.minSize()) ?? '0px',
  );
  protected readonly cssDuration = computed(() =>
    this.animationEnabled() ? `${this.animationDuration()}ms` : '0ms',
  );

  /** Mirrors the DOM-side open state (listeners, stack, scroll lock). */
  private shown = false;
  private holdingScrollLock = false;
  private previouslyFocused: HTMLElement | null = null;
  private backdropPress = false;
  private inertedElements: Element[] = [];
  private previousMode: OgeDrawerMode | null = null;

  constructor() {
    // `opened` model ↔ DOM-side state, loop-guarded by comparing states first.
    effect(() => {
      const shouldOpen = this.opened();
      untracked(() => {
        if (shouldOpen && !this.shown) this.doOpen();
        else if (!shouldOpen && this.shown) this.finalizeClose('api');
      });
    });
    // A drawer that stops being modal must release everything a modal holds —
    // otherwise a compact→side transition leaves the body scroll locked and
    // the page inert with no dialog on screen.
    effect(() => {
      const modal = this.isModal();
      untracked(() => {
        if (!modal && this.shown) this.releaseModalHold();
        else if (modal && this.shown) this.acquireModalHold();
      });
    });
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.measure());
        observer.observe(this.host.nativeElement);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
      this.measure();
      this.direction.set(ogeResolveDirection(this.host.nativeElement));
    });
    afterRenderEffect(() => {
      const resolved = this.resolved();
      untracked(() => {
        if (resolved.mode === this.previousMode) return;
        const previous = this.previousMode;
        this.previousMode = resolved.mode;
        if (previous === null) return;
        this.modeChanged.emit({
          mode: resolved.mode,
          requestedMode: this.mode(),
          compact: resolved.compact,
        });
        // Going compact turns a laid-out drawer into an overlay covering the
        // content; leaving it open would hide the page behind a backdrop the
        // user never asked for.
        if (resolved.compact && this.opened()) this.requestClose('compact');
      });
    });
    this.destroyRef.onDestroy(() => {
      this.swipe?.cancel();
      if (this.shown) this.teardown();
    });
  }

  /** Opens the drawer. */
  open(): void {
    this.opened.set(true);
  }

  /** Closes through the full pipeline (`closing` → `closeGuard`); reason `'api'`. */
  close(): void {
    this.requestClose('api');
  }

  /**
   * Opens or closes. Pass `force` to drive it to a known state without first
   * reading `opened()` — the shape Kendo's `toggle(expanded?)` has, and what a
   * router or media-query subscription actually wants.
   */
  toggle(force?: boolean): void {
    const next = force ?? !this.opened();
    if (next) this.open();
    else this.close();
  }

  /** Re-applies the initial-focus resolution. No-op unless open and modal. */
  focus(): void {
    if (this.shown && this.isModal()) this.applyInitialFocus();
  }

  private doOpen(): void {
    if (typeof window === 'undefined') return; // SSR: nothing to show
    if (this.disabled()) {
      if (this.opened()) this.opened.set(false);
      return;
    }
    const openingEvent: OgeDrawerOpeningEvent = { cancel: false };
    this.opening.emit(openingEvent);
    if (openingEvent.cancel) {
      if (this.opened()) this.opened.set(false);
      return;
    }
    this.shown = true;
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.acquireModalHold();
    afterNextRender(
      () => {
        if (this.shown && this.isModal()) this.applyInitialFocus();
        this.afterOpened.emit();
      },
      { injector: this.injector },
    );
  }

  /** Everything a modal drawer holds on the document while it is open. */
  private acquireModalHold(): void {
    if (!this.isModal()) return;
    pushOverlay(this);
    document.addEventListener('keydown', this.onDocumentKeydown);
    if (this.scrollLock() && !this.holdingScrollLock) {
      lockBodyScroll();
      this.holdingScrollLock = true;
    }
    if (this.inertBackground() && this.inertedElements.length === 0) {
      this.applyInertBackground();
    }
  }

  private releaseModalHold(): void {
    removeOverlay(this);
    document.removeEventListener('keydown', this.onDocumentKeydown);
    for (const el of this.inertedElements) el.removeAttribute('inert');
    this.inertedElements = [];
    if (this.holdingScrollLock) {
      unlockBodyScroll();
      this.holdingScrollLock = false;
    }
  }

  /** Runs the close pipeline for user gestures and `close()`. */
  protected requestClose(reason: OgeDrawerCloseReason): void {
    if (!this.shown || this._closePending()) return;
    // `compact` is the component reacting to its own container, not a user
    // gesture — a disabled drawer must still stop covering content it no
    // longer has room for.
    if (this.disabled() && reason !== 'compact') return;
    const closingEvent: OgeDrawerClosingEvent = { reason, cancel: false };
    this.closing.emit(closingEvent);
    if (closingEvent.cancel) return;
    const guard = this.closeGuard();
    if (!guard) {
      this.finalizeClose(reason);
      return;
    }
    let verdict: boolean | Promise<boolean>;
    try {
      verdict = guard();
    } catch {
      this.warnGuardFailure();
      return;
    }
    if (typeof verdict === 'boolean') {
      if (verdict) this.finalizeClose(reason);
      return;
    }
    this._closePending.set(true);
    verdict.then(
      (allowed) => {
        this._closePending.set(false);
        if (allowed && this.shown) this.finalizeClose(reason);
      },
      () => {
        this._closePending.set(false);
        this.warnGuardFailure();
      },
    );
  }

  private finalizeClose(reason: OgeDrawerCloseReason): void {
    if (!this.shown) return;
    // The panel is about to become `inert`; focus inside it would otherwise
    // drop to <body>. Move it out *before* the attribute lands.
    this.blurInside();
    this.teardown();
    if (this.restoreFocus() && this.previouslyFocused) {
      // Only restore when focus would otherwise be lost — never steal the
      // user's new focus target.
      const active = document.activeElement;
      if (!active || active === document.body) this.previouslyFocused.focus();
    }
    this.previouslyFocused = null;
    if (this.opened()) this.opened.set(false);
    this.closed.emit({ reason });
  }

  /** Releases stack/lock/listeners; shared by close and destroy. */
  private teardown(): void {
    this.shown = false;
    this.backdropPress = false;
    this.releaseModalHold();
  }

  /**
   * Hands focus to the drawer host before the panel goes `inert`, mirroring
   * the splitter's collapsing pane. Restoring focus to the opener happens
   * afterwards and only when focus would otherwise be orphaned.
   */
  private blurInside(): void {
    const panel = this.panelEl().nativeElement;
    const active = document.activeElement;
    if (active instanceof HTMLElement && panel.contains(active)) active.blur();
  }

  /**
   * Marks the drawer's **own content region** `inert`, so neither Tab nor
   * assistive tech reaches what the panel is covering.
   *
   * Deliberately scoped to the content, not to the page. A modal dialog is a
   * page-level surface, but a drawer is a layout container that wraps the very
   * content it covers — inerting the document because a drawer nested in a
   * card, a split pane or a preview opened would disable the rest of the page
   * for a panel that never covered it.
   */
  private applyInertBackground(): void {
    const content = this.host.nativeElement.querySelector(
      ':scope > .oge-drawer-content',
    );
    if (!content || content.hasAttribute('inert')) return;
    content.setAttribute('inert', '');
    this.inertedElements.push(content);
  }

  private applyInitialFocus(): void {
    const mode = this.autoFocus();
    if (mode === 'none') return;
    const panel = this.panelEl().nativeElement;
    let target: HTMLElement | null = panel.querySelector('[autofocus]');
    if (!target && mode !== 'first-tabbable' && mode !== 'panel') {
      target = panel.querySelector(mode);
    }
    if (!target && mode !== 'panel') {
      target = getTabbableElements(panel)[0] ?? null;
    }
    (target ?? panel).focus({ preventScroll: true });
  }

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    // Only the topmost surface reacts, so a popup opened inside the drawer
    // closes before the drawer does.
    if (!isTopOverlay(this)) return;
    if (!this.closeOnEscape()) return;
    event.stopPropagation();
    this.requestClose('escape');
  };

  protected onPanelKeydown(event: KeyboardEvent): void {
    // A persistent drawer must not trap Tab: focus has to flow out into the
    // content and back, which is what makes it a landmark rather than a dialog.
    if (!this.isModal() || event.key !== 'Tab') return;
    const panel = this.panelEl().nativeElement;
    trapTabKey(event, panel, panel);
  }

  protected onBackdropPointerDown(): void {
    this.backdropPress = true;
  }

  protected onBackdropClick(): void {
    // Only a press that *started* on the backdrop counts, so a drag that ends
    // there after starting inside the panel does not close it.
    const started = this.backdropPress;
    this.backdropPress = false;
    if (started && this.closeOnBackdropClick()) this.requestClose('backdrop');
  }

  protected itemContext(view: OgeDrawerItemView): OgeDrawerItemTemplateContext {
    return {
      $implicit: view.item,
      key: view.key,
      active: view.active,
      rail: this.rail(),
      index: view.index,
    };
  }

  protected onItemClick(view: OgeDrawerItemView, event: MouseEvent): void {
    runOgeDrawerItemClick({
      view,
      selectedKey: this.selectedKey(),
      event,
      emitItemClick: (click) => this.itemClick.emit(click),
      commit: (key) => this.selectedKey.set(key),
      emitSelectionChanged: (changed) => this.selectionChanged.emit(changed),
    });
  }

  protected onItemsKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-drawer-item]')
        : null;
    if (!target) return;
    const current = Number(target.getAttribute('data-drawer-item'));
    const next = ogeDrawerItemNavIndex(this.itemViews(), current, event.key);
    if (next === null) return;
    event.preventDefault();
    this.panelEl()
      .nativeElement.querySelector<HTMLElement>(`[data-drawer-item="${next}"]`)
      ?.focus();
  }

  /** Touch edge swipe (`swipeEnabled`) — the decisions are `beginOgeDrawerSwipe`'s. */
  protected onHostPointerDown(event: PointerEvent): void {
    if (!this.swipeEnabled() || this.disabled()) return;
    const host = this.host.nativeElement;
    const vertical = this.position() === 'top' || this.position() === 'bottom';
    const panel = this.panelEl().nativeElement;
    const size = this.size();
    const panelSize =
      typeof size === 'number'
        ? size
        : (vertical ? panel.offsetHeight : panel.offsetWidth) || 260;
    const direction = ogeResolveDirection(host);
    this.swipe?.cancel();
    this.swipe = beginOgeDrawerSwipe(event, {
      edge: ogeDrawerPhysicalEdge(this.position(), direction),
      opened: this.opened(),
      rect: host.getBoundingClientRect(),
      panelSize,
      onOpen: () => this.open(),
      onClose: () => this.requestClose('swipe'),
    });
  }

  private measure(): void {
    const size = this.host.nativeElement.clientWidth;
    if (size !== this.containerSize()) this.containerSize.set(size);
  }

  private warnGuardFailure(): void {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      console.warn(
        '[oge-navigation] drawer closeGuard threw or rejected — treating it as a veto.',
      );
    }
  }
}
