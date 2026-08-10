import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { OGE_OVERLAY_CONFIG } from '../config';
import {
  OgeAnchoredPanel,
  type OgePopupCloseReason,
} from '../panel/anchored-panel';
import { OgePopup } from '../popup/popup';
import type {
  OgeMenuCloseRequestEvent,
  OgeMenuItem,
  OgeMenuItemTemplateContext,
  OgeMenuListItemClickEvent,
} from './menu-types';

let nextMenuId = 0;

/**
 * Presentational menu with full WAI-ARIA `menu` keyboard support: the
 * container holds real focus (`aria-activedescendant` pattern), arrow keys
 * wrap and skip disabled items/separators, Home/End jump, printable keys
 * type-ahead, Enter/Space activate. Closing is delegated to the owner via
 * `closeRequest` so focus handling stays in one place:
 *
 * ```html
 * <oge-menu-list [items]="items" (itemClick)="onItem($event)" (closeRequest)="close($event.reason)" />
 * ```
 *
 * Items with `items` children are submenu parents: activation or ArrowRight
 * opens a nested `oge-menu-list` in an anchored panel of its own. The nested
 * level's `'escape'`/`'back'` close requests are absorbed here (the level
 * closes, focus returns to this list); `'select'`/`'tab'` re-emit upward so
 * the root owner still receives exactly one `closeRequest` and keeps owning
 * focus restoration.
 */
@Component({
  selector: 'oge-menu-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgePopup, OgeMenuList],
  host: {
    class: 'oge-menu-list',
    role: 'menu',
    tabindex: '-1',
    '[id]': 'resolvedMenuId()',
    '[attr.aria-label]': 'ariaLabel() ?? null',
    '[attr.aria-activedescendant]': 'activeItemId()',
    '(keydown)': 'onKeydown($event)',
  },
  styleUrl: './menu-list.scss',
  template: `
    @for (item of items(); track $index) {
      @if (item.separator) {
        <hr class="oge-menu-separator" role="separator" />
      } @else if (item.url && !item.items?.length) {
        <a
          class="oge-menu-item"
          role="menuitem"
          tabindex="-1"
          [id]="itemId($index)"
          [href]="item.url"
          [class.oge-menu-item-active]="$index === activeIndex()"
          [class.oge-menu-item-danger]="item.severity === 'danger'"
          [class.oge-menu-item-disabled]="item.disabled ?? false"
          [attr.aria-disabled]="item.disabled ? 'true' : null"
          [attr.aria-keyshortcuts]="item.shortcut ?? null"
          [attr.title]="item.hint ?? null"
          (click)="activate(item, $index, $event)"
          (pointerenter)="onItemHover(item, $index)"
        >
          <ng-container
            *ngTemplateOutlet="
              rowContent;
              context: { $implicit: item, index: $index }
            "
          />
        </a>
      } @else {
        <button
          type="button"
          class="oge-menu-item"
          tabindex="-1"
          [id]="itemId($index)"
          [class.oge-menu-item-active]="$index === activeIndex()"
          [class.oge-menu-item-danger]="item.severity === 'danger'"
          [attr.role]="
            item.checked !== undefined && !item.items?.length
              ? 'menuitemcheckbox'
              : 'menuitem'
          "
          [attr.aria-checked]="item.items?.length ? null : ariaChecked(item)"
          [attr.aria-disabled]="item.disabled ? 'true' : null"
          [attr.aria-haspopup]="item.items?.length ? 'menu' : null"
          [attr.aria-expanded]="
            item.items?.length
              ? $index === openChildIndex()
                ? 'true'
                : 'false'
              : null
          "
          [attr.aria-keyshortcuts]="item.shortcut ?? null"
          [attr.title]="item.hint ?? null"
          [disabled]="item.disabled ?? false"
          (click)="activate(item, $index, $event)"
          (pointerenter)="onItemHover(item, $index)"
        >
          <ng-container
            *ngTemplateOutlet="
              rowContent;
              context: { $implicit: item, index: $index }
            "
          />
        </button>
      }
    }
    <ng-template #rowContent let-item let-index="index">
      @if (itemTemplate(); as customTemplate) {
        <ng-container
          *ngTemplateOutlet="
            customTemplate;
            context: { $implicit: item, index: index }
          "
        />
      } @else {
        @if (item.checked !== undefined && !item.items?.length) {
          <span class="oge-menu-item-check">
            @if (item.checked) {
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m3 8.5 3.5 3.5L13 4.5" />
              </svg>
            }
          </span>
        }
        @if (hasIcons()) {
          <span class="oge-menu-item-icon">
            @if (item.icon) {
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden="true"
              >
                <path [attr.d]="item.icon" />
              </svg>
            } @else if (item.iconClass) {
              <i [class]="item.iconClass" aria-hidden="true"></i>
            }
          </span>
        }
        <span class="oge-menu-item-text">{{ item.text }}</span>
        @if (item.badge !== undefined) {
          <span class="oge-menu-item-badge">{{ item.badge }}</span>
        }
        @if (item.shortcut) {
          <span class="oge-menu-item-shortcut" aria-hidden="true">{{
            item.shortcut
          }}</span>
        }
      }
      @if (item.items?.length) {
        <!-- Outside the itemTemplate outlet so custom templates keep the
             submenu affordance. -->
        <span class="oge-menu-item-caret" aria-hidden="true">
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
        </span>
      }
    </ng-template>
    @if (childItems().length) {
      <oge-popup [panel]="childPanel">
        <oge-menu-list
          [items]="childItems()"
          [nested]="true"
          [ariaLabel]="childLabel()"
          [itemTemplate]="itemTemplate()"
          (itemClick)="itemClick.emit($event)"
          (closeRequest)="onChildCloseRequest($event)"
        />
      </oge-popup>
    }
  `,
})
export class OgeMenuList {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly generatedId = `oge-menu-${nextMenuId++}`;

