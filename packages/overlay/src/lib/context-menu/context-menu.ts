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
  output,
  signal,
  untracked,
  viewChild,
  type ComponentRef,
} from '@angular/core';
import {
  isOgeContextMenuKey,
  ogeContextMenuApiTarget,
  ogeContextMenuPoint,
  ogeResolveContextMenuOpen,
  type OgeContextMenuOpeningEvent,
  type OgeContextMenuPoint,
  type OgeRect,
} from '@oge-ui/behavior';
import { OgeMenuList } from '../menu/menu-list';
import type {
  OgeMenuCloseRequestEvent,
  OgeMenuItem,
  OgeMenuListItemClickEvent,
} from '../menu/menu-types';
import { OgeAnchoredPanel } from '../panel/anchored-panel';
import { OgePopup } from '../popup/popup';

// The opening payload is framework-free and shared with the React layer.
export type { OgeContextMenuOpeningEvent } from '@oge-ui/behavior';

/**
 * Panel rendered by the `OgeContextMenu` directive: an anchored popup hosting
 * a menu list, appended to `document.body`. Internal; not exported from the
 * package barrel.
 */
@Component({
  selector: 'oge-context-menu-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgePopup, OgeMenuList],
  template: `
    @if (panel().isOpen()) {
      <oge-popup [panel]="panel()">
        <oge-menu-list
          [items]="items()"
          [ariaLabel]="ariaLabel()"
          (itemClick)="itemClick.emit($event)"
          (closeRequest)="closeRequest.emit($event)"
        />
      </oge-popup>
    }
  `,
})
export class OgeContextMenuPanel {
  readonly panel = input.required<OgeAnchoredPanel>();
  readonly items = input.required<readonly OgeMenuItem[]>();
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly itemClick = output<OgeMenuListItemClickEvent>();
  readonly closeRequest = output<OgeMenuCloseRequestEvent>();

  readonly menuList = viewChild(OgeMenuList);
}

/**
 * Right-click (and <kbd>Shift+F10</kbd>) context menu on any element, using
 * the canonical `OgeMenuItem` model:
 *
 * ```html
 * <div [ogeContextMenu]="rowMenu" (contextMenuItemClick)="onAction($event)">…</div>
 *
 * <!-- one menu for many rows: selector delegation + per-target items -->
 * <ul [ogeContextMenu]="[]" contextMenuTarget="li"
 *     (contextMenuOpening)="$event.items = menuFor($event.target)">…</ul>
 *
 * <!-- imperative -->
 * <div [ogeContextMenu]="rowMenu" #menu="ogeContextMenu">…</div>
 * <button type="button" (click)="menu.open($event)">More</button>
 * ```
 *
 * The menu opens at the pointer location (or anchored to the element for
 * keyboard invocations), takes focus with full menu keyboard support, closes
 * on outside click, Escape or activation, and restores focus to the target.
 * With `contextMenuTarget` one menu serves every element inside the host
 * matching the selector (`closest()`), and the cancelable
 * `contextMenuOpening` event lets the handler build the items per target.
 * The target resolution and the opening pipeline are `@oge-ui/behavior`'s
 * `ogeResolveContextMenuOpen`, shared with the React `<OgeContextMenu>`.
 */
