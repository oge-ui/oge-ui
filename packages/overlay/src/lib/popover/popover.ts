import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  ViewEncapsulation,
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
import {
  OGE_DEFAULT_OVERLAY_MESSAGES,
  OGE_POPUP_ARROW_SIZE,
  OgePopoverCore,
  modalCssSize,
  popupArrowInset,
  popoverTriggerAria,
  syncPopoverTriggerAria,
  tooltipDescribedByTarget,
  type OgeOverlayMessages,
  type OgePopoverClosedEvent,
  type OgePopoverClosingEvent,
  type OgePopoverInitialFocus,
  type OgePopoverOpenedEvent,
  type OgePopoverOpeningEvent,
  type OgePopoverShowOn,
  type OgePopoverTriggerAria,
  type OgePopupPlacement,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG } from '../config';
import { OgeAnchoredPanel } from '../panel/anchored-panel';
import {
  OgePopoverFooter,
  OgePopoverTitle,
  type OgePopoverSlotContext,
} from './popover-templates';

let nextPopoverId = 0;

/**
 * Anchored, interactive panel — title, rich body, footer actions, a close
 * button and an optional callout arrow — opened from any element carrying
 * `[ogePopover]`:
 *
 * ```html
 * <button type="button" [ogePopover]="share">Share</button>
 * <oge-popover #share title="Share report" [arrow]="true">
 *   <p>Anyone with the link can view.</p>
 *   <div *ogePopoverFooter="let close">
 *     <oge-button text="Copy link" (clicked)="copy(); close()" />
 *   </div>
 * </oge-popover>
 * ```
 *
 * `showOn` picks the trigger: `'click'` (the APG disclosure — the trigger
 * gets `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`),
 * `'hover'` (dwell + a grace period that survives moving into the panel;
 * keyboard focus opens it too), `'focus'` or `'manual'`. The panel is a
 * `role="dialog"`: non-modal by default (Tab moves from the trigger into
 * the panel and on past it, as if it followed the trigger inline — it is
 * rendered into `document.body`), or `modal` (`aria-modal`, Tab trapped,
 * initial focus inside, focus restored on close). Escape (the shared
 * overlay stack), outside clicks and the ✕ close it through the cancelable
 * `closing` event; `[(visible)]` and `open()` / `close()` / `toggle()` drive
 * it from code.
 *
 * The trigger timing, close reasons, focus order and ARIA decisions are
 * `@oge-ui/behavior`'s `OgePopoverCore`, positioning and the arrow geometry
 * the shared `OgeAnchoredPanelCore` — the React `<OgePopover>` runs the same
 * code (ADR 0001).
 */
@Component({
  selector: 'oge-popover',
  exportAs: 'ogePopover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: { class: 'oge-popover-host' },
  styleUrl: './popover.scss',
  template: `
    @if (panel.isOpen()) {
      <div
        #panelEl
        class="oge-popover"
        tabindex="-1"
        [id]="panel.panelId"
        role="dialog"
        [attr.aria-modal]="modal() ? 'true' : null"
        [attr.aria-labelledby]="hasTitle() ? titleId : null"
        [attr.aria-label]="hasTitle() ? null : (ariaLabel() ?? null)"
        [class.oge-popover-modal]="modal()"
        [class.oge-popover-ready]="panel.position() !== null"
        [attr.data-placement]="panel.position()?.placement ?? null"
        [style.top.px]="panel.position()?.top ?? 0"
        [style.left.px]="panel.position()?.left ?? 0"
        [style.opacity]="panel.position() ? null : '0'"
        (pointerenter)="core.panelPointerEnter()"
        (pointerleave)="core.panelPointerLeave()"
        (focusout)="core.panelFocusOut($event)"
        (keydown)="core.panelKeyDown($event)"
      >
        <div
          class="oge-popover-content"
          [style.width]="widthCss()"
          [style.max-width]="maxWidthCss()"
        >
          @if (hasHeader()) {
            <div class="oge-popover-header">
              @if (hasTitle()) {
                <div class="oge-popover-title" [id]="titleId">
                  @if (titleTemplate(); as t) {
                    <ng-container
                      [ngTemplateOutlet]="t.templateRef"
                      [ngTemplateOutletContext]="slotContext"
                    />
                  } @else {
                    {{ title() }}
                  }
                </div>
              }
              @if (showCloseButton()) {
                <button
                  type="button"
                  class="oge-popover-close"
                  [attr.aria-label]="closeLabel()"
                  [attr.title]="closeLabel()"
                  (click)="core.close('closeButton')"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              }
            </div>
          }
          <div class="oge-popover-body"><ng-content /></div>
          @if (footerTemplate(); as f) {
            <div class="oge-popover-footer">
              <ng-container
                [ngTemplateOutlet]="f.templateRef"
                [ngTemplateOutletContext]="slotContext"
              />
            </div>
          }
        </div>
        @if (arrow()) {
          @if (panel.position()?.arrow; as a) {
            <span
              class="oge-popover-arrow"
              aria-hidden="true"
              [attr.data-side]="a.side"
              [style.left.px]="arrowInset(a).left"
              [style.top.px]="arrowInset(a).top"
            ></span>
          }
        }
      </div>
    }
  `,
})
export class OgePopover {
  private readonly config = inject(OGE_OVERLAY_CONFIG);

