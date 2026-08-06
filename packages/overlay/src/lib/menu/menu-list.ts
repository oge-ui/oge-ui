import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { OGE_OVERLAY_CONFIG } from '../config';
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
 */
@Component({
  selector: 'oge-menu-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
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
      } @else {
        <button
          type="button"
          class="oge-menu-item"
          tabindex="-1"
          [id]="itemId($index)"
          [class.oge-menu-item-active]="$index === activeIndex()"
          [class.oge-menu-item-danger]="item.severity === 'danger'"
          [attr.role]="
            item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'
          "
          [attr.aria-checked]="ariaChecked(item)"
          [attr.aria-disabled]="item.disabled ? 'true' : null"
          [attr.title]="item.hint ?? null"
          [disabled]="item.disabled ?? false"
          (click)="activate(item, $index, $event)"
          (pointerenter)="onItemHover(item, $index)"
        >
          @if (itemTemplate(); as customTemplate) {
            <ng-container
              *ngTemplateOutlet="
                customTemplate;
                context: { $implicit: item, index: $index }
              "
            />
          } @else {
            @if (item.checked !== undefined) {
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
            <span class="oge-menu-item-text">{{ item.text }}</span>
          }
        </button>
      }
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

  /** Fires when an enabled item is activated (click, Enter or Space). */
  readonly itemClick = output<OgeMenuListItemClickEvent>();
  /** The menu asks its owner to close it; the owner handles focus. */
  readonly closeRequest = output<OgeMenuCloseRequestEvent>();

  protected readonly resolvedMenuId = computed(
    () => this.menuId() ?? this.generatedId,
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

  private typeAheadBuffer = '';
  private lastTypeTime = Number.NEGATIVE_INFINITY;

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
    if (!item.disabled) this.activeIndex.set(index);
  }

  protected activate(
    item: OgeMenuItem,
    index: number,
    event: MouseEvent | KeyboardEvent,
  ): void {
    if (item.disabled || item.separator) return;
    this.itemClick.emit({ item, index, event });
    item.action?.();
    this.closeRequest.emit({ reason: 'select', event });
  }

  protected onKeydown(event: KeyboardEvent): void {
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
      if (item) this.activate(item, index, event);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.typeAhead(key);
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
    this.activeIndex.set(index);
    document.getElementById(this.itemId(index))?.scrollIntoView?.({
      block: 'nearest',
    });
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
}
