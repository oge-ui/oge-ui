import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  TemplateRef,
  ViewEncapsulation,
  computed,
  createComponent,
  effect,
  inject,
  input,
  untracked,
  type ComponentRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  OGE_POPUP_ARROW_SIZE,
  OGE_TOOLTIP_PANEL_OPTIONS,
  OgeTooltipCore,
  modalCssSize,
  popupArrowInset,
  tooltipDescribedByTarget,
  type OgePopupPlacement,
  type OgeTooltipShowMode,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG } from '../config';
import { OgeAnchoredPanel } from '../panel/anchored-panel';

/**
 * Context of a tooltip template (`[ogeTooltip]="tpl"`): `$implicit` is the
 * directive's `tooltipContext` value.
 */
export interface OgeTooltipTemplateContext<C = unknown> {
  /** The `tooltipContext` value. */
  $implicit: C;
}

/**
 * Presentational tooltip bubble — created by the `OgeTooltip` directive and
 * appended to `document.body` so transformed/overflow ancestors never clip it.
 * Internal; not exported from the package barrel.
 */
@Component({
  selector: 'oge-tooltip-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-tooltip',
    role: 'tooltip',
    '[id]': 'panel().panelId',
    '[style.top.px]': 'panel().position()?.top ?? 0',
    '[style.left.px]': 'panel().position()?.left ?? 0',
    '[style.display]': "panel().isOpen() ? null : 'none'",
    '[style.opacity]': "panel().position() ? null : '0'",
    '[style.max-width]': 'maxWidth()',
    '[class.oge-tooltip-ready]': 'panel().position() !== null',
    '[attr.data-placement]': 'panel().position()?.placement ?? null',
  },
  styleUrl: './tooltip.scss',
  template: `
    @if (template(); as tpl) {
      <ng-container
        [ngTemplateOutlet]="tpl"
        [ngTemplateOutletContext]="{ $implicit: context() }"
      />
    } @else {
      {{ text() }}
    }
    @if (arrow()) {
      @if (panel().position()?.arrow; as a) {
        <span
          class="oge-tooltip-arrow"
          aria-hidden="true"
          [attr.data-side]="a.side"
          [style.left.px]="arrowInset(a).left"
          [style.top.px]="arrowInset(a).top"
        ></span>
      }
    }
  `,
})
export class OgeTooltipPanel {
  readonly panel = input.required<OgeAnchoredPanel>();
  readonly text = input('');
  readonly template = input<TemplateRef<OgeTooltipTemplateContext> | null>(
    null,
  );
  readonly context = input<unknown>(undefined);
  readonly arrow = input(false);
  readonly maxWidth = input<string | null>(null);

  protected readonly arrowInset = popupArrowInset;
}

/**
 * Attaches an accessible tooltip to any element:
 *
 * ```html
 * <button ogeTooltip="Save your changes">Save</button>
 * <oge-button text="Delete" ogeTooltip="Removes the record permanently"
 *             tooltipPlacement="bottom" [tooltipArrow]="true" />
 *
 * <!-- rich content: a template, with an optional context -->
 * <button type="button" [ogeTooltip]="userTip" [tooltipContext]="user">Ada</button>
 * <ng-template #userTip let-user><strong>{{ user.name }}</strong> · {{ user.role }}</ng-template>
 *
 * <!-- imperative: exportAs + manual mode -->
 * <button type="button" ogeTooltip="Copied!" tooltipShowMode="manual"
 *         #tip="ogeTooltip" (click)="tip.open()">Copy</button>
 * ```
 *
 * Shows after a hover dwell (configurable, `provideOgeOverlayConfig`) or
 * immediately on keyboard focus; hides on leave, blur or Escape (pressed
 * anywhere while it shows) — `tooltipShowMode` switches to focus-only,
 * click-to-toggle or manual. While visible the trigger's `aria-describedby`
 * includes the tooltip id — any existing value is preserved. The bubble is
 * viewport-aware (flips and clamps), optionally draws a callout arrow, and
 * is hoverable (WCAG 1.4.13): moving the pointer from the trigger onto it
 * within the hide delay keeps it open. Rich content stays non-interactive
 * (APG tooltip) — nothing in the bubble is focusable.
 *
 * The timing machine and the `aria-describedby` bookkeeping are
 * `@oge-ui/behavior`'s `OgeTooltipCore`, shared verbatim with the React
 * tooltip (ADR 0001); this directive owns the Angular bubble component.
 */