  /** Two-way open state (`[(visible)]`); writes run the cancelable events. */
  readonly visible = model(false);
  /** Title text; labels the dialog. `*ogePopoverTitle` replaces it. */
  readonly title = input<string>();
  /** Accessible name when there is no title. */
  readonly ariaLabel = input<string>();
  /**
   * What opens it from an `[ogePopover]` trigger: `'click'` (default),
   * `'hover'`, `'focus'` or `'manual'` (code only).
   */
  readonly showOn = input<OgePopoverShowOn>('click');
  /** Preferred side; flips and clamps against the viewport. Default `'bottom'`. */
  readonly placement = input<OgePopupPlacement>('bottom');
  /** Draws a callout arrow pointing at the trigger. Default `false`. */
  readonly arrow = input(false);
  /**
   * Modal dialog: `aria-modal`, Tab trapped inside, focus moved in on open
   * and restored on close. Default `false` (non-modal; Tab may leave).
   */
  readonly modal = input(false);
  /** Renders the header ✕ (label from the overlay messages). Default `true`. */
  readonly showCloseButton = input(true);
  /** Content width (px number or CSS length). */
  readonly width = input<number | string>();
  /** Maximum content width (px number or CSS length); CSS default 360px. */
  readonly maxWidth = input<number | string>();
  /** Hover dwell before opening (hover mode); falls back to the overlay config. */
  readonly showDelay = input<number>();
  /** Grace period before closing after the pointer left; falls back to the overlay config. */
  readonly hideDelay = input<number>();
  /**
   * Focus target on click / API opens: `'auto'` (first tabbable when modal,
   * none otherwise), `'none'`, `'first-tabbable'`, `'panel'` or a selector.
   */
  readonly initialFocus = input<OgePopoverInitialFocus>('auto');
  /** Returns focus to the trigger when a close would lose it. Default `true`. */
  readonly restoreFocus = input(true);
  /** Escape closes the popover. Default `true`. */
  readonly closeOnEscape = input(true);
  /** A pointer-down outside trigger and panel closes it. Default `true`. */
  readonly closeOnOutsideClick = input(true);
  /** Prevents opening; closes an open popover. Default `false`. */
  readonly disabled = input(false);
  /**
   * Element to anchor to when no `[ogePopover]` trigger opened it (a popover
   * opened from code); falls back to the first `[ogePopover]` trigger.
   */
  readonly anchor = input<HTMLElement | null>(null);
  /** Per-instance message overrides (the close button's label). */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** Cancelable, before every open; carries the reason. */
  readonly opening = output<OgePopoverOpeningEvent>();
  /** After the popover opened. */
  readonly opened = output<OgePopoverOpenedEvent>();
  /** Cancelable, before every close; carries the reason. */
  readonly closing = output<OgePopoverClosingEvent>();
  /** After the popover closed. */
  readonly closed = output<OgePopoverClosedEvent>();

  protected readonly titleTemplate = contentChild(OgePopoverTitle);
  protected readonly footerTemplate = contentChild(OgePopoverFooter);
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panelEl');

