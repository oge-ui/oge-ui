import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeModalSlotContext } from './modal-types';

/**
 * Rich title slot of an `oge-modal` (replaces the plain `title` text):
 *
 * ```html
 * <oge-modal [(opened)]="visible">
 *   <ng-container *ogeModalTitle>Edit <strong>{{ name }}</strong></ng-container>
 * </oge-modal>
 * ```
 */
@Directive({ selector: '[ogeModalTitle]' })
export class OgeModalTitle {
  /** The projected template, rendered inside the modal's `<h2>`. */
  readonly templateRef = inject(TemplateRef<OgeModalSlotContext>);

  static ngTemplateContextGuard(
    _dir: OgeModalTitle,
    _ctx: unknown,
  ): _ctx is OgeModalSlotContext {
    return true;
  }
}

/**
 * Title-bar action slot of an `oge-modal` — rendered between the title and
 * the maximize/✕ buttons, for custom icon buttons (help, pin, settings…).
 * Presses starting on buttons here never begin a header drag:
 *
 * ```html
 * <oge-modal [(opened)]="visible" title="Report">
 *   <ng-container *ogeModalHeaderActions>
 *     <button type="button" class="oge-modal-close" aria-label="Help"
 *             (click)="showHelp()">?</button>
 *   </ng-container>
 * </oge-modal>
 * ```
 */
@Directive({ selector: '[ogeModalHeaderActions]' })
export class OgeModalHeaderActions {
  /** The projected template, rendered inside the modal's title bar. */
  readonly templateRef = inject(TemplateRef<OgeModalSlotContext>);

  static ngTemplateContextGuard(
    _dir: OgeModalHeaderActions,
    _ctx: unknown,
  ): _ctx is OgeModalSlotContext {
    return true;
  }
}

/**
 * Footer slot of an `oge-modal`; `$implicit` closes the modal and its
 * optional argument becomes `closed.result`:
 *
 * ```html
 * <oge-modal [(opened)]="visible">
 *   <div *ogeModalFooter="let close">
 *     <oge-button text="Save" (clicked)="close(form.value)" />
 *   </div>
 * </oge-modal>
 * ```
 */
@Directive({ selector: '[ogeModalFooter]' })
export class OgeModalFooter {
  /** The projected template, rendered inside the modal's footer bar. */
  readonly templateRef = inject(TemplateRef<OgeModalSlotContext>);

  static ngTemplateContextGuard(
    _dir: OgeModalFooter,
    _ctx: unknown,
  ): _ctx is OgeModalSlotContext {
    return true;
  }
}