  readonly items = input.required<readonly OgeMenuItem[]>();
  /** id of the `role="menu"` element; defaults to a generated unique id. */
  readonly menuId = input<string | undefined>(undefined);
  /** Accessible name of the menu. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Replaces the default check+text item rendering (icons, badges…). */
  readonly itemTemplate = input<
    TemplateRef<OgeMenuItemTemplateContext> | undefined
  >(undefined);
  /**
   * Set on the nested list a submenu parent opens. ArrowLeft then closes the
   * level (`'back'`) instead of bubbling to the owner.
   */
  readonly nested = input(false);

  /** Fires when an enabled item is activated (click, Enter or Space). */
  readonly itemClick = output<OgeMenuListItemClickEvent>();
  /** The menu asks its owner to close it; the owner handles focus. */
  readonly closeRequest = output<OgeMenuCloseRequestEvent>();

  protected readonly resolvedMenuId = computed(
    () => this.menuId() ?? this.generatedId,
  );
  /**
   * One row with an icon gives every row an icon column, so labels stay on a
   * single left edge instead of stepping in and out down the menu.
   */
  protected readonly hasIcons = computed(() =>
    this.items().some(
      (item) => !item.separator && (item.icon || item.iconClass),
    ),
  );
  /** Resets whenever the items themselves change (async reloads etc.). */
  protected readonly activeIndex = linkedSignal({
    source: this.items,
    computation: () => -1,
  });
  protected readonly activeItemId = computed(() => {
    const index = this.activeIndex();
    return index >= 0 ? this.itemId(index) : null;
  });

  /** Index of the row whose submenu is open; `-1` when none is. */
  protected readonly openChildIndex = signal(-1);
  protected readonly childItems = computed<readonly OgeMenuItem[]>(() => {
    const index = this.openChildIndex();
    return index >= 0 ? (this.items()[index]?.items ?? []) : [];
  });
  /** APG: a submenu is named by its parent item. */
  protected readonly childLabel = computed(() => {
    const index = this.openChildIndex();
    return index >= 0 ? this.items()[index]?.text : undefined;
  });

  private readonly childPopup = viewChild(OgePopup, { read: ElementRef });
  private readonly childList = viewChild(OgeMenuList);