  protected readonly titleId = `oge-popover-title-${nextPopoverId++}`;
  protected readonly hasTitle = computed(
    () => !!this.title() || !!this.titleTemplate(),
  );
  protected readonly hasHeader = computed(
    () => this.hasTitle() || this.showCloseButton(),
  );
  protected readonly widthCss = computed(() => modalCssSize(this.width()));
  protected readonly maxWidthCss = computed(() =>
    modalCssSize(this.maxWidth()),
  );
  protected readonly closeLabel = computed(
    () =>
      this.messages()?.popoverClose ??
      this.config.messages.popoverClose ??
      OGE_DEFAULT_OVERLAY_MESSAGES.popoverClose ??
      '',
  );
  protected readonly arrowInset = popupArrowInset;
  protected readonly slotContext: OgePopoverSlotContext = {
    $implicit: () => this.close(),
    close: () => this.close(),
  };

  /** The trigger element that opened the popover last (`[ogePopover]`). */
  private readonly activeTrigger = signal<HTMLElement | null>(null);
  /** Every `[ogePopover]` pointing here — the first anchors code opens. */
  private readonly triggers: (() => HTMLElement)[] = [];

  /** The anchored-panel model (positioning, Escape stack, outside click). */
  readonly panel = new OgeAnchoredPanel({
    anchor: () => this.anchorElement(),
    panel: () => this.panelEl()?.nativeElement ?? null,
    placement: () => this.placement(),
    offset: () =>
      this.config.offset + (this.arrow() ? OGE_POPUP_ARROW_SIZE : 0),
    viewportPadding: () => this.config.viewportPadding,
    arrow: () => this.arrow(),
    beforeClose: (reason) => this.core.beforePanelClose(reason),
  });

  /** The shared state machine — trigger and panel events route into it. */
  protected readonly core: OgePopoverCore = new OgePopoverCore({
    showOn: () => this.showOn(),
    modal: () => this.modal(),
    disabled: () => this.disabled(),
    showDelay: () => this.showDelay() ?? this.config.popoverShowDelayMs,
    hideDelay: () => this.hideDelay() ?? this.config.popoverHideDelayMs,
    initialFocus: () => this.initialFocus(),
    restoreFocus: () => this.restoreFocus(),
    closeOnEscape: () => this.closeOnEscape(),
    closeOnOutsideClick: () => this.closeOnOutsideClick(),
    isOpen: () => this.panel.isOpen(),
    commitOpen: () => {
      this.panel.open();
      this.visible.set(true);
    },
    commitClose: () => {
      this.panel.close('api');
      this.visible.set(false);
    },
    trigger: () => this.anchorElement(),
    panel: () => this.panelEl()?.nativeElement ?? null,
    onOpening: (event) => this.opening.emit(event),
    onOpened: (event) => this.opened.emit(event),
    onClosing: (event) => this.closing.emit(event),
    onClosed: (event) => this.closed.emit(event),
  });