@Directive({
  selector: '[ogeTooltip]',
  exportAs: 'ogeTooltip',
  host: {
    '(pointerenter)': 'core.pointerEnter()',
    '(pointerleave)': 'core.pointerLeave()',
    '(focusin)': 'core.focusIn()',
    '(focusout)': 'core.focusOut()',
    '(click)': 'core.click()',
    '(keydown)': 'core.keyDown($event.key)',
  },
})
export class OgeTooltip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly config = inject(OGE_OVERLAY_CONFIG);

  /**
   * Tooltip content: text, or a template for rich content (formatting,
   * icons — never focusable controls: a tooltip is not interactive). An
   * empty string disables the tooltip.
   */
  readonly ogeTooltip = input.required<
    string | TemplateRef<OgeTooltipTemplateContext>
  >();
  /** Value handed to a template `ogeTooltip` as `$implicit`. */
  readonly tooltipContext = input<unknown>(undefined);
  /** Preferred side; flips when there is no room. Default `'top'` (centered). */
  readonly tooltipPlacement = input<OgePopupPlacement>('top');
  /**
   * What shows the tooltip: `'hover'` (dwell + keyboard focus, the default),
   * `'focus'`, `'click'` (activation toggles) or `'manual'` (only
   * `open()` / `close()` / `toggle()`).
   */
  readonly tooltipShowMode = input<OgeTooltipShowMode>('hover');
  /** Hover dwell before showing; falls back to the overlay config. */
  readonly tooltipShowDelay = input<number | undefined>(undefined);
  /** Grace period before hiding; falls back to the overlay config. */
  readonly tooltipHideDelay = input<number | undefined>(undefined);
  /** Draws a callout arrow pointing at the trigger. Default `false`. */
  readonly tooltipArrow = input(false);
  /** Maximum bubble width (px number or any CSS length); CSS default 280px. */
  readonly tooltipMaxWidth = input<number | string | undefined>(undefined);
  /** Disables showing without detaching the directive. */
  readonly tooltipDisabled = input(false);

  private componentRef: ComponentRef<OgeTooltipPanel> | null = null;

  private readonly template = computed(() => {
    const content = this.ogeTooltip();
    return content instanceof TemplateRef ? content : null;
  });
  private readonly text = computed(() => {
    const content = this.ogeTooltip();
    return typeof content === 'string' ? content : '';
  });
  private readonly maxWidth = computed(() =>
    modalCssSize(this.tooltipMaxWidth()),
  );

  private readonly panel = new OgeAnchoredPanel({
    anchor: () => this.host.nativeElement,
    panel: () => this.componentRef?.location.nativeElement ?? null,
    placement: () => this.tooltipPlacement(),
    offset: () =>
      this.config.offset + (this.tooltipArrow() ? OGE_POPUP_ARROW_SIZE : 0),
    arrow: () => this.tooltipArrow(),
    ...OGE_TOOLTIP_PANEL_OPTIONS,
    onClosed: () => this.core.onPanelClosed(),
  });

  /** The shared timing machine — the host listeners route into it. */
  protected readonly core = new OgeTooltipCore({
    text: () => this.text(),
    hasContent: () => this.template() !== null,
    showMode: () => this.tooltipShowMode(),
    disabled: () => this.tooltipDisabled(),
    showDelay: () => this.tooltipShowDelay() ?? this.config.tooltipShowDelayMs,
    hideDelay: () => this.tooltipHideDelay() ?? this.config.tooltipHideDelayMs,
    isOpen: () => this.panel.isOpen(),
    open: () => {
      this.ensureBubble();
      this.panel.open();
    },
    close: () => this.panel.close(),
    describedByTarget: () => tooltipDescribedByTarget(this.host.nativeElement),
    panelId: this.panel.panelId,
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.core.destroy();
      this.panel.destroy();
      if (this.componentRef) {
        const bubbleEl = this.componentRef.location.nativeElement;
        this.componentRef.destroy();
        bubbleEl.remove(); // createComponent hosts are never auto-removed
        this.componentRef = null;
      }
    });
    // Live updates: re-render the bubble content (and hide when it empties
    // or the tooltip is disabled) while visible.
    effect(() => {
      this.ogeTooltip();
      this.tooltipContext();
      this.tooltipArrow();
      this.maxWidth();
      this.tooltipDisabled();
      untracked(() => {
        this.syncBubbleInputs();
        this.core.sync();
      });
    });
  }

  /** Shows the tooltip now, whatever the show mode (no dwell). */
  open(): void {
    this.core.show();
  }

  /** Hides the tooltip now. */
  close(): void {
    this.core.hide();
  }

  /** Shows a hidden tooltip, hides a visible one. */
  toggle(): void {
    this.core.toggle();
  }

  /** Shows immediately; the pre-`open()` name, kept for existing callers. */
  show(): void {
    this.core.show();
  }

  /** Hides immediately; the pre-`close()` name, kept for existing callers. */
  hide(): void {
    this.core.hide();
  }

  private syncBubbleInputs(): void {
    const ref = this.componentRef;
    if (!ref) return;
    ref.setInput('text', this.text());
    ref.setInput('template', this.template());
    ref.setInput('context', this.tooltipContext());
    ref.setInput('arrow', this.tooltipArrow());
    ref.setInput('maxWidth', this.maxWidth());
  }

  private ensureBubble(): void {
    if (this.componentRef) return;
    this.componentRef = createComponent(OgeTooltipPanel, {
      environmentInjector: this.envInjector,
    });
    this.componentRef.setInput('panel', this.panel);
    this.syncBubbleInputs();
    this.appRef.attachView(this.componentRef.hostView);
    const bubble: HTMLElement = this.componentRef.location.nativeElement;
    // WCAG 1.4.13 hoverable: the pointer may move onto the bubble
    bubble.addEventListener('pointerenter', () =>
      this.core.bubblePointerEnter(),
    );
    bubble.addEventListener('pointerleave', () =>
      this.core.bubblePointerLeave(),
    );
    document.body.appendChild(bubble);
  }
}
