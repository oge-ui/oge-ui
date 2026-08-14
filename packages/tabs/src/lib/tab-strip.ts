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
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { edgeEnabledIndex, stepEnabledIndex } from '@oge-ui/core';
import { OGE_TAB_DRAG_THRESHOLD } from '@oge-ui/behavior';
import {
  OgeAnchoredPanel,
  OgeMenuList,
  OgePopup,
  type OgeMenuCloseRequestEvent,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import type { OgeTabsMessages } from './config';
import type { OgeTabDescriptor } from './tab-descriptor';
import type {
  OgeTabHeaderTemplateContext,
  OgeTabsActivation,
  OgeTabsAlignment,
  OgeTabsIndicatorFit,
  OgeTabsNavButtonsMode,
  OgeTabsOrientation,
  OgeTabsSize,
  OgeTabsStylingMode,
} from './tabs-types';

/** A tab header was activated by pointer or keyboard (Enter/Space). */
export interface OgeTabStripActivateEvent {
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/** Focus moved by arrow/Home/End while `activation` is `automatic`. */
export interface OgeTabStripFocusSelectEvent {
  index: number;
  event: KeyboardEvent;
}

/** The close affordance was used (close button, Delete/Backspace). */
export interface OgeTabStripCloseEvent {
  index: number;
  event: Event;
}

/** A drag gesture requests moving a tab to a new display position. */
export interface OgeTabStripReorderEvent {
  fromIndex: number;
  toIndex: number;
}

/** Pixels of movement before a pointerdown becomes a drag. */
const DRAG_THRESHOLD = OGE_TAB_DRAG_THRESHOLD;

/**
 * Presentational tab strip shared by `oge-tabs` and `oge-tab-panel`: renders
 * the headers and owns focus/keyboard handling, overflow scrolling, the
 * all-tabs menu and the drag-reorder gesture. All state decisions (selection,
 * closing, order) stay with the owner — the strip only emits requests.
 * Module-internal (not exported from the package barrel).
 */
@Component({
  selector: 'oge-tab-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgePopup, OgeMenuList],
  styleUrl: './tabs.scss',
  host: {
    class: 'oge-tab-strip',
    '[class.oge-tab-strip-vertical]': "orientation() === 'vertical'",
    '[class.oge-tab-strip-secondary]': "stylingMode() === 'secondary'",
    '[class.oge-tab-strip-sm]': "size() === 'sm'",
    '[class.oge-tab-strip-lg]': "size() === 'lg'",
    '[class.oge-tab-strip-ink-content]': "indicatorFit() === 'content'",
    '[attr.data-alignment]': 'alignment()',
    '[class.oge-disabled]': 'disabled()',
  },
  template: `
    @if (navVisible()) {
      <button
        type="button"
        class="oge-tab-strip-nav oge-tab-strip-nav-back"
        [attr.aria-label]="messages().scrollBackward"
        [disabled]="!canScrollBack()"
        (click)="scrollStep(-1)"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m10 4-4 4 4 4" />
        </svg>
      </button>
    }
    <div class="oge-tab-strip-scroll" #scroller (scroll)="measure()">
      <div
        class="oge-tab-strip-list"
        role="tablist"
        [attr.aria-orientation]="
          orientation() === 'vertical' ? 'vertical' : null
        "
        [attr.aria-label]="ariaLabel() ?? null"
      >
        @for (d of descriptors(); track d.id; let i = $index) {
          <div
            #tabEl
            class="oge-tab"
            role="tab"
            [id]="tabDomId(d)"
            [class.oge-tab-selected]="i === selectedIndex()"
            [class.oge-tab-disabled]="isDisabled(d)"
            [class.oge-tab-dirty]="d.dirty"
            [class.oge-tab-close-pending]="closePendingIds().has(d.id)"
            [class.oge-tab-dragging]="dragSourceIndex() === i"
            [class.oge-tab-drop-target]="isDropTarget(i)"
            [attr.aria-selected]="i === selectedIndex()"
            [attr.aria-disabled]="isDisabled(d) ? true : null"
            [attr.aria-controls]="panelDomId(d)"
            [attr.data-tab-id]="d.id"
            [attr.title]="d.hint ?? null"
            [attr.aria-keyshortcuts]="d.closable ? 'Delete' : null"
            [tabindex]="d.id === focusTargetId() ? 0 : -1"
            (click)="onTabClick(i, $event)"
            (keydown)="onKeydown($event)"
            (focus)="focusedId.set(d.id)"
            (pointerdown)="onPointerDown(i, $event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp(i, $event)"
            (pointercancel)="onPointerCancel()"
          >
            @if (d.headerTemplate; as tpl) {
              <ng-container
                *ngTemplateOutlet="tpl; context: headerContext(d, i)"
              />
            } @else {
              <span class="oge-tab-text">{{ d.text }}</span>
            }
            @if (d.badge !== undefined) {
              <span class="oge-tab-badge">{{ d.badge }}</span>
            }
            @if (d.dirty) {
              <span
                class="oge-tab-dirty-dot"
                role="img"
                [attr.aria-label]="messages().dirty"
              ></span>
            }
            @if (d.closable) {
              <!--
                Deliberately a span, not a button: a focusable control inside
                role="tab" is a nested-interactive a11y violation (axe). The
                click is handled by the tab itself and the keyboard path is
                Delete/Backspace, announced via aria-keyshortcuts.
              -->
              <span
                class="oge-tab-close"
                aria-hidden="true"
                [title]="messages().closeTab"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="m4 4 8 8m0-8-8 8" />
                </svg>
              </span>
            }
          </div>
        }
      </div>
      @if (descriptors().length === 0) {
        <div class="oge-tab-strip-empty">{{ messages().noData }}</div>
      }
    </div>
    @if (navVisible()) {
      <button
        type="button"
        class="oge-tab-strip-nav oge-tab-strip-nav-forward"
        [attr.aria-label]="messages().scrollForward"
        [disabled]="!canScrollForward()"
        (click)="scrollStep(1)"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 4 4 4-4 4" />
        </svg>
      </button>
    }
    @if (showTabListButton()) {
      <button
        #menuButton
        type="button"
        class="oge-tab-strip-menu-btn"
        [attr.aria-label]="messages().tabListMenu"
        [attr.aria-haspopup]="'menu'"
        [attr.aria-expanded]="menuOpen()"
        [attr.aria-controls]="menuOpen() ? menuPanel.panelId : null"
        (click)="toggleMenu()"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      @if (menuOpen()) {
        <oge-popup [panel]="menuPanel">
          <oge-menu-list
            [items]="menuItems()"
            [ariaLabel]="messages().tabListMenu"
            (itemClick)="onMenuItemClick($event)"
            (closeRequest)="onMenuCloseRequest($event)"
          />
        </oge-popup>
      }
    }
  `,
})
export class OgeTabStrip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly descriptors = input.required<readonly OgeTabDescriptor[]>();
  readonly selectedIndex = input.required<number>();
  readonly activation = input<OgeTabsActivation>('automatic');
  readonly orientation = input<OgeTabsOrientation>('horizontal');
  readonly disabled = input(false);
  readonly alignment = input<OgeTabsAlignment>('start');
  readonly indicatorFit = input<OgeTabsIndicatorFit>('tab');
  readonly showNavButtons = input<OgeTabsNavButtonsMode>('auto');
  readonly showTabListButton = input(false);
  readonly allowReorder = input(false);
  readonly stylingMode = input<OgeTabsStylingMode>('primary');
  readonly size = input<OgeTabsSize>('md');
  readonly messages = input.required<OgeTabsMessages>();
  readonly closePendingIds = input.required<ReadonlySet<string>>();
  /** DOM id prefix of the owning component. */
  readonly idPrefix = input.required<string>();
  /** `true` when the owner renders tabpanels (`aria-controls` wiring). */
  readonly hasPanels = input(false);
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly activate = output<OgeTabStripActivateEvent>();
  readonly focusSelect = output<OgeTabStripFocusSelectEvent>();
  readonly closeRequest = output<OgeTabStripCloseEvent>();
  readonly reorderRequest = output<OgeTabStripReorderEvent>();

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly tabElements = viewChildren<ElementRef<HTMLElement>>('tabEl');
  private readonly menuButton =
    viewChild<ElementRef<HTMLElement>>('menuButton');
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });

  /** Id of the tab that last held focus — the roving-tabindex anchor. */
  protected readonly focusedId = signal<string | null>(null);

  protected readonly hasOverflow = signal(false);
  protected readonly canScrollBack = signal(false);
  protected readonly canScrollForward = signal(false);

  protected readonly menuOpen = signal(false);

  protected readonly dragSourceIndex = signal<number | null>(null);
  protected readonly dropTargetIndex = signal<number | null>(null);
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragFromIndex = -1;
  private dragActive = false;
  private suppressClick = false;
  private readonly onDragKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.dragActive) {
      event.stopPropagation();
      this.resetDrag();
    }
  };

  /** The single tab participating in the page Tab sequence. */
  protected readonly focusTargetId = computed<string | null>(() => {
    const ds = this.descriptors();
    if (ds.length === 0) return null;
    const focused = this.focusedId();
    const focusedTab = ds.find((d) => d.id === focused);
    if (focusedTab && !this.isDisabled(focusedTab)) return focusedTab.id;
    const selected = ds[this.selectedIndex()];
    if (selected && !this.isDisabled(selected)) return selected.id;
    return ds.find((d) => !this.isDisabled(d))?.id ?? null;
  });

  protected readonly navVisible = computed(() => {
    const mode = this.showNavButtons();
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    return this.hasOverflow();
  });

  protected readonly menuItems = computed<OgeMenuItem<number>[]>(() =>
    this.descriptors().map((d, i) => ({
      text: d.text,
      value: i,
      hint: d.hint,
      disabled: this.isDisabled(d),
      checked: i === this.selectedIndex() ? true : undefined,
    })),
  );

  readonly menuPanel = new OgeAnchoredPanel({
    anchor: () => this.menuButton()?.nativeElement ?? null,
    panel: () => this.popupRef()?.nativeElement ?? null,
    restoreFocus: () => this.menuButton()?.nativeElement.focus(),
    onClosed: () => this.menuOpen.set(false),
  });

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.measure());
        const scroller = this.scroller()?.nativeElement;
        if (scroller) observer.observe(scroller);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
      this.measure();
    });
    // Re-measure and keep the selected tab visible whenever tabs or
    // selection change.
    afterRenderEffect(() => {
      this.descriptors();
      const index = this.selectedIndex();
      this.measure();
      this.scrollToIndex(index);
    });
    this.destroyRef.onDestroy(() => {
      this.menuPanel.destroy();
      document.removeEventListener('keydown', this.onDragKeydown, true);
    });
  }

  /** Focuses the roving-tabindex target tab. */
  focusActiveTab(): void {
    const id = this.focusTargetId();
    if (id === null) return;
    this.elementFor(id)?.focus();
  }

  /** Scrolls the tab at `index` into view (no-op when already visible). */
  scrollToIndex(index: number): void {
    const el = this.tabElements()[index]?.nativeElement;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  /**
   * APG focus hand-off after a close: the following tab, or the preceding
   * one when the closed tab was last. Runs after the owner removed the tab.
   */
  handleClosedFocus(closedIndex: number): void {
    setTimeout(() => {
      const els = this.tabElements();
      if (els.length === 0) return;
      const target = Math.min(closedIndex, els.length - 1);
      const el = els[target]?.nativeElement;
      if (!el) return;
      const id = el.getAttribute('data-tab-id');
      if (id !== null) this.focusedId.set(id);
      el.focus();
    });
  }

  protected isDisabled(d: OgeTabDescriptor): boolean {
    return d.disabled || this.disabled();
  }

  protected isDropTarget(index: number): boolean {
    const from = this.dragSourceIndex();
    const to = this.dropTargetIndex();
    return from !== null && to !== null && to !== from && to === index;
  }

  protected tabDomId(d: OgeTabDescriptor): string {
    return `${this.idPrefix()}-tab-${d.id}`;
  }

  protected panelDomId(d: OgeTabDescriptor): string | null {
    return this.hasPanels() ? `${this.idPrefix()}-panel-${d.id}` : null;
  }

  protected headerContext(
    d: OgeTabDescriptor,
    index: number,
  ): OgeTabHeaderTemplateContext {
    return {
      $implicit: d.item,
      index,
      selected: index === this.selectedIndex(),
      text: d.text,
    };
  }

  protected onTabClick(index: number, event: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const d = this.descriptors()[index];
    if (!d || this.isDisabled(d)) return;
    // The ✕ is a presentational span inside the tab — resolve it from the
    // event target instead of giving it its own (nested-interactive) handler.
    if (this.isCloseTarget(event.target)) {
      this.closeRequest.emit({ index, event });
      return;
    }
    this.focusedId.set(d.id);
    this.activate.emit({ index, event });
  }

  private isCloseTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element && target.closest('.oge-tab-close') !== null
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    const ds = this.descriptors();
    if (ds.length === 0 || this.disabled()) return;
    const vertical = this.orientation() === 'vertical';
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const current = this.currentFocusIndex();

    if (event.key === 'Enter' || event.key === ' ') {
      const d = ds[current];
      if (d && !this.isDisabled(d)) {
        event.preventDefault();
        this.activate.emit({ index: current, event });
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const d = ds[current];
      if (d && d.closable && !this.isDisabled(d)) {
        event.preventDefault();
        this.closeRequest.emit({ index: current, event });
      }
      return;
    }

    let target: number | null = null;
    if (event.key === nextKey) target = this.step(current, 1);
    else if (event.key === prevKey) target = this.step(current, -1);
    else if (event.key === 'Home') target = this.edgeEnabled(1);
    else if (event.key === 'End') target = this.edgeEnabled(-1);
    if (target === null || target === current) {
      if (target !== null) event.preventDefault();
      return;
    }
    event.preventDefault();
    const d = ds[target];
    this.focusedId.set(d.id);
    this.elementFor(d.id)?.focus();
    this.scrollToIndex(target);
    if (this.activation() === 'automatic') {
      this.focusSelect.emit({ index: target, event });
    }
  }

  protected measure(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    const vertical = this.orientation() === 'vertical';
    const size = vertical ? el.clientHeight : el.clientWidth;
    const total = vertical ? el.scrollHeight : el.scrollWidth;
    const offset = Math.abs(vertical ? el.scrollTop : el.scrollLeft);
    this.hasOverflow.set(total > size + 1);
    this.canScrollBack.set(offset > 1);
    this.canScrollForward.set(offset < total - size - 1);
  }

  protected scrollStep(direction: 1 | -1): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    const vertical = this.orientation() === 'vertical';
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    const amount =
      (vertical ? el.clientHeight : el.clientWidth) * 0.75 * direction;
    if (vertical) {
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ top: amount, behavior: 'smooth' });
      } else {
        el.scrollTop += amount;
      }
    } else {
      const left = rtl ? -amount : amount;
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({ left, behavior: 'smooth' });
      } else {
        el.scrollLeft += left;
      }
    }
    this.measure();
  }

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.menuPanel.close('api');
      return;
    }
    this.menuOpen.set(true);
    this.menuPanel.open();
  }

  protected onMenuItemClick(event: OgeMenuListItemClickEvent): void {
    const index = event.item.value as number;
    this.menuPanel.close('select');
    this.activate.emit({ index, event: event.event });
  }

  protected onMenuCloseRequest(event: OgeMenuCloseRequestEvent): void {
    this.menuPanel.close(event.reason);
  }

  protected onPointerDown(index: number, event: PointerEvent): void {
    if (!this.allowReorder() || this.disabled() || event.button !== 0) return;
    if (this.isCloseTarget(event.target)) return;
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragFromIndex = index;
    this.dragActive = false;
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return;
    if (!this.dragActive) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      this.dragActive = true;
      this.dragSourceIndex.set(this.dragFromIndex);
      const target = event.target as HTMLElement | null;
      if (target && typeof target.setPointerCapture === 'function') {
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // jsdom / detached elements — capture is a progressive enhancement
        }
      }
      document.addEventListener('keydown', this.onDragKeydown, true);
    }
    this.dropTargetIndex.set(
      this.computeDropIndex(event.clientX, event.clientY),
    );
  }

  protected onPointerUp(_index: number, event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return;
    const wasDragging = this.dragActive;
    const from = this.dragFromIndex;
    const to = this.dropTargetIndex();
    this.resetDrag();
    if (!wasDragging) return;
    this.suppressClick = true;
    if (to !== null && to !== from) {
      this.reorderRequest.emit({ fromIndex: from, toIndex: to });
    }
  }

  protected onPointerCancel(): void {
    this.resetDrag();
  }

  private resetDrag(): void {
    this.dragPointerId = null;
    this.dragActive = false;
    this.dragFromIndex = -1;
    this.dragSourceIndex.set(null);
    this.dropTargetIndex.set(null);
    document.removeEventListener('keydown', this.onDragKeydown, true);
  }

  /** Index (in the resulting order) the dragged tab would land at. */
  private computeDropIndex(clientX: number, clientY: number): number {
    const els = this.tabElements();
    const vertical = this.orientation() === 'vertical';
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].nativeElement.getBoundingClientRect();
      const mid = vertical
        ? rect.top + rect.height / 2
        : rect.left + rect.width / 2;
      const pos = vertical ? clientY : clientX;
      const before = vertical || !rtl ? pos < mid : pos > mid;
      if (before) return i <= this.dragFromIndex ? i : i - 1;
    }
    return els.length - 1;
  }

  private currentFocusIndex(): number {
    const ds = this.descriptors();
    const focused = this.focusedId();
    const index = ds.findIndex((d) => d.id === focused);
    if (index !== -1) return index;
    return this.selectedIndex() >= 0 && this.selectedIndex() < ds.length
      ? this.selectedIndex()
      : 0;
  }

  /** Next enabled index from `start` in `direction`, wrapping; `null` if none. */
  private step(start: number, direction: 1 | -1): number | null {
    const ds = this.descriptors();
    return stepEnabledIndex(ds.length, start, direction, (i) =>
      this.isDisabled(ds[i]),
    );
  }

  /** First (`1`) or last (`-1`) enabled index; `null` when all disabled. */
  private edgeEnabled(direction: 1 | -1): number | null {
    const ds = this.descriptors();
    return edgeEnabledIndex(ds.length, direction, (i) =>
      this.isDisabled(ds[i]),
    );
  }

  private elementFor(id: string): HTMLElement | null {
    return (
      this.tabElements().find(
        (el) => el.nativeElement.getAttribute('data-tab-id') === id,
      )?.nativeElement ?? null
    );
  }
}
