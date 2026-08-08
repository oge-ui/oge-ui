import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import type { OgeTabDescriptor } from './tab-descriptor';
import { OgeTabStrip } from './tab-strip';
import { OgeTabsBase } from './tabs-base';
import type {
  OgeTabContentTemplateContext,
  OgeTabPanelAnimation,
  OgeTabsOrientation,
  OgeTabsPosition,
} from './tabs-types';

/**
 * Tab strip with content panels. Declarative `<oge-tab>` children carry
 * their content; data-driven `items` render through the component-level
 * `[ogeTabContentTemplate]`:
 *
 * ```html
 * <oge-tab-panel [(selectedIndex)]="index" (selectionChanged)="onTab($event)">
 *   <oge-tab text="Overview">Overview content…</oge-tab>
 *   <oge-tab text="Settings" [closable]="true">Settings content…</oge-tab>
 * </oge-tab-panel>
 * ```
 *
 * `deferRendering` (default) instantiates a panel on first activation;
 * `keepAlive` (default) keeps it mounted — hidden — afterwards so its state
 * survives tab switches. Turn `keepAlive` off to destroy lazy content on
 * every deactivation.
 */
@Component({
  selector: 'oge-tab-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeTabStrip],
  host: {
    class: 'oge-tab-panel',
    '[class.oge-tab-panel-bottom]': "tabsPosition() === 'bottom'",
    '[class.oge-tab-panel-start]': "tabsPosition() === 'start'",
    '[class.oge-tab-panel-end]': "tabsPosition() === 'end'",
    '[class.oge-disabled]': 'disabled()',
  },
  template: `
    <oge-tab-strip
      [descriptors]="descriptors()"
      [selectedIndex]="selectedIndex()"
      [activation]="activation()"
      [orientation]="stripOrientation()"
      [disabled]="disabled()"
      [alignment]="tabAlignment()"
      [indicatorFit]="indicatorFit()"
      [showNavButtons]="showNavButtons()"
      [showTabListButton]="showTabListButton()"
      [allowReorder]="allowTabReordering()"
      [stylingMode]="stylingMode()"
      [size]="size()"
      [messages]="mergedMessages()"
      [closePendingIds]="closePendingIds()"
      [idPrefix]="uid"
      [hasPanels]="true"
      [ariaLabel]="ariaLabel()"
      (activate)="onStripActivate($event)"
      (focusSelect)="onStripFocusSelect($event)"
      (closeRequest)="onStripClose($event)"
      (reorderRequest)="onStripReorder($event)"
    />
    <div
      class="oge-tab-panel-content"
      [class.oge-tab-panel-animated]="panelAnimation() !== 'none'"
      [class.oge-tab-panel-anim-slide]="panelAnimation() === 'slide'"
      [class.oge-tab-anim-a]="animPhase() === 1"
      [class.oge-tab-anim-b]="animPhase() === 2"
      [class.oge-tab-panel-dynamic-height]="dynamicHeight()"
      [attr.data-anim-dir]="animDirection()"
      [style.block-size.px]="contentHeight()"
    >
      @for (d of descriptors(); track d.id; let i = $index) {
        <div
          #bodyEl
          class="oge-tab-panel-body"
          role="tabpanel"
          tabindex="0"
          [id]="uid + '-panel-' + d.id"
          [attr.aria-labelledby]="uid + '-tab-' + d.id"
          [hidden]="i !== selectedIndex()"
        >
          @if (shouldRender(d, i)) {
            @if (d.contentTemplate; as tpl) {
              <ng-container
                *ngTemplateOutlet="tpl; context: contentContext(d, i)"
              />
            }
          }
        </div>
      }
    </div>
    <div class="oge-tab-defs" hidden><ng-content /></div>
  `,
})
export class OgeTabPanel extends OgeTabsBase {
  /** Side the tab strip sits on — logical values, so RTL flips `start`/`end`. */
  readonly tabsPosition = input<OgeTabsPosition>('top');
  /** Instantiate a panel's content only when its tab first activates. */
  readonly deferRendering = input(true);
  /**
   * Keep once-rendered panels mounted (hidden) so their state survives tab
   * switches. `false` destroys lazy content on deactivation. Ignored while
   * `deferRendering` is `false` (everything stays rendered).
   */
  readonly keepAlive = input(true);
  /**
   * Transition played by the newly displayed panel. Duration comes from the
   * `--oge-tab-panel-transition` CSS variable (180ms) and is suppressed under
   * `prefers-reduced-motion`.
   */
  readonly panelAnimation = input<OgeTabPanelAnimation>('none');
  /**
   * Animates the content area between the heights of the outgoing and
   * incoming panel instead of jumping. Tracks async content through a
   * `ResizeObserver`.
   */
  readonly dynamicHeight = input(false);

