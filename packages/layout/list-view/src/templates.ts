import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeListViewKey } from '@oge-ui/behavior';

/** Context of an `[ogeListViewItemTemplate]` — one item of an `oge-list-view`. */
export interface OgeListViewItemTemplateContext<T = unknown> {
  /** The item (also the implicit `let-item`). */
  $implicit: T;
  /** Position in the (filtered) item list. */
  index: number;
  /** The item's key. */
  key: OgeListViewKey;
  /** Whether the item is selected. */
  selected: boolean;
  /** Whether the item is the active (keyboard) one. */
  active: boolean;
  /** Whether the item is disabled (its own flag or the list's). */
  disabled: boolean;
  /** The item's group label, `null` when the list is not grouped. */
  group: string | null;
}

/**
 * Replaces the content of every item. The list keeps the row's role, focus,
 * selection and swipe actions — the template renders only what is inside,
 * so keep it non-interactive (an option cannot hold controls):
 *
 * ```html
 * <oge-list-view [items]="people" displayExpr="name">
 *   <ng-template ogeListViewItemTemplate let-person let-selected="selected">
 *     <strong>{{ person.name }}</strong> · {{ person.role }}
 *   </ng-template>
 * </oge-list-view>
 * ```
 */
@Directive({ selector: '[ogeListViewItemTemplate]' })
export class OgeListViewItemTemplate {
  readonly templateRef = inject(TemplateRef<OgeListViewItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeListViewItemTemplate,
    _ctx: unknown,
    // the item type cannot flow from the list into a projected template, so
    // the context is typed loosely enough for `let-item` field access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): _ctx is OgeListViewItemTemplateContext<any> {
    return true;
  }
}

/** Context of an `[ogeListViewGroupTemplate]` — one sticky group header. */
export interface OgeListViewGroupTemplateContext {
  /** The group label (also the implicit `let-group`). */
  $implicit: string;
  /** Items in the group. */
  count: number;
}

/**
 * Replaces the text of every sticky group header. The header is
 * `aria-hidden` (its group segment carries the label), so keep it visual:
 *
 * ```html
 * <ng-template ogeListViewGroupTemplate let-group let-count="count">
 *   {{ group }} <small>({{ count }})</small>
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeListViewGroupTemplate]' })
export class OgeListViewGroupTemplate {
  readonly templateRef = inject(TemplateRef<OgeListViewGroupTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeListViewGroupTemplate,
    _ctx: unknown,
  ): _ctx is OgeListViewGroupTemplateContext {
    return true;
  }
}

/** Context of an `[ogeListViewEmptyTemplate]`. */
export interface OgeListViewEmptyTemplateContext {
  /** `true` when a search hid every item (else the list has none). */
  $implicit: boolean;
  /** The current search text. */
  searchValue: string;
}

/**
 * Replaces the empty state ("No items" / "No matching items"):
 *
 * ```html
 * <ng-template ogeListViewEmptyTemplate let-searching>
 *   {{ searching ? 'Nothing matches.' : 'Your inbox is empty.' }}
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeListViewEmptyTemplate]' })
export class OgeListViewEmptyTemplate {
  readonly templateRef = inject(TemplateRef<OgeListViewEmptyTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeListViewEmptyTemplate,
    _ctx: unknown,
  ): _ctx is OgeListViewEmptyTemplateContext {
    return true;
  }
}

/** Context of an `[ogeListViewFooterTemplate]`. */
export interface OgeListViewFooterTemplateContext {
  /** Requests the next page (the load-more button's action). */
  $implicit: () => void;
  /** The `loading` input. */
  loading: boolean;
  /** The `hasMore` input. */
  hasMore: boolean;
  /** Items currently held. */
  itemCount: number;
}

/**
 * Content under the list — a custom load-more control, a summary. Its
 * implicit value requests the next page exactly as the built-in button does:
 *
 * ```html
 * <ng-template ogeListViewFooterTemplate let-loadMore let-hasMore="hasMore">
 *   @if (hasMore) { <button type="button" (click)="loadMore()">Show more</button> }
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeListViewFooterTemplate]' })
export class OgeListViewFooterTemplate {
  readonly templateRef = inject(TemplateRef<OgeListViewFooterTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeListViewFooterTemplate,
    _ctx: unknown,
  ): _ctx is OgeListViewFooterTemplateContext {
    return true;
  }
}
