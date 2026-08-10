import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChildren,
  input,
  type Signal,
} from '@angular/core';
import type { OgeMenubarItemData } from './menubar-types';

let nextMenubarItemId = 0;

/**
 * One declarative item of `<oge-menubar>`, nestable for submenus:
 *
 * ```html
 * <oge-menubar>
 *   <oge-menubar-item text="File">
 *     <oge-menubar-item text="New" key="new" />
 *     <oge-menubar-item [separator]="true" />
 *     <oge-menubar-item text="Exit" key="exit" />
 *   </oge-menubar-item>
 *   <oge-menubar-item text="Help" url="/help" />
 * </oge-menubar>
 * ```
 *
 * Renders nothing itself — the menubar reads the item tree via `data()`.
 * Declarative children come first, then the `items` input — the house merge
 * order.
 */
@Component({
  selector: 'oge-menubar-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
})
export class OgeMenubarItem {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `m${nextMenubarItemId++}`;

  readonly text = input('');
  /** Stable identity used by `activeKey`, `open()` and event payloads. */
  readonly key = input<string | undefined>(undefined);
  /** Consumer-defined value carried through click events. */
  readonly value = input<unknown>(undefined);
  /** Top-level items only: renders the item as a real link (`<a href>`). */
  readonly url = input<string | undefined>(undefined);
  /** Tooltip (native `title`) — e.g. why an item is disabled. */
  readonly hint = input<string | undefined>(undefined);
  /** SVG path data (`d`) for a leading `aria-hidden` icon. */
  readonly icon = input<string | undefined>(undefined);
  /** Class(es) for a leading icon element — the icon-font hook. */
  readonly iconClass = input<string | undefined>(undefined);
  readonly disabled = input(false);
  /** `false` removes the item (and its subtree) entirely. */
  readonly visible = input(true);
  /** Renders a divider; every other input is ignored. */
  readonly separator = input(false);

  // Explicit annotations break the type-inference cycle of the recursive query.
  private readonly children: Signal<readonly OgeMenubarItem[]> =
    contentChildren(OgeMenubarItem, { descendants: false });

  /** The item and its subtree as plain data — what the menubar consumes. */
  readonly data: Signal<OgeMenubarItemData> = computed(() => {
    if (this.separator()) return { text: '', separator: true };
    const children = this.children()
      .filter((child) => child.visible())
      .map((child) => child.data());
    return {
      text: this.text(),
      key: this.key(),
      value: this.value(),
      url: this.url(),
      hint: this.hint(),
      icon: this.icon(),
      iconClass: this.iconClass(),
      disabled: this.disabled(),
      ...(children.length ? { items: children } : {}),
    };
  });
}
