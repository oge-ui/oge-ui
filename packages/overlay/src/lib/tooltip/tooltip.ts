import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  ViewEncapsulation,
  createComponent,
  effect,
  inject,
  input,
  untracked,
  type ComponentRef,
} from '@angular/core';
import {
  OGE_TOOLTIP_PANEL_OPTIONS,
  OgeTooltipCore,
  tooltipDescribedByTarget,
  type OgePopupPlacement,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG } from '../config';
import { OgeAnchoredPanel } from '../panel/anchored-panel';

/**
 * Presentational tooltip bubble — created by the `OgeTooltip` directive and
 * appended to `document.body` so transformed/overflow ancestors never clip it.
 * Internal; not exported from the package barrel.
 */
@Component({
  selector: 'oge-tooltip-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-tooltip',
    role: 'tooltip',
    '[id]': 'panel().panelId',
    '[style.top.px]': 'panel().position()?.top ?? 0',
    '[style.left.px]': 'panel().position()?.left ?? 0',
    '[style.display]': "panel().isOpen() ? null : 'none'",
    '[style.opacity]': "panel().position() ? null : '0'",
    '[class.oge-tooltip-ready]': 'panel().position() !== null',
    '[attr.data-placement]': 'panel().position()?.placement ?? null',
  },
  styleUrl: './tooltip.scss',
  template: `{{ text() }}`,
})
export class OgeTooltipPanel {
  readonly panel = input.required<OgeAnchoredPanel>();
  readonly text = input('');
}

/**
 * Attaches an accessible tooltip to any element:
 *
 * ```html
 * <button ogeTooltip="Save your changes">Save</button>
 * <oge-button text="Delete" ogeTooltip="Removes the record permanently"
 *             tooltipPlacement="bottom" />
 * ```
 *
 * Shows after a hover dwell (configurable, `provideOgeOverlayConfig`) or
 * immediately on keyboard focus; hides on leave, blur or Escape. While
 * visible the trigger's `aria-describedby` includes the tooltip id — any
 * existing value is preserved. The bubble is viewport-aware (flips and
 * clamps) and never receives pointer events.
 *
 * The timing machine and the `aria-describedby` bookkeeping are
 * `@oge-ui/behavior`'s `OgeTooltipCore`, shared verbatim with the React
 * tooltip (ADR 0001); this directive owns the Angular bubble component.
 */
@Directive({
  selector: '[ogeTooltip]',
  host: {
    '(pointerenter)': 'scheduleShow()',
    '(pointerleave)': 'scheduleHide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
  },
})
export class OgeTooltip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly config = inject(OGE_OVERLAY_CONFIG);

  /** Tooltip text. An empty string disables the tooltip. */
  readonly ogeTooltip = input.required<string>();
  /** Preferred side; flips when there is no room. Default `'top'` (centered). */
  readonly tooltipPlacement = input<OgePopupPlacement>('top');
  /** Hover dwell before showing; falls back to the overlay config. */
  readonly tooltipShowDelay = input<number | undefined>(undefined);
  /** Grace period before hiding; falls back to the overlay config. */
  readonly tooltipHideDelay = input<number | undefined>(undefined);
  /** Disables showing without detaching the directive. */
  readonly tooltipDisabled = input(false);

  private componentRef: ComponentRef<OgeTooltipPanel> | null = null;

  private readonly panel = new OgeAnchoredPanel({
    anchor: () => this.host.nativeElement,
    panel: () => this.componentRef?.location.nativeElement ?? null,
    placement: () => this.tooltipPlacement(),
    ...OGE_TOOLTIP_PANEL_OPTIONS,
    onClosed: () => this.core.onPanelClosed(),
  });

  private readonly core = new OgeTooltipCore({
    text: () => this.ogeTooltip(),
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
    // Live updates: re-render the bubble text (and hide when it empties or
    // the tooltip is disabled) while visible.
    effect(() => {
      const text = this.ogeTooltip();
      this.tooltipDisabled();
      untracked(() => {
        this.componentRef?.setInput('text', text);
        this.core.sync();
      });
    });
  }

  /** Shows after the hover dwell (pointer path). */
  protected scheduleShow(): void {
    this.core.scheduleShow();
  }

  /** Hides after the grace period (pointer path). */
  protected scheduleHide(): void {
    this.core.scheduleHide();
  }

  /** Shows immediately (keyboard focus path). */
  show(): void {
    this.core.show();
  }

  hide(): void {
    this.core.hide();
  }

  private ensureBubble(): void {
    if (this.componentRef) return;
    this.componentRef = createComponent(OgeTooltipPanel, {
      environmentInjector: this.envInjector,
    });
    this.componentRef.setInput('panel', this.panel);
    this.componentRef.setInput('text', this.ogeTooltip());
    this.appRef.attachView(this.componentRef.hostView);
    document.body.appendChild(this.componentRef.location.nativeElement);
  }
}