  constructor() {
    // `[(visible)]` written from outside → the same cancelable pipeline; a
    // vetoed change writes the reached state back.
    effect(() => {
      const wanted = this.visible();
      untracked(() => {
        const reached = this.core.syncOpenState(wanted);
        if (reached !== wanted) this.visible.set(reached);
      });
    });
    effect(() => {
      this.disabled();
      untracked(() => this.core.sync());
    });
    // Portal: the open panel moves to `document.body`, so transformed or
    // clipping ancestors of the declaration point never affect it. Angular
    // removes the node wherever it is when the `@if` closes.
    let portaled: HTMLElement | null = null;
    afterRenderEffect(() => {
      const el = this.panelEl()?.nativeElement;
      if (el && el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
      portaled = el ?? null;
    });
    // Initial focus once the panel was first positioned.
    effect(() => {
      const measured = this.panel.position() !== null;
      untracked(() => {
        if (measured) this.core.panelReady();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.core.destroy();
      this.panel.destroy();
      // Destroying the declaring view detaches only its own root nodes; the
      // portaled panel lives elsewhere and must go explicitly.
      portaled?.remove();
      portaled = null;
    });
  }

  /** Opens the popover (reason `'api'`; runs `opening`). */
  open(): void {
    this.core.open('api');
  }

  /** Closes the popover (reason `'api'`; runs `closing`). */
  close(): void {
    this.core.close('api');
  }

  /** Opens a closed popover, closes an open one. */
  toggle(): void {
    this.core.toggle();
  }

  /**
   * Trigger seam for `[ogePopover]` — routes a trigger event into the
   * machine and records which trigger the panel anchors to.
   * @internal
   */
  handleTrigger(
    kind:
      | 'click'
      | 'pointerenter'
      | 'pointerleave'
      | 'focusin'
      | 'focusout'
      | 'keydown',
    trigger: HTMLElement,
    event: Event,
  ): void {
    const current = this.activeTrigger();
    if (this.panel.isOpen() && current !== null && current !== trigger) {
      // Another trigger of an open popover: a click re-anchors the panel to
      // it; its hover / focus / key traffic is not about the open panel.
      if (kind === 'click' && this.showOn() === 'click') {
        this.activeTrigger.set(trigger);
        this.panel.updatePosition();
      }
      return;
    }
    if (!this.panel.isOpen()) this.activeTrigger.set(trigger);
    switch (kind) {
      case 'click':
        this.core.triggerClick();
        break;
      case 'pointerenter':
        this.core.triggerPointerEnter();
        break;
      case 'pointerleave':
        this.core.triggerPointerLeave();
        break;
      case 'focusin':
        this.core.triggerFocusIn();
        break;
      case 'focusout':
        this.core.triggerFocusOut(event as FocusEvent);
        break;
      case 'keydown':
        this.core.triggerKeyDown(event as KeyboardEvent);
        break;
    }
  }

  /**
   * Registers an `[ogePopover]` trigger; returns the unregister function.
   * @internal
   */
  registerTrigger(resolve: () => HTMLElement): () => void {
    this.triggers.push(resolve);
    return () => {
      const index = this.triggers.indexOf(resolve);
      if (index !== -1) this.triggers.splice(index, 1);
    };
  }

  /**
   * ARIA a trigger element carries — expanded only for the trigger the
   * panel is anchored to.
   * @internal
   */
  triggerAria(trigger: HTMLElement): OgePopoverTriggerAria {
    const open = this.panel.isOpen() && this.activeTrigger() === trigger;
    return popoverTriggerAria(this.showOn(), open, this.panel.panelId);
  }

  private anchorElement(): HTMLElement | null {
    return this.activeTrigger() ?? this.anchor() ?? this.triggers[0]?.() ?? null;
  }
}

/**
 * Makes its host the trigger (and anchor) of an `oge-popover`:
 *
 * ```html
 * <button type="button" [ogePopover]="details">Details</button>
 * <oge-popover #details title="Order #1042">…</oge-popover>
 * ```
 *
 * Wires the popover's `showOn` interactions and the trigger ARIA
 * (`aria-haspopup="dialog"` for click / manual, `aria-expanded`,
 * `aria-controls` while open), written on the host's focusable control — the
 * inner `<button>` of an `oge-button`, the host itself otherwise. Several
 * triggers may share one popover; the panel anchors to the one that opened
 * it.
 */
@Directive({
  selector: '[ogePopover]',
  exportAs: 'ogePopoverTrigger',
  host: {
    '(click)': "route('click', $event)",
    '(pointerenter)': "route('pointerenter', $event)",
    '(pointerleave)': "route('pointerleave', $event)",
    '(focusin)': "route('focusin', $event)",
    '(focusout)': "route('focusout', $event)",
    '(keydown)': "route('keydown', $event)",
  },
})
export class OgePopoverTrigger {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The popover this element opens (a template reference to `<oge-popover>`). */
  readonly ogePopover = input.required<OgePopover>();

  /** The focusable control: anchor, focus-return point and ARIA carrier. */
  private control(): HTMLElement {
    return tooltipDescribedByTarget(this.host.nativeElement);
  }

  constructor() {
    const unregister = signal<(() => void) | null>(null);
    effect(() => {
      const popover = this.ogePopover();
      untracked(() => {
        unregister()?.();
        unregister.set(popover.registerTrigger(() => this.control()));
      });
    });
    inject(DestroyRef).onDestroy(() => unregister()?.());
    // After render: a wrapper component's inner control exists only then.
    afterRenderEffect(() => {
      const aria = this.ogePopover().triggerAria(this.control());
      syncPopoverTriggerAria(this.control(), aria);
    });
  }

  protected route(
    kind: Parameters<OgePopover['handleTrigger']>[0],
    event: Event,
  ): void {
    this.ogePopover().handleTrigger(kind, this.control(), event);
  }
}

export type {
  OgePopoverShowOn,
  OgePopoverOpenReason,
  OgePopoverCloseReason,
  OgePopoverInitialFocus,
  OgePopoverOpeningEvent,
  OgePopoverOpenedEvent,
  OgePopoverClosingEvent,
  OgePopoverClosedEvent,
} from '@oge-ui/behavior';
