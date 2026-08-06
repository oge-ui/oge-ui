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
import { OgeMenuList } from '../menu/menu-list';
import type {
  OgeMenuCloseRequestEvent,
  OgeMenuItem,
  OgeMenuListItemClickEvent,
} from '../menu/menu-types';
import { OgeAnchoredPanel } from '../panel/anchored-panel';
import { OgePopup } from '../popup/popup';
import type { OgeRect } from '../position/position';

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
 * ```
 *
 * The menu opens at the pointer location (or anchored to the element for
 * keyboard invocations), takes focus with full menu keyboard support, closes
 * on outside click, Escape or activation, and restores focus to the host.
 */
@Directive({
  selector: '[ogeContextMenu]',
  host: {
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class OgeContextMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);

  /** Menu items. An empty array disables the menu. */
  readonly ogeContextMenu = input.required<readonly OgeMenuItem[]>();
  /** Accessible name of the menu. */
  readonly contextMenuAriaLabel = input<string | undefined>(undefined);
  /** Disables the menu without detaching the directive. */
  readonly contextMenuDisabled = input(false);

  /** An enabled item was activated (click, Enter or Space). */
  readonly contextMenuItemClick = output<OgeMenuListItemClickEvent>();
  /** The menu opened (pointer or keyboard). */
  readonly contextMenuOpened = output<void>();
  /** The menu closed for any reason. */
  readonly contextMenuClosed = output<void>();

  private componentRef: ComponentRef<OgeContextMenuPanel> | null = null;
  /** Pointer location of the last right-click; `null` for keyboard opens. */
  private readonly point = signal<{ x: number; y: number } | null>(null);
  private pendingMenuFocus = false;

  private readonly panel = new OgeAnchoredPanel({
    anchor: () => this.host.nativeElement,
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
    restoreFocus: () => this.host.nativeElement.focus(),
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
    // Keep items/label live on the detached panel while it exists.
    effect(() => {
      const items = this.ogeContextMenu();
      const label = this.contextMenuAriaLabel();
      untracked(() => {
        this.componentRef?.setInput('items', items);
        this.componentRef?.setInput('ariaLabel', label);
      });
    });
  }

  /** Opens at the pointer location, replacing the browser's native menu. */
  protected onContextMenu(event: MouseEvent): void {
    if (this.contextMenuDisabled() || this.ogeContextMenu().length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    // detail === 0 → keyboard-synthesized contextmenu (Menu key on some
    // platforms): anchor to the element instead of a stale pointer position.
    this.point.set(
      event.detail === 0 || (event.clientX === 0 && event.clientY === 0)
        ? null
        : { x: event.clientX, y: event.clientY },
    );
    this.openMenu();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const menuKey =
      (event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu';
    if (!menuKey) return;
    if (this.contextMenuDisabled() || this.ogeContextMenu().length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.point.set(null);
    this.openMenu();
  }

  /** Closes the menu programmatically. */
  close(): void {
    this.panel.close();
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
    this.componentRef.setInput('items', this.ogeContextMenu());
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
