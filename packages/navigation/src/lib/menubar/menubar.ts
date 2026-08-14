import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  createTypeAheadBuffer,
  edgeEnabledIndex,
  isMenubarCompact,
  matchByPrefix,
  menubarBarKeys,
  menubarClosedReason,
  menubarDataDescriptors,
  menubarEventBase,
  menubarItemDomId,
  menubarPanelItems,
  menubarPanelLabel,
  menubarPanelPlacement,
  menubarPopupCloseReason,
  menubarStopDisabled,
  findMenubarItemPath,
  stepEnabledIndex,
  OGE_MENUBAR_HOVER_DELAY,
  type OgeMenubarDescriptorCore,
} from '@oge-ui/behavior';
import {
  OGE_OVERLAY_CONFIG,
  OgeAnchoredPanel,
  OgeMenuList,
  OgePopup,
  type OgeMenuCloseRequestEvent,
  type OgeMenuItemTemplateContext,
  type OgeMenuListItemClickEvent,
  type OgePopupCloseReason,
} from '@oge-ui/overlay';
import { OGE_MENUBAR_CONFIG, type OgeMenubarMessages } from './config';
import { OgeMenubarItem } from './menubar-item';
import { OgeMenubarItemTemplate } from './templates';
import type {
  OgeMenubarCloseReason,
  OgeMenubarCompactChangedEvent,
  OgeMenubarItemClickEvent,
  OgeMenubarItemData,
  OgeMenubarOpenMode,
  OgeMenubarOrientation,
  OgeMenubarSubmenuClosedEvent,
  OgeMenubarSubmenuClosingEvent,
  OgeMenubarSubmenuOpenedEvent,
  OgeMenubarSubmenuOpeningEvent,
} from './menubar-types';

let nextMenubarId = 0;

/**
 * One normalized top-level entry: declarative children first, then `items`.
 * The shape (and every decision made over it) is shared with the React
 * menubar through `@oge-ui/behavior`.
 */
type MenubarDescriptor = OgeMenubarDescriptorCore;

/**
 * WAI-ARIA APG menubar: a persistent bar of `role="menuitem"` entries with a
 * roving tabindex, whose submenus run on the shared overlay machinery
 * (`OgeAnchoredPanel` + `oge-menu-list`, nested levels included):
 *
 * ```html
 * <oge-menubar [items]="menu" (itemClick)="run($event)" />
 * ```
 *
 * Declarative children come first, then `items` — the house merge order:
 *
 * ```html
 * <oge-menubar>
 *   <oge-menubar-item text="File">
 *     <oge-menubar-item text="New" key="new" />
 *   </oge-menubar-item>
 * </oge-menubar>
 * ```
 *
 * Note the APG's own caveat: for plain site navigation a `<nav>` of links
 * (optionally with the disclosure pattern) is usually the better fit —
 * `role="menubar"` is for application-style command menus.
 *
 * Below `compactBelow` **container** pixels the whole bar collapses into a
 * hamburger button opening the full item tree as one nested menu.
 */
