import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Context of the popover's template slots: `$implicit` and `close` both
 * close the popover (reason `'closeButton'`).
 */
export interface OgePopoverSlotContext {
  /** Closes the popover — `let-close` in the template. */
  $implicit: () => void;
  /** Closes the popover — `let-close="close"`. */
  close: () => void;
}

/**
 * Rich title slot of an `oge-popover` (replaces the plain `title` text and
 * still labels the dialog):
 *
 * ```html
 * <oge-popover #pop>
 *   <ng-container *ogePopoverTitle>Share <strong>{{ file }}</strong></ng-container>
 *   …
 * </oge-popover>
 * ```
 */
@Directive({ selector: '[ogePopoverTitle]' })
export class OgePopoverTitle {
  /** The projected template, rendered inside the popover's title element. */
  readonly templateRef = inject(TemplateRef<OgePopoverSlotContext>);

  static ngTemplateContextGuard(
    _dir: OgePopoverTitle,
    _ctx: unknown,
  ): _ctx is OgePopoverSlotContext {
    return true;
  }
}

/**
 * Footer (actions) slot of an `oge-popover`; `$implicit` closes it:
 *
 * ```html
 * <oge-popover #pop title="Delete row?">
 *   This cannot be undone.
 *   <div *ogePopoverFooter="let close">
 *     <oge-button text="Cancel" (clicked)="close()" />
 *     <oge-button text="Delete" severity="danger" (clicked)="remove(); close()" />
 *   </div>
 * </oge-popover>
 * ```
 */
@Directive({ selector: '[ogePopoverFooter]' })
export class OgePopoverFooter {
  /** The projected template, rendered in the popover's footer bar. */
  readonly templateRef = inject(TemplateRef<OgePopoverSlotContext>);

  static ngTemplateContextGuard(
    _dir: OgePopoverFooter,
    _ctx: unknown,
  ): _ctx is OgePopoverSlotContext {
    return true;
  }
}