  /** `start`/`end` strips render vertically. */
  protected readonly stripOrientation = computed<OgeTabsOrientation>(() => {
    const position = this.tabsPosition();
    return position === 'start' || position === 'end'
      ? 'vertical'
      : 'horizontal';
  });

  /** Ids of tabs whose content has been rendered at least once. */
  private readonly renderedIds = signal<ReadonlySet<string>>(new Set());

  private readonly bodies = viewChildren<ElementRef<HTMLElement>>('bodyEl');

  /**
   * Alternates 1 ↔ 2 on every selection change. The two phases map to two
   * identical keyframes, which is what restarts the CSS animation — a plain
   * class toggle would not replay it. `0` means "never animated yet".
   */
  private readonly _animPhase = signal(0);
  protected readonly animPhase = this._animPhase.asReadonly();

  private readonly _animDirection = signal<'forward' | 'backward'>('forward');
  protected readonly animDirection = this._animDirection.asReadonly();

  /** Measured height of the active panel; `null` disables the lock. */
  private readonly _contentHeight = signal<number | null>(null);
  protected readonly contentHeight = this._contentHeight.asReadonly();

  private lastIndex = -1;
  private observedBody: HTMLElement | null = null;

  constructor() {
    super();
    effect(() => {
      const id = this.descriptors()[this.selectedIndex()]?.id;
      if (id === undefined) return;
      const rendered = this.renderedIds();
      if (!rendered.has(id)) {
        const next = new Set(rendered);
        next.add(id);
        this.renderedIds.set(next);
      }
    });
    // Selection drives the animation phase; the first run only seeds the
    // baseline so the initial render never animates.
    effect(() => {
      const index = this.selectedIndex();
      untracked(() => {
        const previous = this.lastIndex;
        this.lastIndex = index;
        if (previous === -1 || this.panelAnimation() === 'none') return;
        this._animDirection.set(index >= previous ? 'forward' : 'backward');
        this._animPhase.update((phase) => (phase === 1 ? 2 : 1));
      });
    });

    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => this.measureHeight());
    afterNextRender(() => this.measureHeight());
    afterRenderEffect(() => {
      // Re-measure whenever the active panel or the feature toggle changes.
      this.selectedIndex();
      this.descriptors();
      this.dynamicHeight();
      this.measureHeight(resize);
    });
    inject(DestroyRef).onDestroy(() => resize?.disconnect());
  }

  /** Locks the content box to the active panel's height (or releases it). */
  private measureHeight(resize?: ResizeObserver | null): void {
    if (!this.dynamicHeight()) {
      this._contentHeight.set(null);
      return;
    }
    const active = this.bodies()[this.selectedIndex()]?.nativeElement ?? null;
    if (
      resize !== undefined &&
      resize !== null &&
      active !== this.observedBody
    ) {
      if (this.observedBody) resize.unobserve(this.observedBody);
      if (active) resize.observe(active);
      this.observedBody = active;
    }
    this._contentHeight.set(active ? active.offsetHeight : null);
  }

  protected shouldRender(d: OgeTabDescriptor, index: number): boolean {
    if (!this.deferRendering()) return true;
    if (index === this.selectedIndex()) return true;
    return this.keepAlive() && this.renderedIds().has(d.id);
  }

  protected contentContext(
    d: OgeTabDescriptor,
    index: number,
  ): OgeTabContentTemplateContext {
    return { $implicit: d.item, index };
  }
}
