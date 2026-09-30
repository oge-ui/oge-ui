import { Directive, input } from '@angular/core';
import type { OgeCardActionsAlign } from './card-types';

/**
 * Marks the card's media element — an `<img>`, `<video>` or a wrapper — and
 * moves it into the media slot. Media is full-bleed: it touches the card
 * edges, and in `orientation="horizontal"` it becomes the inline-start column.
 * Size it with plain CSS (`aspect-ratio`, `block-size`); there is no input
 * for it on purpose:
 *
 * ```html
 * <oge-card header="Trip">
 *   <img ogeCardMedia src="alps.jpg" alt="" style="aspect-ratio: 16 / 9" />
 *   <p>…</p>
 * </oge-card>
 * ```
 */
@Directive({
  selector: '[ogeCardMedia]',
  host: { class: 'oge-card-media' },
})
export class OgeCardMedia {}

/**
 * Marks the round avatar rendered before the header titles — the counterpart
 * of Material's `mat-card-avatar`. Only rendered when a header exists (titles,
 * avatar or header actions).
 */
@Directive({
  selector: '[ogeCardAvatar]',
  host: { class: 'oge-card-avatar' },
})
export class OgeCardAvatar {}

/**
 * Marks a group of controls rendered at the inline end of the header row,
 * beside the titles — an icon menu, a close button. These are real controls
 * in the Tab sequence; the card itself never wraps them in anything
 * interactive.
 */
@Directive({
  selector: '[ogeCardHeaderActions]',
  host: { class: 'oge-card-header-actions' },
})
export class OgeCardHeaderActions {}

/**
 * Marks the card's action row — the buttons under the content. `align`
 * follows the references (`start` Material/Kendo default; `stretched` gives
 * every action equal width, the Kendo extra):
 *
 * ```html
 * <oge-card header="Draft">
 *   <p>…</p>
 *   <div ogeCardActions align="end">
 *     <button type="button">Discard</button>
 *     <button type="button">Save</button>
 *   </div>
 * </oge-card>
 * ```
 */
@Directive({
  selector: '[ogeCardActions]',
  host: {
    class: 'oge-card-actions',
    '[class.oge-card-actions-center]': "align() === 'center'",
    '[class.oge-card-actions-end]': "align() === 'end'",
    '[class.oge-card-actions-stretched]': "align() === 'stretched'",
  },
})
export class OgeCardActions {
  /** Justification of the actions inside the row. */
  readonly align = input<OgeCardActionsAlign>('start');
}

/**
 * Marks the card's footer — a divided strip on the header surface after the
 * actions, for metadata rather than commands (Kendo's `kendo-card-footer`,
 * Material's `mat-card-footer`).
 */
@Directive({
  selector: '[ogeCardFooter]',
  host: { class: 'oge-card-footer' },
})
export class OgeCardFooter {}

/**
 * Renders a full-bleed hairline between card sections — Kendo's
 * `kendo-card-separator`. Put it on an `<hr>` inside the default content
 * projection:
 *
 * ```html
 * <oge-card>
 *   <p>Above</p>
 *   <hr ogeCardSeparator />
 *   <p>Below</p>
 * </oge-card>
 * ```
 */
@Directive({
  selector: '[ogeCardSeparator]',
  host: { class: 'oge-card-separator' },
})
export class OgeCardSeparator {}