@Directive({
  selector: '[ogeContextMenu]',
  exportAs: 'ogeContextMenu',
  host: {
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class OgeContextMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);

  /**
   * Menu items. An empty array leaves the browser menu in charge — unless a
   * `contextMenuOpening` handler builds the items per target.
   */
  readonly ogeContextMenu = input.required<readonly OgeMenuItem[]>();
  /** Accessible name of the menu. */
  readonly contextMenuAriaLabel = input<string | undefined>(undefined);
  /** Disables the menu without detaching the directive. */
  readonly contextMenuDisabled = input(false);
  /**
   * CSS selector delegating the menu to matching elements inside the host
   * (`closest()` from the clicked / focused element): requests outside every
   * match keep the browser menu, and the matched element becomes the
   * menu's anchor, `contextMenuOpening`'s `target` and the focus-return
   * point. Unset: the host itself is the target.
   */
  readonly contextMenuTarget = input<string | undefined>(undefined);

  /**
   * Cancelable, before every open (pointer, keyboard, `open()`): carries the
   * `target` element, the originating `event` and a writable `items` — assign
   * a new array to build the menu for this target; set `cancel` to keep it
   * closed.
   */
  readonly contextMenuOpening = output<OgeContextMenuOpeningEvent>();
  /** An enabled item was activated (click, Enter or Space). */
  readonly contextMenuItemClick = output<OgeMenuListItemClickEvent>();
  /** The menu opened (pointer, keyboard or `open()`). */
  readonly contextMenuOpened = output<void>();
  /** The menu closed for any reason. */
  readonly contextMenuClosed = output<void>();

  private componentRef: ComponentRef<OgeContextMenuPanel> | null = null;
  /** Pointer location of the open request; `null` anchors to the target. */
  private readonly point = signal<OgeContextMenuPoint | null>(null);
  /** The element the open menu is for (host, or the delegated match). */
  private activeTarget: Element | null = null;
  /** Items of the open menu (possibly built by `contextMenuOpening`). */
  private readonly activeItems = signal<readonly OgeMenuItem[]>([]);
  private pendingMenuFocus = false;

  private readonly panel = new OgeAnchoredPanel({
    anchor: () =>
      (this.activeTarget as HTMLElement | null) ?? this.host.nativeElement,
    panel: () =>
      this.componentRef?.location.nativeElement.querySelector('.oge-popup') ??
      null,
    placement: () => 'bottom-start',
    anchorRect: (): OgeRect | null => {
      const point = this.point();
      return point
        ? { top: point.y, left: point.x, width: 0, height: 0 }
        : null;
    },
    restoreFocus: () => this.focusTarget(),
    onClosed: () => {
      this.pendingMenuFocus = false;
      this.contextMenuClosed.emit();
    },
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      this.panel.destroy();
      if (this.componentRef) {
        const panelEl = this.componentRef.location.nativeElement;
        this.componentRef.destroy();
        panelEl.remove(); // createComponent hosts are never auto-removed
        this.componentRef = null;
      }
    });
    // Focus the menu once the panel has rendered and been measured.
    effect(() => {
      const measured = this.panel.position() !== null;
      untracked(() => {
        if (!measured || !this.pendingMenuFocus) return;
        this.pendingMenuFocus = false;
        this.componentRef?.instance.menuList()?.focus('first');
      });
    });
    // Keep items/label live on the detached panel while it exists. A live
    // `ogeContextMenu` change replaces the open menu's items, like before
    // per-target items existed.
    effect(() => {
      const items = this.ogeContextMenu();
      untracked(() => this.activeItems.set(items));
    });
    effect(() => {
      const items = this.activeItems();
      const label = this.contextMenuAriaLabel();
      untracked(() => {
        this.componentRef?.setInput('items', items);
        this.componentRef?.setInput('ariaLabel', label);
      });
    });
  }

  /** Opens at the pointer location, replacing the browser's native menu. */
  protected onContextMenu(event: MouseEvent): void {
    if (this.request(event.target, ogeContextMenuPoint(event), event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!isOgeContextMenuKey(event)) return;
    if (this.request(event.target, null, event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Opens the menu programmatically — at a viewport point (`open(x, y)`) or
   * at a pointer event's location (`open(event)`; a keyboard-synthesized
   * event anchors to the target). With `contextMenuTarget`, the target is the
   * match under the event / point. Runs `contextMenuOpening` like a
   * right-click.
   */
  open(x: number, y: number): void;
  open(event: MouseEvent): void;
  open(xOrEvent: number | MouseEvent, y = 0): void {
    const host = this.host.nativeElement;
    if (typeof xOrEvent === 'number') {
      const point = { x: xOrEvent, y };
      this.request(ogeContextMenuApiTarget(host, null, point), point, null);
      return;
    }
    const point = ogeContextMenuPoint(xOrEvent);
    this.request(
      ogeContextMenuApiTarget(host, xOrEvent.target, point),
      point,
      xOrEvent,
    );
  }

  /** Closes the menu programmatically. */
  close(): void {
    this.panel.close();
  }

  /** Runs an open request; `true` when the browser menu must stay closed. */
  private request(
    eventTarget: EventTarget | null,
    point: OgeContextMenuPoint | null,
    event: Event | null,
  ): boolean {
    const result = ogeResolveContextMenuOpen({
      host: this.host.nativeElement,
      eventTarget,
      selector: this.contextMenuTarget(),
      items: this.ogeContextMenu(),
      disabled: this.contextMenuDisabled(),
      event,
      emitOpening: (opening) => this.contextMenuOpening.emit(opening),
    });
    if (result.kind === 'ignored') return false;
    if (result.kind === 'cancelled') return true;
    this.activeTarget = result.target;
    this.activeItems.set(result.items);
    this.point.set(point);
    this.openMenu();
    return true;
  }

  private focusTarget(): void {
    const target = this.activeTarget as HTMLElement | null;
    if (target && typeof target.focus === 'function') target.focus();
    else this.host.nativeElement.focus();
  }

  private openMenu(): void {
    this.ensurePanel();
    if (this.panel.isOpen()) {
      // Re-invoked while open (second right-click): move to the new location.
      this.panel.updatePosition();
    } else {
      this.panel.open();
      this.contextMenuOpened.emit();
    }
    this.pendingMenuFocus = true;
  }

  private ensurePanel(): void {
    if (this.componentRef) return;
    this.componentRef = createComponent(OgeContextMenuPanel, {
      environmentInjector: this.envInjector,
    });
    this.componentRef.setInput('panel', this.panel);
    this.componentRef.setInput('items', this.activeItems());
    this.componentRef.setInput('ariaLabel', this.contextMenuAriaLabel());
    this.componentRef.instance.itemClick.subscribe((clickEvent) =>
      this.contextMenuItemClick.emit(clickEvent),
    );
    this.componentRef.instance.closeRequest.subscribe(
      (request: OgeMenuCloseRequestEvent) => this.panel.close(request.reason),
    );
    this.appRef.attachView(this.componentRef.hostView);
    document.body.appendChild(this.componentRef.location.nativeElement);
  }
}
