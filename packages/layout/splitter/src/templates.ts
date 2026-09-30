import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeSplitterPaneTemplateContext } from './splitter-types';

/**
 * Structural directive rendering the body of every data-driven `panes` entry.
 * Declared directly inside `oge-splitter` it applies to the `panes` array;
 * declarative `<oge-splitter-pane>` children use their projected content
 * instead:
 *
 * ```html
 * <oge-splitter [panes]="areas">
 *   <ng-template ogeSplitterPaneTemplate let-pane let-index="index">
 *     <h3>{{ pane.key }} — pane {{ index }}</h3>
 *   </ng-template>
 * </oge-splitter>
 * ```
 */
@Directive({ selector: '[ogeSplitterPaneTemplate]' })
export class OgeSplitterPaneTemplate {
  readonly templateRef = inject(TemplateRef<OgeSplitterPaneTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeSplitterPaneTemplate,
    _ctx: unknown,
  ): _ctx is OgeSplitterPaneTemplateContext {
    return true;
  }
}
