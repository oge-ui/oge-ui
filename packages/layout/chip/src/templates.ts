import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeChipItem } from './chip-types';

/** Context of an `[ogeChipTemplate]` — one chip of an `oge-chip-list`. */
export interface OgeChipTemplateContext {
  /** The chip item (also the implicit `let-item`). */
  $implicit: OgeChipItem;
  /** Index in `items`. */
  index: number;
  /** Whether the chip is currently selected. */
  selected: boolean;
  /** Whether the chip shows a remove affordance. */
  removable: boolean;
  /** Whether the chip is disabled (its own flag or the list's). */
  disabled: boolean;
}

/**
 * Replaces the label of every chip in an `oge-chip-list`. The list keeps the
 * chip's role, focus, selection glyph and remove affordance — the template
 * renders only the content between them, so keep it non-interactive:
 *
 * ```html
 * <oge-chip-list [items]="tags">
 *   <ng-template ogeChipTemplate let-item let-selected="selected">
 *     <strong>{{ item.label }}</strong> · {{ selected ? 'on' : 'off' }}
 *   </ng-template>
 * </oge-chip-list>
 * ```
 */
@Directive({ selector: '[ogeChipTemplate]' })
export class OgeChipTemplate {
  readonly template = inject<TemplateRef<OgeChipTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeChipTemplate,
    _ctx: unknown,
  ): _ctx is OgeChipTemplateContext {
    return true;
  }
}