  /**
   * At most one submenu per level, so one panel instance: switching rows just
   * repoints the anchor, which makes sibling-hover switching atomic. Outside
   * clicks and Escape stay owned by the root panel / this list's keydown.
   */
  protected readonly childPanel = new OgeAnchoredPanel({
    anchor: () => {
      const index = this.openChildIndex();
      return index >= 0 ? document.getElementById(this.itemId(index)) : null;
    },
    panel: () => this.childPopup()?.nativeElement ?? null,
    placement: () => 'right-start',
    closeOnOutsidePointerDown: false,
    closeOnEscape: false,
    onClosed: () => this.openChildIndex.set(-1),
  });

  private typeAheadBuffer = '';
  private lastTypeTime = Number.NEGATIVE_INFINITY;
  private pendingChildFocus = false;
  private hoverOpenTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Keyboard opens hand focus to the child list once it is measured; hover
    // opens never move focus (pendingChildFocus stays false).
    effect(() => {
      if (this.childPanel.position() !== null && this.pendingChildFocus) {
        this.pendingChildFocus = false;
        this.childList()?.focus('first');
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.clearHoverTimers();
      this.childPanel.destroy();
    });
  }

  /** Focuses the menu container and activates the first/last enabled item. */
  focus(position: 'first' | 'last' = 'first'): void {
    this.host.nativeElement.focus({ preventScroll: true });
    const enabled = this.enabledIndexes();
    if (enabled.length === 0) return;
    this.setActive(
      position === 'first' ? enabled[0] : enabled[enabled.length - 1],
    );
  }

  protected itemId(index: number): string {
    return `${this.resolvedMenuId()}-item-${index}`;
  }

  protected ariaChecked(item: OgeMenuItem): 'true' | 'false' | null {
    if (item.checked === undefined) return null;
    return item.checked ? 'true' : 'false';
  }

  protected onItemHover(item: OgeMenuItem, index: number): void {
    if (item.disabled) return;
    this.activeIndex.set(index);
    this.clearHoverTimers();
    const open = this.openChildIndex();
    if (index === open) return; // re-entering the open row keeps it open
    if (item.items?.length) {
      this.hoverOpenTimer = setTimeout(
        () => this.openChild(index),
        this.config.menuShowDelayMs,
      );
    }
    if (open >= 0) {
      this.hoverCloseTimer = setTimeout(
        () => this.closeChild('api'),
        this.config.menuHideDelayMs,
      );
    }
  }

  protected activate(
    item: OgeMenuItem,
    index: number,
    event: MouseEvent | KeyboardEvent,
  ): void {
    if (item.disabled || item.separator) {
      if (item.url) event.preventDefault(); // a disabled link must not navigate
      return;
    }
    if (item.items?.length) {
      const keyboard = !(event instanceof MouseEvent) || event.detail === 0;
      if (!keyboard && index === this.openChildIndex()) {
        this.closeChild('api'); // pointer click toggles an open parent row
        return;
      }
      this.openChild(index, keyboard);
      return;
    }
    this.itemClick.emit({ item, index, event });
    item.action?.();
    this.closeRequest.emit({ reason: 'select', event });
  }

  protected onChildCloseRequest(event: OgeMenuCloseRequestEvent): void {
    if (event.reason === 'escape' || event.reason === 'back') {
      // Absorb: the level closes, focus returns here — the root owner's
      // closeRequest contract is untouched.
      this.closeChild(event.reason);
      return;
    }
    // 'select' | 'tab' close the whole tree: chain to the root owner.
    this.closeRequest.emit(event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // A nested list is a DOM descendant, so its unstopped keys (Tab, an
    // ArrowRight on a leaf…) bubble through this host — route only events
    // originating in this list.
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('.oge-menu-list') !== this.host.nativeElement) {
      return;
    }
    const key = event.key;
    if (key === 'Tab') {
      this.closeRequest.emit({ reason: 'tab', event });
      return; // no preventDefault — the browser continues tabbing from the owner
    }
    if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeRequest.emit({ reason: 'escape', event });
      return;
    }
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    if (key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      const index = this.activeIndex();
      const item = this.items()[index];
      if (item?.items?.length && !item.disabled) {
        event.preventDefault();
        event.stopPropagation();
        this.openChild(index, true);
      }
      // Leaf rows let the key bubble — a menubar moves to the next bar item.
      return;
    }
    if (key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      if (this.nested()) {
        event.preventDefault();
        event.stopPropagation();
        this.closeRequest.emit({ reason: 'back', event });
      }
      // Root-level lists let the key bubble — a menubar moves to the previous
      // bar item.
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.move(key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      const enabled = this.enabledIndexes();
      if (enabled.length) {
        this.setActive(
          key === 'Home' ? enabled[0] : enabled[enabled.length - 1],
        );
      }
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      const index = this.activeIndex();
      const item = this.items()[index];
      if (!item) return;
      if (item.url && !item.items?.length && !item.disabled) {
        // Activate the real link, so navigation keeps native anchor
        // semantics — a handler's preventDefault() on the click event hands
        // it to a router, exactly like a pointer click.
        document.getElementById(this.itemId(index))?.click();
        return;
      }
      this.activate(item, index, event);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.typeAhead(key);
    }
  }

