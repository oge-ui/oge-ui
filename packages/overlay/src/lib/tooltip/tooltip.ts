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
import { OGE_OVERLAY_CONFIG } from '../config';
import { OgeAnchoredPanel } from '../panel/anchored-panel';
import type { OgePopupPlacement } from '../position/position';

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
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly panel = new OgeAnchoredPanel({
    anchor: () => this.host.nativeElement,
    panel: () => this.componentRef?.location.nativeElement ?? null,
    placement: () => this.tooltipPlacement(),
    // Tooltips are transient: no Escape stack, no outside-click handling —
    // the directive owns every hide trigger itself.
    transient: true,
    closeOnEscape: false,
    closeOnOutsidePointerDown: false,
    onClosed: () => this.removeDescribedBy(),
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.clearTimers();
      this.panel.destroy();
      this.removeDescribedBy();
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
      const disabled = this.tooltipDisabled();
      untracked(() => {
        this.componentRef?.setInput('text', text);
        if ((disabled || !text) && this.panel.isOpen()) this.hide();
      });
    });
  }

  /** Shows after the hover dwell (pointer path). */
  protected scheduleShow(): void {
    this.clearTimer('hide');
    if (this.panel.isOpen() || !this.canShow()) return;
    this.clearTimer('show');
    this.showTimer = setTimeout(
      () => this.show(),
      this.tooltipShowDelay() ?? this.config.tooltipShowDelayMs,
    );
  }

  /** Hides after the grace period (pointer path). */
  protected scheduleHide(): void {
    this.clearTimer('show');
    if (!this.panel.isOpen()) return;
    this.clearTimer('hide');
    this.hideTimer = setTimeout(
      () => this.hide(),
      this.tooltipHideDelay() ?? this.config.tooltipHideDelayMs,
    );
  }

  /** Shows immediately (keyboard focus path). */
  show(): void {
    this.clearTimers();
    if (this.panel.isOpen() || !this.canShow()) return;
    this.ensureBubble();
    this.panel.open();
    this.addDescribedBy();
  }

  hide(): void {
    this.clearTimers();
    this.panel.close();
  }

  private canShow(): boolean {
    return !this.tooltipDisabled() && this.ogeTooltip().trim().length > 0;
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

  /** The element written to last, so removal always hits the same node. */
  private describedByEl: HTMLElement | null = null;

  /**
   * Screen readers only announce `aria-describedby` on the focused element,
   * so on composite hosts (`<oge-button ogeTooltip>`) the id must land on
   * the inner native control, not the custom-element wrapper.
   */
  private describedByTarget(): HTMLElement {
    const el = this.host.nativeElement;
    if (el.matches('button, input, select, textarea, a[href], [tabindex]')) {
      return el;
    }
    return (
      el.querySelector<HTMLElement>(
        'button, input, select, textarea, a[href]',
      ) ?? el
    );
  }

  /** Appends the tooltip id to `aria-describedby`, preserving existing ids. */
  private addDescribedBy(): void {
    const el = this.describedByTarget();
    this.describedByEl = el;
    const existing = el.getAttribute('aria-describedby');
    const ids = existing ? existing.split(/\s+/) : [];
    if (!ids.includes(this.panel.panelId)) {
      ids.push(this.panel.panelId);
      el.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  private removeDescribedBy(): void {
    const el = this.describedByEl;
    this.describedByEl = null;
    const existing = el?.getAttribute('aria-describedby');
    if (!el || !existing) return;
    const ids = existing.split(/\s+/).filter((id) => id !== this.panel.panelId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  private clearTimer(kind: 'show' | 'hide'): void {
    const timer = kind === 'show' ? this.showTimer : this.hideTimer;
    if (timer !== null) clearTimeout(timer);
    if (kind === 'show') this.showTimer = null;
    else this.hideTimer = null;
  }

  private clearTimers(): void {
    this.clearTimer('show');
    this.clearTimer('hide');
  }
}
