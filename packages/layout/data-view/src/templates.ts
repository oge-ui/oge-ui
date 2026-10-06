import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeDataViewLayout } from './data-view-types';

/** Context of `[ogeDataViewItemTemplate]` / `[ogeDataViewListItemTemplate]`. */
export interface OgeDataViewItemTemplateContext<TItem = unknown> {
  /** The item (also the implicit `let-item`). */
  $implicit: TItem;
  /** Index in the rendered page. */
  index: number;
  /** The layout the item renders in. */
  layout: OgeDataViewLayout;
  /** Whether the item is selected (always `false` without selection). */
  selected: boolean;
}

/**
 * Renders each item of an `oge-data-view` (in both layouts unless an
 * `[ogeDataViewListItemTemplate]` is given). In a selectable view an item is
 * an `option`, so keep the template non-interactive there:
 *
 * ```html
 * <oge-data-view [items]="products">
 *   <ng-template ogeDataViewItemTemplate let-item let-selected="selected">
 *     <h3>{{ item.name }}</h3>
 *   </ng-template>
 * </oge-data-view>
 * ```
 */
@Directive({ selector: '[ogeDataViewItemTemplate]' })
// `any` default: a structural directive with no inputs cannot infer the item
// type, and `unknown` would make every `let-item` field access a template
// error under strictTemplates.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class OgeDataViewItemTemplate<TItem = any> {
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeDataViewItemTemplateContext<TItem>>>(TemplateRef);

  static ngTemplateContextGuard<TItem>(
    _dir: OgeDataViewItemTemplate<TItem>,
    _ctx: unknown,
  ): _ctx is OgeDataViewItemTemplateContext<TItem> {
    return true;
  }
}

/**
 * Renders each item in the `list` layout only; without it the list layout
 * uses `[ogeDataViewItemTemplate]`.
 *
 * ```html
 * <ng-template ogeDataViewListItemTemplate let-item>
 *   {{ item.name }} — {{ item.price }}
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeDataViewListItemTemplate]' })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class OgeDataViewListItemTemplate<TItem = any> {
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeDataViewItemTemplateContext<TItem>>>(TemplateRef);

  static ngTemplateContextGuard<TItem>(
    _dir: OgeDataViewListItemTemplate<TItem>,
    _ctx: unknown,
  ): _ctx is OgeDataViewItemTemplateContext<TItem> {
    return true;
  }
}

/** Context of `[ogeDataViewEmptyTemplate]`. */
export interface OgeDataViewEmptyTemplateContext {
  /** `true` when a search or filter (not an empty `items`) left nothing. */
  $implicit: boolean;
  /** The default text for this case, from the messages. */
  text: string;
}

/**
 * Replaces the empty state ("No items to display" / "No matching items").
 *
 * ```html
 * <ng-template ogeDataViewEmptyTemplate let-filtered let-text="text">
 *   {{ text }} @if (filtered) { — try another search }
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeDataViewEmptyTemplate]' })
export class OgeDataViewEmptyTemplate {
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeDataViewEmptyTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeDataViewEmptyTemplate,
    _ctx: unknown,
  ): _ctx is OgeDataViewEmptyTemplateContext {
    return true;
  }
}
