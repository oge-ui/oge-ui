import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeActionSheetItem } from '@oge-ui/behavior';

/** Context of an `[ogeActionSheetItemTemplate]` — one action row. */
export interface OgeActionSheetItemTemplateContext {
  /** The action (also the implicit `let-item`). */
  $implicit: OgeActionSheetItem;
  /** Its index in render order (top group first). */
  index: number;
}

/**
 * Replaces the built-in icon + text + description of every action. The sheet
 * keeps the `menuitem` button, its keyboard and its disabled / destructive
 * state — the template draws only the content, so keep it non-interactive:
 *
 * ```html
 * <oge-action-sheet [items]="actions" title="Share">
 *   <ng-template ogeActionSheetItemTemplate let-item>
 *     <strong>{{ item.text }}</strong> <small>{{ item.description }}</small>
 *   </ng-template>
 * </oge-action-sheet>
 * ```
 */
@Directive({ selector: '[ogeActionSheetItemTemplate]' })
export class OgeActionSheetItemTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeActionSheetItemTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeActionSheetItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeActionSheetItemTemplateContext {
    return true;
  }
}
