import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  contentChild,
  input,
  model,
  output,
} from '@angular/core';
import { OgeToolbarItemTemplate } from './templates';
import type {
  OgeToolbarDisplayMode,
  OgeToolbarItemActiveChangedEvent,
  OgeToolbarItemClickEvent,
  OgeToolbarItemLocation,
  OgeToolbarItemSeverity,
  OgeToolbarItemType,
  OgeToolbarLocateInMenu,
} from './toolbar-types';

let nextItemId = 0;

/**
 * One declarative toolbar entry. Set `text`/`icon` to let the toolbar render
 * the button, or nest an `[ogeToolbarItemTemplate]` to supply your own
 * content — the toolbar stamps it, so the entry can appear on the bar or in
 * the overflow menu without being written twice:
 *
 * ```html
 * <oge-toolbar>
 *   <oge-toolbar-item text="Add" [icon]="plusPath" (itemClick)="add()" />
 *   <oge-toolbar-item location="after" text="Export">
 *     <ng-template ogeToolbarItemTemplate>
 *       <oge-button text="Export…" (click)="export()" />
 *     </ng-template>
 *   </oge-toolbar-item>
 * </oge-toolbar>
 * ```
 *
 * The content is an explicit template rather than plain projection because a
 * component cannot tell whether it was given content — verified against
 * Angular 22, where the host element's children are not yet attached when the
 * constructor runs — and an empty `<ng-content>` would silently replace the
 * button the item was asked to render.
 *
 * Renders nothing itself: the enclosing `oge-toolbar` decides where the
 * content lands.
 */
@Component({
  selector: 'oge-toolbar-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '',
})
export class OgeToolbarItem {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `d${nextItemId++}`;

  /** Stable identity echoed on `itemClick` and used for DOM ids. */
  readonly key = input<string | undefined>(undefined);
  /** What the toolbar renders when the item has no projected content. */
  readonly type = input<OgeToolbarItemType>('button');
  /** Label; also the accessible name when the item renders icon-only. */
  readonly text = input<string | undefined>(undefined);
  /** SVG path data (`d`) for a leading aria-hidden 16×16 icon. */
  readonly icon = input<string | undefined>(undefined);
  /** SVG path data (`d`) for a trailing icon, rendered after the text. */
  readonly suffixIcon = input<string | undefined>(undefined);
  /** Class(es) for a leading icon element — the icon-font hook. */
  readonly iconClass = input<string | undefined>(undefined);
  /** Class(es) for a trailing icon element. */
  readonly suffixIconClass = input<string | undefined>(undefined);
  /** Tooltip — rendered as the native `title` attribute. */
  readonly hint = input<string | undefined>(undefined);
  /** Fixed main-axis size of the item, e.g. `120` or `'8rem'`. */
  readonly width = input<number | string | undefined>(undefined);
  /** Extra attributes on the item element (`data-*`, `title`, …). */
  readonly htmlAttributes = input<Readonly<Record<string, string>> | undefined>(
    undefined,
  );
  /** Which of the toolbar's three groups the item belongs to. */
  readonly location = input<OgeToolbarItemLocation>('before');
  /** Whether the item may move into the overflow menu. */
  readonly locateInMenu = input<OgeToolbarLocateInMenu>('auto');
  /**
   * How hard the item holds its place on the bar; higher survives longer.
   * Defaults to `0`, where items yield from the end of the row.
   */
  readonly overflowPriority = input<number | undefined>(undefined);
  /** Overrides the toolbar's `showText` for this item. */
  readonly showText = input<OgeToolbarDisplayMode | undefined>(undefined);
  /** Overrides the toolbar's `showIcon` for this item. */
  readonly showIcon = input<OgeToolbarDisplayMode | undefined>(undefined);
  /** Disabled items are not clickable and are skipped by arrow navigation. */
  readonly disabled = input(false);
  /** `false` removes the item entirely. */
  readonly visible = input(true);
  /** Extra class on the item element. */
  readonly cssClass = input<string | undefined>(undefined);
  /** Emphasis of a toolbar-rendered button. */
  readonly severity = input<OgeToolbarItemSeverity>('default');
  /**
   * Arbitrary payload echoed back on `itemClick` — the declarative
   * counterpart of an `[items]` entry's `data`, so a handler can read it
   * without looking the item up by index.
   */
  readonly data = input<unknown>(undefined);
  /**
   * Toggle-button state — two-way. Defining it (`true` or `false`) is what
   * makes the item a toggle: it renders `aria-pressed` on the bar and a
   * checkmark in the menu, and every activation flips the value.
   */
  readonly active = model<boolean | undefined>(undefined);

  /**
   * This item was activated, on the bar or from the overflow menu. The
   * toolbar's own `itemClick` fires for every item; this one saves the
   * `index` lookup when the items are written declaratively.
   */
  readonly itemClick = output<OgeToolbarItemClickEvent>();

  /** This toggle item's pressed state changed. */
  readonly activeChanged = output<OgeToolbarItemActiveChangedEvent>();

  /** Inline content template — replaces the button the toolbar would render. */
  readonly contentTemplate = contentChild(OgeToolbarItemTemplate);
}
