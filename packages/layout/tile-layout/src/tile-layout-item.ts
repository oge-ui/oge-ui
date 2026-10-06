import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  input,
  viewChild,
} from '@angular/core';
import type {
  OgeTileLayoutItemData,
  OgeTileLayoutResizable,
} from '@oge-ui/behavior';
import { OgeTileLayoutItemHeader } from './templates';

let nextTileId = 0;

/**
 * One declarative tile of an `oge-tile-layout`. Its projected content is the
 * tile body; an element marked `ogeTileLayoutItemHeader` replaces the header
 * title:
 *
 * ```html
 * <oge-tile-layout [columns]="3">
 *   <oge-tile-layout-item key="sales" title="Sales" [colSpan]="2">
 *     <p>€ 12 480 today</p>
 *   </oge-tile-layout-item>
 *   <oge-tile-layout-item key="visits" title="Visits">…</oge-tile-layout-item>
 * </oge-tile-layout>
 * ```
 *
 * Renders nothing itself: the layout stamps the captured content into the
 * tile it draws, so the item can move without its content being re-created.
 * Declarative tiles come before the `items` data twin, in document order.
 */
@Component({
  selector: 'oge-tile-layout-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-template #header
      ><ng-content select="[ogeTileLayoutItemHeader]"
    /></ng-template>
    <ng-template #body><ng-content /></ng-template>
  `,
})
export class OgeTileLayoutItem {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `t${nextTileId++}`;

  /** Stable identity — events and the serialized state report it. */
  readonly key = input<string | number | undefined>(undefined);
  /** Header text; also the tile's accessible name. */
  readonly title = input<string | undefined>(undefined);
  /** Columns the tile spans (default 1, clamped to the layout's `columns`). */
  readonly colSpan = input<number | undefined>(undefined);
  /** Rows the tile spans (default 1). */
  readonly rowSpan = input<number | undefined>(undefined);
  /** Initial position; tiles without one keep their document order. */
  readonly order = input<number | undefined>(undefined);
  /** Smallest column span a resize may reach. */
  readonly minColSpan = input<number | undefined>(undefined);
  /** Largest column span a resize may reach. */
  readonly maxColSpan = input<number | undefined>(undefined);
  /** Smallest row span a resize may reach. */
  readonly minRowSpan = input<number | undefined>(undefined);
  /** Largest row span a resize may reach. */
  readonly maxRowSpan = input<number | undefined>(undefined);
  /** Overrides the layout's `resizable` for this tile. */
  readonly resizable = input<OgeTileLayoutResizable | undefined>(undefined);
  /** Overrides the layout's `reorderable` for this tile. */
  readonly reorderable = input<boolean | undefined>(undefined);

  /** @internal the captured header slot */
  readonly headerTemplate = viewChild.required<TemplateRef<unknown>>('header');
  /** @internal the captured body */
  readonly bodyTemplate = viewChild.required<TemplateRef<unknown>>('body');
  /** @internal whether a header element was projected */
  readonly customHeader = contentChild(OgeTileLayoutItemHeader);

  /** @internal the item as plain data — one read path with the `items` twin */
  readonly data = computed<OgeTileLayoutItemData>(() => ({
    key: this.key() ?? this.autoId,
    title: this.title(),
    colSpan: this.colSpan(),
    rowSpan: this.rowSpan(),
    order: this.order(),
    minColSpan: this.minColSpan(),
    maxColSpan: this.maxColSpan(),
    minRowSpan: this.minRowSpan(),
    maxRowSpan: this.maxRowSpan(),
    resizable: this.resizable(),
    reorderable: this.reorderable(),
  }));
}
