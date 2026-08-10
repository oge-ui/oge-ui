import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  type Signal,
} from '@angular/core';
import type { OgeBreadcrumbItemData } from './breadcrumb-types';

let nextBreadcrumbItemId = 0;

/**
 * One declarative crumb of `<oge-breadcrumb>` — a flat list, never nested:
 *
 * ```html
 * <oge-breadcrumb>
 *   <oge-breadcrumb-item text="Home" url="/" icon="M2 8 8 2l6 6M4 7v7h8V7" />
 *   <oge-breadcrumb-item text="Products" url="/products" />
 *   <oge-breadcrumb-item text="Keyboards" />
 * </oge-breadcrumb>
 * ```
 *
 * Renders nothing itself — the breadcrumb reads the trail via `data()`.
 * Declarative children come first, then the `items` input — the house merge
 * order.
 */
@Component({
  selector: 'oge-breadcrumb-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ``,
})
export class OgeBreadcrumbItem {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `b${nextBreadcrumbItemId++}`;

  readonly text = input('');
  /** Stable identity used in event payloads and DOM ids. */
  readonly key = input<string | undefined>(undefined);
  /** Consumer-defined value carried through click events. */
  readonly value = input<unknown>(undefined);
  /** Renders the crumb as a real link (`<a href>`). */
  readonly url = input<string | undefined>(undefined);
  /** Tooltip (native `title`). */
  readonly hint = input<string | undefined>(undefined);
  /** SVG path data (`d`) for a leading `aria-hidden` icon. */
  readonly icon = input<string | undefined>(undefined);
  /** Class(es) for a leading icon element — the icon-font hook. */
  readonly iconClass = input<string | undefined>(undefined);
  readonly disabled = input(false);
  /** `false` removes the crumb entirely. */
  readonly visible = input(true);

  /** The crumb as plain data — what the breadcrumb consumes. */
  readonly data: Signal<OgeBreadcrumbItemData> = computed(() => ({
    text: this.text(),
    key: this.key(),
    value: this.value(),
    url: this.url(),
    hint: this.hint(),
    icon: this.icon(),
    iconClass: this.iconClass(),
    disabled: this.disabled(),
  }));
}