@Component({
  selector: 'oge-menubar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeMenuList, OgePopup],
  host: {
    class: 'oge-menubar',
    '[class.oge-menubar-vertical]': "resolvedOrientation() === 'vertical'",
    '[class.oge-menubar-compact]': 'compact()',
    '[class.oge-menubar-disabled]': 'disabled()',
    '(keydown)': 'onHostKeydown($event)',
  },
  styleUrl: './menubar.scss',
  template: `
    @if (compact()) {
      <button
        #hamburgerBtn
        type="button"
        class="oge-menubar-hamburger"
        aria-haspopup="menu"
        [attr.aria-expanded]="openSource() === 'hamburger'"
        [attr.aria-label]="msg().hamburger"
        [attr.aria-controls]="
          openSource() === 'hamburger' ? panel.panelId : null
        "
        [disabled]="disabled()"
        (click)="onHamburgerClick($event)"
        (keydown)="onHamburgerKeydown($event)"
      >
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>
    } @else {
      <div
        class="oge-menubar-bar"
        role="menubar"
        [attr.aria-label]="msg().menubar"
        [attr.aria-orientation]="
          resolvedOrientation() === 'vertical' ? 'vertical' : null
        "
      >
        @for (d of descriptors(); track d.id; let i = $index) {
          @if (d.item.separator) {
            <span
              class="oge-menubar-separator"
              role="separator"
              [attr.aria-orientation]="
                resolvedOrientation() === 'vertical' ? 'horizontal' : 'vertical'
              "
            ></span>
          } @else if (d.item.url && !d.item.items?.length) {
            <a
              class="oge-menubar-item"
              role="menuitem"
              [id]="itemDomId(i)"
              [href]="d.item.url"
              [class.oge-menubar-item-active]="isActive(d)"
              [attr.aria-current]="isActive(d) ? 'page' : null"
              [attr.aria-disabled]="
                disabled() || d.item.disabled ? 'true' : null
              "
              [attr.title]="d.item.hint ?? null"
              [tabindex]="i === focusTarget() ? 0 : -1"
              (click)="onBarItemClick(i, $event)"
              (keydown)="onBarKeydown($event, i)"
              (focus)="focusIndex.set(i)"
              (pointerenter)="onBarItemEnter(i)"
              (pointerleave)="clearRootHoverTimer()"
            >
              <ng-container
                *ngTemplateOutlet="barItemContent; context: { d: d, i: i }"
              />
            </a>
          } @else {
            <button
              type="button"
              class="oge-menubar-item"
              role="menuitem"
              [id]="itemDomId(i)"
              [class.oge-menubar-item-active]="isActive(d)"
              [attr.aria-current]="isActive(d) ? 'page' : null"
              [attr.aria-disabled]="d.item.disabled ? 'true' : null"
              [attr.aria-haspopup]="d.item.items?.length ? 'menu' : null"
              [attr.aria-expanded]="
                d.item.items?.length
                  ? openSource() === 'bar' && openIndex() === i
                    ? 'true'
                    : 'false'
                  : null
              "
              [attr.aria-controls]="
                openSource() === 'bar' && openIndex() === i
                  ? panel.panelId
                  : null
              "
              [attr.title]="d.item.hint ?? null"
              [disabled]="disabled() || (d.item.disabled ?? false)"
              [tabindex]="i === focusTarget() ? 0 : -1"
              (click)="onBarItemClick(i, $event)"
              (keydown)="onBarKeydown($event, i)"
              (focus)="focusIndex.set(i)"
              (pointerenter)="onBarItemEnter(i)"
              (pointerleave)="clearRootHoverTimer()"
            >
              <ng-container
                *ngTemplateOutlet="barItemContent; context: { d: d, i: i }"
              />
            </button>
          }
        }
      </div>
    }
    <ng-template #barItemContent let-d="d" let-i="i">
      @if (itemTemplateDir(); as tpl) {
        <ng-container
          *ngTemplateOutlet="
            tpl.templateRef;
            context: { $implicit: d.item, index: i }
          "
        />
      } @else {
        @if (d.item.icon) {
          <span class="oge-menubar-item-icon">
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
          <span class="oge-menubar-item-icon">
            <i [class]="d.item.iconClass" aria-hidden="true"></i>
          </span>
        }
        <span class="oge-menubar-item-text">{{ d.item.text }}</span>
        @if (d.item.badge !== undefined) {
          <span class="oge-menubar-item-badge">{{ d.item.badge }}</span>
        }
      }
      @if (d.item.items?.length) {
        <span class="oge-menubar-item-caret" aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </span>
      }
    </ng-template>
    @if (panelItems().length) {
      <oge-popup [panel]="panel">
        <oge-menu-list
          [items]="panelItems()"
          [ariaLabel]="panelLabel()"
          [itemTemplate]="submenuItemTemplate()"
          (itemClick)="onMenuItemClick($event)"
          (closeRequest)="onMenuCloseRequest($event)"
        />
      </oge-popup>
    }
  `,
})
export class OgeMenubar {
  private readonly config = inject(OGE_MENUBAR_CONFIG);
  private readonly overlayConfig = inject(OGE_OVERLAY_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generatedId = `oge-menubar-${nextMenubarId++}`;

  /** Data-driven items, appended after any declarative children. */
  readonly items = input<readonly OgeMenubarItemData[] | undefined>(undefined);
  /** `'horizontal'` (default) or a vertical bar with swapped arrow keys. */
  readonly orientation = input<OgeMenubarOrientation | undefined>(undefined);
  /** How top-level submenus open; nested levels always open on hover. */
  readonly openMode = input<OgeMenubarOpenMode | undefined>(undefined);
  /** Hover dwell before a top-level submenu opens in `'hover'` mode, ms. */
  readonly hoverDelay = input<number | undefined>(undefined);
  /**
   * Below this **container** inline size the bar collapses into a hamburger.
   * Measured against the menubar's own box, never the window.
   */
  readonly compactBelow = input<number | undefined>(undefined);
  /** The item `key` rendered with `aria-current="page"` (router-driven). */
  readonly activeKey = input<string | undefined>(undefined);
  /** Disables the whole bar: items go inert and leave the Tab sequence. */
  readonly disabled = input(false);
  /**
   * Custom rendering for submenu rows at every depth — the shared
   * `oge-menu-list` context. Top-level bar items use
   * `[ogeMenubarItemTemplate]` instead.
   */
  readonly submenuItemTemplate = input<
    TemplateRef<OgeMenuItemTemplateContext> | undefined
  >(undefined);
  /** Per-instance overrides of user-facing strings. */
  readonly messages = input<Partial<OgeMenubarMessages> | undefined>(undefined);

  /** Fires when a leaf item is activated, at any depth. */
  readonly itemClick = output<OgeMenubarItemClickEvent>();
  /** Cancelable — set `cancel` to keep the submenu closed. */
  readonly submenuOpening = output<OgeMenubarSubmenuOpeningEvent>();
  readonly submenuOpened = output<OgeMenubarSubmenuOpenedEvent>();
  /** Cancelable — set `cancel` to keep the submenu open. */
  readonly submenuClosing = output<OgeMenubarSubmenuClosingEvent>();
  readonly submenuClosed = output<OgeMenubarSubmenuClosedEvent>();
  /** The bar collapsed into (or recovered from) the compact hamburger. */
  readonly compactChanged = output<OgeMenubarCompactChangedEvent>();

  private readonly declaredItems = contentChildren(OgeMenubarItem, {
    descendants: false,
  });
  protected readonly itemTemplateDir = contentChild(OgeMenubarItemTemplate);
  private readonly menuList = viewChild(OgeMenuList);
  private readonly popupRef = viewChild(OgePopup, { read: ElementRef });
  private readonly hamburgerBtn =
    viewChild<ElementRef<HTMLElement>>('hamburgerBtn');

  protected readonly msg = computed<OgeMenubarMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly resolvedOrientation = computed<OgeMenubarOrientation>(
    () => this.orientation() ?? this.config.orientation ?? 'horizontal',
  );
  private readonly resolvedOpenMode = computed<OgeMenubarOpenMode>(
    () => this.openMode() ?? this.config.openMode ?? 'click',
  );
  private readonly resolvedHoverDelay = computed(
    () =>
      this.hoverDelay() ?? this.config.hoverDelay ?? OGE_MENUBAR_HOVER_DELAY,
  );

  /** Declarative children first, then `items` — the house merge order. */
  protected readonly descriptors = computed<readonly MenubarDescriptor[]>(
    () => {
      const fromChildren = this.declaredItems()
        .filter((child) => child.visible())
        .map((child) => ({
          id: child.key() ?? child.autoId,
          item: child.data(),
        }));
      return [...fromChildren, ...menubarDataDescriptors(this.items())];
    },
  );

  /** Roving-tabindex anchor among the top-level items. */
  protected readonly focusIndex = signal(0);
  protected readonly focusTarget = computed(() => {
    const ds = this.descriptors();
    const index = this.focusIndex();
    if (index >= 0 && index < ds.length && !this.stopDisabled(index)) {
      return index;
    }
    return edgeEnabledIndex(ds.length, 1, (i) => this.stopDisabled(i)) ?? -1;
  });

  /** What the single anchored panel currently shows. */
  protected readonly openSource = signal<'bar' | 'hamburger' | null>(null);
  /** Bar item whose submenu is open; `-1` when none (or hamburger mode). */
  protected readonly openIndex = signal(-1);

  private readonly containerSize = signal(0);
  protected readonly compact = computed(() =>
    isMenubarCompact(
      this.containerSize(),
      this.compactBelow() ?? this.config.compactBelow,
    ),
  );

  protected readonly panelItems = computed<readonly OgeMenubarItemData[]>(() =>
    menubarPanelItems(this.descriptors(), this.openSource(), this.openIndex()),
  );
  protected readonly panelLabel = computed(() =>
    menubarPanelLabel(
      this.descriptors(),
      this.openSource(),
      this.openIndex(),
      this.msg().hamburger,
    ),
  );

  /** Anchored-panel model — public so templates/tests can read `panelId`. */
  readonly panel = new OgeAnchoredPanel({
    anchor: () => {
      if (this.openSource() === 'hamburger') {
        return this.hamburgerBtn()?.nativeElement ?? null;
      }
      const index = this.openIndex();
      return index >= 0 ? document.getElementById(this.itemDomId(index)) : null;
    },
    panel: () => this.popupRef()?.nativeElement ?? null,
    placement: () =>
      menubarPanelPlacement(this.openSource(), this.resolvedOrientation()),
    offset: () => this.overlayConfig.offset,
    viewportPadding: () => this.overlayConfig.viewportPadding,
    restoreFocus: () => this.focusPanelAnchor(),
    onClosed: (reason) => this.onPanelClosed(reason),
  });

  private readonly typeAheadBuffer = createTypeAheadBuffer(
    this.overlayConfig.typeAheadMs,
  );
  private readonly pendingMenuFocus = signal<'first' | 'last' | null>(null);
  private pendingCloseReason: OgeMenubarCloseReason | null = null;
  private rootHoverTimer: ReturnType<typeof setTimeout> | null = null;
  private previousCompact: boolean | null = null;

  constructor() {
    // Focus the menu once it exists (keyboard opens). After the DOM renders,
    // not in a plain effect: switching bar items keeps the same list instance
    // alive with NEW items, and focusing before the items input lands would
    // set an active index the linkedSignal reset then wipes.
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
    // Collapsing/recovering closes any open menu — the anchor is about to
    // disappear — and notifies the application.
    effect(() => {
      const compact = this.compact();
      untracked(() => {
        if (this.previousCompact === null) {
          this.previousCompact = compact;
          return;
        }
        if (compact === this.previousCompact) return;
        this.previousCompact = compact;
        if (this.panel.isOpen()) this.panel.close('api');
        this.compactChanged.emit({ compact });
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
    this.destroyRef.onDestroy(() => {
      this.clearRootHoverTimer();
      this.panel.destroy();
    });
  }

  /** Opens the submenu of a top-level item, by index or `key`. */
  open(target: number | string): void {
    const index =
      typeof target === 'number'
        ? target
        : this.descriptors().findIndex((d) => d.item.key === target);
    if (index >= 0) this.openSubmenu(index, null);
  }

  /** Closes any open submenu (cancelable, `reason: 'api'`). */
  close(): void {
    this.closeSubmenu('api');
  }

  /** Focuses the bar's roving tab target (or the hamburger when compact). */
  focus(): void {
    if (this.compact()) {
      this.hamburgerBtn()?.nativeElement.focus();
      return;
    }
    const target = this.focusTarget();
    if (target >= 0) this.focusItem(target);
  }

  protected itemDomId(index: number): string {
    return menubarItemDomId(this.generatedId, index);
  }

  protected isActive(d: MenubarDescriptor): boolean {
    const key = this.activeKey();
    return key !== undefined && d.item.key === key;
  }

  protected onBarItemClick(index: number, event: MouseEvent): void {
    const d = this.descriptors()[index];
    if (!d || d.item.disabled || this.disabled()) {
      event.preventDefault();
      return;
    }
    this.focusIndex.set(index);
    if (d.item.items?.length) {
      event.preventDefault();
      if (this.openSource() === 'bar' && this.openIndex() === index) {
        this.closeSubmenu('api');
      } else {
        // Keyboard-synthesized clicks (Enter/Space on the button) focus the
        // menu; pointer clicks leave focus on the bar item.
        this.openSubmenu(index, event.detail === 0 ? 'first' : null, event);
      }
      return;
    }
    this.itemClick.emit({
      item: d.item,
      key: d.item.key,
      index,
      path: [index],
      event,
    });
    d.item.action?.();
    if (this.panel.isOpen()) this.closeSubmenu('select');
  }

  protected onBarItemEnter(index: number): void {
    const d = this.descriptors()[index];
    if (!d || d.item.disabled || d.item.separator || this.disabled()) return;
    this.clearRootHoverTimer();
    const childful = !!d.item.items?.length;
    if (this.openSource() === 'bar' && this.panel.isOpen()) {
      // A menu is showing: hovering siblings switches without a click.
      if (index === this.openIndex()) return;
      if (childful) this.openSubmenu(index, null);
      else this.closeSubmenu('navigation');
      return;
    }
    if (this.resolvedOpenMode() === 'hover' && childful) {
      this.rootHoverTimer = setTimeout(
        () => this.openSubmenu(index, null),
        this.resolvedHoverDelay(),
      );
    }
  }

  protected onBarKeydown(event: KeyboardEvent, index: number): void {
    const key = event.key;
    const d = this.descriptors()[index];
    const {
      next: nextKey,
      prev: prevKey,
      open: openKey,
      openLast: openLastKey,
    } = menubarBarKeys(this.resolvedOrientation(), this.isRtl());

    if (key === nextKey || key === prevKey) {
      event.preventDefault();
      event.stopPropagation();
      this.moveBarFocus(index, key === nextKey ? 1 : -1);
      return;
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      const ds = this.descriptors();
      const target = edgeEnabledIndex(ds.length, key === 'Home' ? 1 : -1, (i) =>
        this.stopDisabled(i),
      );
      if (target !== null) this.focusItem(target);
      return;
    }
    if (d?.item.items?.length && (key === openKey || key === openLastKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.openSubmenu(index, key === openLastKey ? 'last' : 'first', event);
      return;
    }
    if (key === 'Escape') {
      if (this.panel.isOpen()) {
        event.preventDefault();
        event.stopPropagation();
        this.closeSubmenu('escape');
      }
      return;
    }
    if (key === 'Tab') {
      // Leaving the bar closes everything; no preventDefault — the browser
      // continues tabbing from here.
      if (this.panel.isOpen()) this.closeSubmenu('tab');
      return;
    }
    if (key === ' ' && !d?.item.items?.length && d?.item.url) {
      // Space activates a link menuitem too (APG); Enter is native.
      event.preventDefault();
      (event.target as HTMLElement | null)?.click();
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const ds = this.descriptors();
      const match = matchByPrefix(
        ds.map((desc) => desc.item.text),
        this.typeAheadBuffer.push(key),
        index,
        (i) => this.stopDisabled(i),
      );
      if (match !== null) {
        event.preventDefault();
        event.stopPropagation();
        this.focusItem(match);
        if (this.panel.isOpen() && this.openSource() === 'bar') {
          this.followFocusWhileOpen(match);
        }
      }
    }
  }

  /**
   * Keys the menu lists deliberately let bubble: ArrowRight on a leaf row
   * (any depth) hops to the next bar item, ArrowLeft escaping the level-1
   * list hops to the previous one — both reopening when a menu was showing
   * (APG). Only meaningful while a bar submenu is open.
   */
  protected onHostKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest?.('.oge-menu-list')) return;
    if (this.openSource() !== 'bar' || !this.panel.isOpen()) return;
    const orientation = this.resolvedOrientation();
    const horizontal = orientation !== 'vertical';
    const keys = menubarBarKeys(orientation, this.isRtl());
    if (!horizontal) {
      // Vertical bar: the level-1 list's ArrowLeft means "back to the bar".
      if (event.key === keys.back) {
        event.preventDefault();
        event.stopPropagation();
        const index = this.openIndex();
        this.closeSubmenu('navigation');
        if (index >= 0) this.focusItem(index);
      }
      return;
    }
    const forward = event.key === keys.next;
    const backward = event.key === keys.prev;
    if (!forward && !backward) return;
    event.preventDefault();
    event.stopPropagation();
    this.hopBarSibling(forward ? 1 : -1);
  }

  protected onHamburgerClick(event: MouseEvent): void {
    if (this.openSource() === 'hamburger' && this.panel.isOpen()) {
      this.closeSubmenu('api');
    } else {
      this.openHamburger(event, event.detail === 0 ? 'first' : null);
    }
  }

  protected onHamburgerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.openHamburger(event, event.key === 'ArrowDown' ? 'first' : 'last');
      return;
    }
    if (event.key === 'Escape' && this.panel.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeSubmenu('escape');
      return;
    }
    if (event.key === 'Tab' && this.panel.isOpen()) {
      this.closeSubmenu('tab');
    }
  }

  protected onMenuItemClick(event: OgeMenuListItemClickEvent): void {
    const item = event.item as OgeMenubarItemData;
    const base = this.openSource() === 'bar' ? [this.openIndex()] : [];
    const inTree = findMenubarItemPath(this.panelItems(), item);
    const path = inTree ? [...base, ...inTree] : [...base, event.index];
    this.itemClick.emit({
      item,
      key: item.key,
      index: path[path.length - 1],
      path,
      event: event.event,
    });
  }

  protected onMenuCloseRequest(event: OgeMenuCloseRequestEvent): void {
    if (event.reason === 'escape') {
      this.closeSubmenu('escape');
      return;
    }
    if (event.reason === 'select') {
      this.closeSubmenu('select');
      return;
    }
    if (event.reason === 'tab') {
      // Refocus the anchor before unmount so the browser tabs on from there.
      this.focusPanelAnchor();
      this.closeSubmenu('tab');
    }
    // 'back' never reaches the root: nested levels absorb it.
  }

  protected clearRootHoverTimer(): void {
    if (this.rootHoverTimer !== null) {
      clearTimeout(this.rootHoverTimer);
      this.rootHoverTimer = null;
    }
  }

  /** Writing direction of the host, read live so RTL needs no input. */
  private isRtl(): boolean {
    return getComputedStyle(this.host.nativeElement).direction === 'rtl';
  }

  private stopDisabled(index: number): boolean {
    return menubarStopDisabled(this.descriptors(), index, this.disabled());
  }

  private focusItem(index: number): void {
    this.focusIndex.set(index);
    document.getElementById(this.itemDomId(index))?.focus();
  }

  private moveBarFocus(from: number, direction: 1 | -1): void {
    const ds = this.descriptors();
    const next = stepEnabledIndex(ds.length, from, direction, (i) =>
      this.stopDisabled(i),
    );
    if (next === null) return;
    this.focusItem(next);
    if (this.panel.isOpen() && this.openSource() === 'bar') {
      this.followFocusWhileOpen(next);
    }
  }

  /** A menu was showing: the newly focused bar item shows its own (APG). */
  private followFocusWhileOpen(index: number): void {
    const d = this.descriptors()[index];
    if (d?.item.items?.length) this.openSubmenu(index, null);
    else this.closeSubmenu('navigation');
  }

  private hopBarSibling(direction: 1 | -1): void {
    const ds = this.descriptors();
    const next = stepEnabledIndex(ds.length, this.openIndex(), direction, (i) =>
      this.stopDisabled(i),
    );
    if (next === null) return;
    const d = ds[next];
    if (d.item.items?.length) {
      this.focusIndex.set(next);
      this.openSubmenu(next, 'first');
      document.getElementById(this.itemDomId(next))?.focus({
        preventScroll: true,
      });
    } else {
      this.closeSubmenu('navigation');
      this.focusItem(next);
    }
  }

  private openSubmenu(
    index: number,
    focus: 'first' | 'last' | null,
    event?: Event,
  ): void {
    const d = this.descriptors()[index];
    if (!d || d.item.disabled || !d.item.items?.length || this.disabled()) {
      return;
    }
    this.clearRootHoverTimer();
    if (
      this.openSource() === 'bar' &&
      this.openIndex() === index &&
      this.panel.isOpen()
    ) {
      if (focus) this.pendingMenuFocus.set(focus);
      return;
    }
    const pre: OgeMenubarSubmenuOpeningEvent = {
      item: d.item,
      key: d.item.key,
      path: [index],
      cancel: false,
      event,
    };
    this.submenuOpening.emit(pre);
    if (pre.cancel) return;
    const wasOpen = this.panel.isOpen();
    if (wasOpen) {
      // Switching siblings: the previous submenu closes without the panel
      // ever unmounting, so its events are emitted here.
      const prev = this.eventBase();
      const preClose: OgeMenubarSubmenuClosingEvent = {
        ...prev,
        reason: 'navigation',
        cancel: false,
      };
      this.submenuClosing.emit(preClose);
      if (preClose.cancel) return;
      this.submenuClosed.emit({ ...prev, reason: 'navigation' });
    }
    this.openSource.set('bar');
    this.openIndex.set(index);
    this.focusIndex.set(index);
    if (focus) this.pendingMenuFocus.set(focus);
    if (wasOpen) this.panel.updatePosition();
    else this.panel.open();
    this.submenuOpened.emit({ item: d.item, key: d.item.key, path: [index] });
  }

  private openHamburger(event: Event, focus: 'first' | 'last' | null): void {
    if (this.disabled()) return;
    if (this.openSource() === 'hamburger' && this.panel.isOpen()) {
      if (focus) this.pendingMenuFocus.set(focus);
      return;
    }
    const pre: OgeMenubarSubmenuOpeningEvent = {
      path: [],
      cancel: false,
      event,
    };
    this.submenuOpening.emit(pre);
    if (pre.cancel) return;
    this.openSource.set('hamburger');
    this.openIndex.set(-1);
    if (focus) this.pendingMenuFocus.set(focus);
    this.panel.open();
    this.submenuOpened.emit({ path: [] });
  }

  private closeSubmenu(reason: OgeMenubarCloseReason): void {
    if (!this.panel.isOpen()) return;
    if (reason !== 'tab') {
      const pre: OgeMenubarSubmenuClosingEvent = {
        ...this.eventBase(),
        reason,
        cancel: false,
      };
      this.submenuClosing.emit(pre);
      if (pre.cancel) return;
    }
    this.pendingCloseReason = reason;
    this.panel.close(menubarPopupCloseReason(reason));
  }

  private onPanelClosed(reason: OgePopupCloseReason): void {
    const mapped = menubarClosedReason(this.pendingCloseReason, reason);
    this.pendingCloseReason = null;
    const base = this.eventBase();
    this.openSource.set(null);
    this.openIndex.set(-1);
    this.pendingMenuFocus.set(null);
    this.submenuClosed.emit({ ...base, reason: mapped });
  }

  private eventBase(): {
    item?: OgeMenubarItemData;
    key?: string;
    path: readonly number[];
  } {
    return menubarEventBase(
      this.descriptors(),
      this.openSource(),
      this.openIndex(),
    );
  }

  private focusPanelAnchor(): void {
    if (this.openSource() === 'hamburger') {
      this.hamburgerBtn()?.nativeElement.focus();
      return;
    }
    const index = this.openIndex();
    if (index >= 0) this.focusItem(index);
  }

  private measure(): void {
    this.containerSize.set(this.host.nativeElement.clientWidth);
  }
}