  private typeAhead(key: string): void {
    const now = performance.now();
    if (now - this.lastTypeTime > this.config.typeAheadMs) {
      this.typeAheadBuffer = '';
    }
    this.lastTypeTime = now;
    this.typeAheadBuffer += key.toLowerCase();
    const buffer = this.typeAheadBuffer;
    const repeated =
      buffer.length > 1 && buffer.split('').every((c) => c === buffer[0]);
    const needle = repeated ? buffer[0] : buffer;
    // A growing distinct buffer keeps matching the current item ("d","de");
    // a repeated single character cycles through matches instead.
    const startOffset = buffer.length > 1 && !repeated ? 0 : 1;
    const list = this.items();
    const count = list.length;
    const start = this.activeIndex();
    for (let step = startOffset; step <= count; step++) {
      const index = (start + step + count) % count;
      const item = list[index];
      if (!item || item.disabled || item.separator) continue;
      if (item.text.toLowerCase().startsWith(needle)) {
        this.setActive(index);
        return;
      }
    }
  }

  private openChild(index: number, focusChild = false): void {
    this.clearHoverTimers();
    if (index === this.openChildIndex() && this.childPanel.isOpen()) {
      if (focusChild) this.childList()?.focus('first');
      return;
    }
    this.openChildIndex.set(index);
    this.pendingChildFocus = focusChild;
    if (this.childPanel.isOpen()) {
      this.childPanel.updatePosition(); // switched rows: re-anchor in place
      if (focusChild) {
        this.pendingChildFocus = false;
        this.childList()?.focus('first');
      }
    } else {
      this.childPanel.open();
    }
  }

  private closeChild(reason: OgePopupCloseReason): void {
    this.clearHoverTimers();
    if (!this.childPanel.isOpen()) return;
    const popup = this.childPopup()?.nativeElement;
    const hadFocus = !!popup && popup.contains(document.activeElement);
    this.childPanel.close(reason);
    // Never let focus fall to <body> when the focused level unmounts.
    if (hadFocus) this.host.nativeElement.focus({ preventScroll: true });
  }

  private clearHoverTimers(): void {
    if (this.hoverOpenTimer !== null) {
      clearTimeout(this.hoverOpenTimer);
      this.hoverOpenTimer = null;
    }
    if (this.hoverCloseTimer !== null) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = null;
    }
  }

  private enabledIndexes(): number[] {
    const indexes: number[] = [];
    this.items().forEach((item, index) => {
      if (!item.disabled && !item.separator) indexes.push(index);
    });
    return indexes;
  }

  private move(delta: 1 | -1): void {
    const enabled = this.enabledIndexes();
    if (enabled.length === 0) return;
    const current = enabled.indexOf(this.activeIndex());
    const next =
      current === -1
        ? delta === 1
          ? enabled[0]
          : enabled[enabled.length - 1]
        : enabled[(current + delta + enabled.length) % enabled.length];
    this.setActive(next);
  }

  private setActive(index: number): void {
    // A keyboard move off the open parent row closes its submenu (APG: the
    // expanded row changed). Pointer moves go through the delayed hover path.
    if (this.childPanel.isOpen() && index !== this.openChildIndex()) {
      this.closeChild('api');
    }
    this.activeIndex.set(index);
    document.getElementById(this.itemId(index))?.scrollIntoView?.({
      block: 'nearest',
    });
  }
}
