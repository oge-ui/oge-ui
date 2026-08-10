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
  contentChild,
  contentChildren,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { fitToolbarItems } from '@oge-ui/core';
import {
  OGE_OVERLAY_CONFIG,
  OgeAnchoredPanel,
  OgeMenuList,
  OgePopup,
  type OgeMenuCloseRequestEvent,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import { OGE_BREADCRUMB_CONFIG, type OgeBreadcrumbMessages } from './config';
import { OgeBreadcrumbItem } from './breadcrumb-item';
import {
  OgeBreadcrumbItemTemplate,
  OgeBreadcrumbSeparatorTemplate,
} from './templates';
import type {
  OgeBreadcrumbCollapseMode,
  OgeBreadcrumbItemClickEvent,
  OgeBreadcrumbItemData,
} from './breadcrumb-types';

let nextBreadcrumbId = 0;

/** Estimated ellipsis-button size until the real element is measured. */
const ELLIPSIS_SIZE_FALLBACK = 44;

/** One normalized crumb: declarative children first, then `items`. */
interface BreadcrumbDescriptor {
  readonly id: string;
  readonly item: OgeBreadcrumbItemData;
}

/**
 * WAI-ARIA APG breadcrumb: a `<nav>` landmark holding an ordered list of
 * links, the current page carrying `aria-current="page"`. The APG defines no
 * keyboard behavior for it — crumbs are plain links in the Tab order, so
 * there is deliberately no roving tabindex here.
 *
 * ```html
 * <oge-breadcrumb [items]="trail" (itemClick)="go($event)" />
 * ```
 *
 * Declarative children come first, then `items` — the house merge order.
 *
 * `collapseMode: 'auto'` (default) collapses the **oldest middle** crumbs
 * into an ellipsis menu when the container runs out of room — the first and
 * last crumb always stay visible, and unlike the references the collapsed
 * crumbs remain reachable: the menu renders them as real links. The fitting
 * arithmetic is core's pure `fitToolbarItems`, measured against the
 * breadcrumb's **own container**, never the window.
 */
@Component({
  selector: 'oge-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeMenuList, OgePopup],
  host: {
    class: 'oge-breadcrumb',
    '[class.oge-breadcrumb-wrap]': "resolvedCollapseMode() === 'wrap'",
    '[class.oge-breadcrumb-scroll]': "resolvedCollapseMode() === 'none'",
  },
  styleUrl: './breadcrumb.scss',
  template: `
    <nav class="oge-breadcrumb-nav" [attr.aria-label]="msg().breadcrumb">
      <ol class="oge-breadcrumb-list">
        @for (
          d of descriptors();
          track d.id;
          let i = $index;
          let last = $last
        ) {
          @if (i === 1) {
            <!-- Always in the DOM so its size is measurable before it is
                 needed; visually parked while nothing is collapsed. -->
            <li
              #ellipsisEl
              class="oge-breadcrumb-li oge-breadcrumb-ellipsis-li"
              [class.oge-breadcrumb-li-parked]="!menuVisible()"
            >
              <ng-container *ngTemplateOutlet="separatorTpl; context: { i: i }" />
              <button
                #ellipsisBtn
                type="button"
                class="oge-breadcrumb-ellipsis"
                aria-haspopup="menu"
                [attr.aria-expanded]="panel.isOpen()"
                [attr.aria-label]="msg().collapsed"
                [attr.aria-controls]="panel.isOpen() ? panel.panelId : null"
                [tabindex]="menuVisible() ? 0 : -1"
                (click)="onEllipsisClick($event)"
                (keydown)="onEllipsisKeydown($event)"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="3" cy="8" r="1.3" />
                  <circle cx="8" cy="8" r="1.3" />
                  <circle cx="13" cy="8" r="1.3" />
                </svg>
              </button>
            </li>
          }
          <li
            #crumbEl
            class="oge-breadcrumb-li"
            [class.oge-breadcrumb-li-hidden]="collapsedSet().has(i)"
          >
            @if (i > 0) {
              <ng-container *ngTemplateOutlet="separatorTpl; context: { i: i }" />
            }
            @if (last || d.item.disabled) {
              <span
                class="oge-breadcrumb-item"
                [class.oge-breadcrumb-item-current]="last"
                [attr.aria-current]="last ? 'page' : null"
                [attr.aria-disabled]="!last && d.item.disabled ? 'true' : null"
                [attr.title]="d.item.hint ?? null"
              >
                <ng-container
                  *ngTemplateOutlet="
                    crumbContent;
                    context: { d: d, i: i, last: last }
                  "
                />
              </span>
            } @else if (d.item.url) {
              <a
                class="oge-breadcrumb-item oge-breadcrumb-interactive"
                [href]="d.item.url"
                [attr.title]="d.item.hint ?? null"
                (click)="onCrumbClick(d, i, $event)"
              >
                <ng-container
                  *ngTemplateOutlet="
                    crumbContent;
                    context: { d: d, i: i, last: last }
                  "
                />
              </a>
            } @else {
              <button
                type="button"
                class="oge-breadcrumb-item oge-breadcrumb-interactive"
                [attr.title]="d.item.hint ?? null"
                (click)="onCrumbClick(d, i, $event)"
              >
                <ng-container
                  *ngTemplateOutlet="
                    crumbContent;
                    context: { d: d, i: i, last: last }
                  "
                />
              </button>
            }
          </li>
        }
      </ol>
    </nav>
    <ng-template #separatorTpl let-i="i">
      <span class="oge-breadcrumb-separator" aria-hidden="true">
        @if (separatorTemplateDir(); as tpl) {
          <ng-container
            *ngTemplateOutlet="tpl.templateRef; context: { index: i }"
          />
        } @else {
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 4 4 4-4 4" />
          </svg>
        }
      </span>
    </ng-template>
    <ng-template #crumbContent let-d="d" let-i="i" let-last="last">
      @if (itemTemplateDir(); as tpl) {
        <ng-container
          *ngTemplateOutlet="
            tpl.templateRef;
            context: { $implicit: d.item, index: i, last: last }
          "
        />
      } @else {
        @if (d.item.icon) {
          <span class="oge-breadcrumb-item-icon">
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path [attr.d]="d.item.icon" />
            </svg>
          </span>
        } @else if (d.item.iconClass) {
          <span class="oge-breadcrumb-item-icon">
            <i [class]="d.item.iconClass" aria-hidden="true"></i>
          </span>
        }
        <span class="oge-breadcrumb-item-text">{{ d.item.text }}</span>
      }
    </ng-template>
    @if (menuItems().length) {
      <oge-popup [panel]="panel">
        <oge-menu-list
          [items]="menuItems()"
          [ariaLabel]="msg().collapsed"
          (itemClick)="onMenuItemClick($event)"
          (closeRequest)="onMenuCloseRequest($event)"
        />
      </oge-popup>
    }
  `,
})
export class OgeBreadcrumb {
  private readonly config = inject(OGE_BREADCRUMB_CONFIG);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generatedId = `oge-breadcrumb-${nextBreadcrumbId++}`;

  /** Data-driven trail, appended after any declarative children. */
  readonly items = input<readonly OgeBreadcrumbItemData[] | undefined>(
    undefined,
  );
  /**
   * `'auto'` (default) collapses the oldest middle crumbs into an ellipsis
   * menu against the **container** width; `'wrap'` breaks onto multiple
   * rows; `'none'` keeps one scrollable row.
   */
  readonly collapseMode = input<OgeBreadcrumbCollapseMode | undefined>(
    undefined,
  );
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<Partial<OgeBreadcrumbMessages> | undefined>(
    undefined,
  );

  /**
   * A crumb (link, button or collapsed menu row) was activated. Not fired by
   * disabled crumbs or by the last crumb — that is the current page.
   */
  readonly itemClick = output<OgeBreadcrumbItemClickEvent>();

  private readonly declaredItems = contentChildren(OgeBreadcrumbItem, {
    descendants: false,
  });
  protected readonly itemTemplateDir = contentChild(OgeBreadcrumbItemTemplate);
  protected readonly separatorTemplateDir = contentChild(
    OgeBreadcrumbSeparatorTemplate,
  );
  private readonly crumbEls = viewChildren<ElementRef<HTMLElement>>('crumbEl');
  private readonly ellipsisEl = viewChild<ElementRef<HTMLElement>>(
    'ellipsisEl',
  );
  private readonly ellipsisBtn = viewChild<ElementRef<HTMLElement>>(
    'ellipsisBtn',
  );
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly menuList = viewChild(OgeMenuList);

  protected readonly msg = computed<OgeBreadcrumbMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly resolvedCollapseMode =
    computed<OgeBreadcrumbCollapseMode>(
      () => this.collapseMode() ?? this.config.collapseMode ?? 'auto',
    );

  /** Declarative children first, then `items` — the house merge order. */
  protected readonly descriptors = computed<readonly BreadcrumbDescriptor[]>(
    () => {
      const fromChildren = this.declaredItems()
        .filter((child) => child.visible())
        .map((child) => ({
          id: child.key() ?? child.autoId,
          item: child.data(),
        }));
      const fromItems = (this.items() ?? [])
        .filter((item) => item.visible !== false)
        .map((item, index) => ({ id: item.key ?? `i${index}`, item }));
      return [...fromChildren, ...fromItems];
    },
  );

  private readonly containerSize = signal(0);
  /** Bumped after every measure pass so the fit recomputes over the cache. */
  private readonly measuredVersion = signal(0);
  private readonly sizeCache = new Map<string, number>();
  private ellipsisSize = 0;

  private readonly fitResult = computed(() => {
    this.measuredVersion();
    if (this.resolvedCollapseMode() !== 'auto') return null;
    const ds = this.descriptors();
    if (ds.length <= 2) return null; // first and last never collapse
    const container = this.containerSize();
    if (container <= 0) return null; // not measured yet: render complete
    const sizes = ds.map((d) => this.sizeCache.get(d.id));
    if (sizes.some((size) => size === undefined)) return null;
    return fitToolbarItems({
      containerSize: container,
      items: ds.map((d, index) => ({
        size: sizes[index] as number,
        // First and last always stay visible (the reference contract); the
        // lowest priority yields first, so the oldest middle crumb collapses
        // before the ones nearer the current page.
        policy: index === 0 || index === ds.length - 1 ? 'never' : 'auto',
        priority: index,
      })),
      menuButtonSize: this.ellipsisSize || ELLIPSIS_SIZE_FALLBACK,
    });
  });

  protected readonly collapsedSet = computed<ReadonlySet<number>>(
    () => new Set(this.fitResult()?.inMenu ?? []),
  );
  protected readonly menuVisible = computed(
    () => this.fitResult()?.menuVisible ?? false,
  );

  /** Collapsed crumbs as menu rows — `url` keeps them real links. */
  protected readonly menuItems = computed<readonly OgeMenuItem[]>(() => {
    if (!this.panelWanted()) return [];
    const ds = this.descriptors();
    return [...this.collapsedSet()]
      .sort((a, b) => a - b)
      .map((index) => ({
        text: ds[index].item.text,
        url: ds[index].item.url,
        icon: ds[index].item.icon,
        iconClass: ds[index].item.iconClass,
        disabled: ds[index].item.disabled,
        hint: ds[index].item.hint,
        value: index,
      }));
  });
  private readonly panelWanted = signal(false);

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = new OgeAnchoredPanel({
    anchor: () => this.ellipsisBtn()?.nativeElement ?? null,
    panel: () => this.popupRef()?.nativeElement ?? null,
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    restoreFocus: () => this.ellipsisBtn()?.nativeElement.focus(),
    onClosed: () => {
      this.pendingMenuFocus.set(null);
      this.panelWanted.set(false);
    },
  });

  private readonly pendingMenuFocus = signal<'first' | 'last' | null>(null);

  constructor() {
    // Focus the menu once it exists (keyboard opens) — drop-down precedent.
    afterRenderEffect(() => {
      const menu = this.menuList();
      const pending = this.pendingMenuFocus();
      if (menu && pending) {
        untracked(() => {
          menu.focus(pending);
          this.pendingMenuFocus.set(null);
        });
      }
    });
    // Re-measure whenever the trail itself changes.
    afterRenderEffect(() => {
      this.descriptors();
      this.resolvedCollapseMode();
      untracked(() => this.measure());
    });
    // Growing back above the threshold while the menu is open: nothing left
    // to show, so the panel closes before its content unmounts.
    afterRenderEffect(() => {
      const visible = this.menuVisible();
      untracked(() => {
        if (!visible && this.panel.isOpen()) this.panel.close('api');
      });
    });
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.measure());
        observer.observe(this.host.nativeElement);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
      this.measure();
    });
    this.destroyRef.onDestroy(() => this.panel.destroy());
  }

  /** Focuses the first interactive crumb (or the ellipsis when collapsed). */
  focus(): void {
    const target = this.host.nativeElement.querySelector<HTMLElement>(
      '.oge-breadcrumb-interactive, .oge-breadcrumb-ellipsis[tabindex="0"]',
    );
    target?.focus();
  }

  protected onCrumbClick(
    d: BreadcrumbDescriptor,
    index: number,
    event: MouseEvent,
  ): void {
    this.itemClick.emit({
      item: d.item,
      key: d.item.key,
      index,
      event,
    });
  }

  protected onEllipsisClick(event: MouseEvent): void {
    if (this.panel.isOpen()) {
      this.panel.close('api');
      return;
    }
    this.panelWanted.set(true);
    // Keyboard-synthesized clicks focus the menu; pointer clicks do not.
    if (event.detail === 0) this.pendingMenuFocus.set('first');
    this.panel.open();
  }

  protected onEllipsisKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.panelWanted.set(true);
      this.pendingMenuFocus.set(event.key === 'ArrowDown' ? 'first' : 'last');
      if (!this.panel.isOpen()) this.panel.open();
    }
  }

  protected onMenuItemClick(event: OgeMenuListItemClickEvent): void {
    const index = event.item.value as number;
    const d = this.descriptors()[index];
    if (!d) return;
    this.itemClick.emit({
      item: d.item,
      key: d.item.key,
      index,
      event: event.event,
    });
  }

  protected onMenuCloseRequest(event: OgeMenuCloseRequestEvent): void {
    if (event.reason === 'tab') {
      // Refocus the anchor before unmount so the browser tabs on from there.
      this.ellipsisBtn()?.nativeElement.focus();
    }
    this.panel.close(event.reason);
  }

  private measure(): void {
    this.containerSize.set(this.host.nativeElement.clientWidth);
    const ds = this.descriptors();
    this.crumbEls().forEach((ref, index) => {
      const width = ref.nativeElement.offsetWidth;
      const d = ds[index];
      // Hidden (collapsed) crumbs report 0 — keep their last real size.
      if (d && width > 0) this.sizeCache.set(d.id, width);
    });
    const ellipsisWidth = this.ellipsisEl()?.nativeElement.offsetWidth ?? 0;
    if (ellipsisWidth > 0) this.ellipsisSize = ellipsisWidth;
    this.measuredVersion.update((version) => version + 1);
  }
}
