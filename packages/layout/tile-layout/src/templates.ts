import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeTileLayoutItemData, OgeTileLayoutKey } from '@oge-ui/behavior';

/** Context of the tile layout's header and content template slots. */
export interface OgeTileLayoutTemplateContext {
  /** The tile's data (also the implicit `let-item`). */
  $implicit: OgeTileLayoutItemData;
  /** Its identity. */
  key: OgeTileLayoutKey;
  /** Its 0-based display position. */
  index: number;
  /** Its current column span (the live preview while resizing). */
  colSpan: number;
  /** Its current row span (the live preview while resizing). */
  rowSpan: number;
}

/**
 * Replaces the title text in the header of every `items`-mode tile. The
 * header stays the drag handle; buttons and links inside it are real
 * controls (a press on them never starts a drag):
 *
 * ```html
 * <oge-tile-layout [items]="tiles">
 *   <ng-template ogeTileLayoutHeaderTemplate let-item>
 *     {{ item.title }} <button type="button" (click)="refresh(item)">Refresh</button>
 *   </ng-template>
 * </oge-tile-layout>
 * ```
 */
@Directive({ selector: '[ogeTileLayoutHeaderTemplate]' })
export class OgeTileLayoutHeaderTemplate {
  readonly templateRef = inject(TemplateRef<OgeTileLayoutTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTileLayoutHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeTileLayoutTemplateContext {
    return true;
  }
}

/**
 * The body of every `items`-mode tile (a chart, a figure, a list). Content is
 * ordinary flow content and keeps its own place in the Tab order.
 */
@Directive({ selector: '[ogeTileLayoutContentTemplate]' })
export class OgeTileLayoutContentTemplate {
  readonly templateRef = inject(TemplateRef<OgeTileLayoutTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTileLayoutContentTemplate,
    _ctx: unknown,
  ): _ctx is OgeTileLayoutTemplateContext {
    return true;
  }
}

/**
 * Marks the element of an `oge-tile-layout-item` that replaces its header
 * title — the attribute slot of the declarative form:
 *
 * ```html
 * <oge-tile-layout-item key="sales" title="Sales">
 *   <span ogeTileLayoutItemHeader>Sales <small>today</small></span>
 *   …body…
 * </oge-tile-layout-item>
 * ```
 */
@Directive({ selector: '[ogeTileLayoutItemHeader]' })
export class OgeTileLayoutItemHeader {}
