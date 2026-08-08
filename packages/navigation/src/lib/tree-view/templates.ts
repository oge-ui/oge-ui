import { Directive, TemplateRef, inject, input } from '@angular/core';
import type {
  OgeTreeExpandIconTemplateContext,
  OgeTreeItemTemplateContext,
} from './tree-view-types';

/**
 * Structural directive replacing a node's built-in label. The template renders
 * *inside* the `role="treeitem"` row, so it must not contain focusable
 * controls — a composite-widget role makes those a `nested-interactive`
 * violation:
 *
 * ```html
 * <oge-tree-view [items]="folders">
 *   <ng-template
 *     ogeTreeItemTemplate
 *     [ogeTreeItemTemplateTypeFor]="folders"
 *     let-item
 *     let-level="level"
 *   >
 *     <strong>{{ item.name }}</strong> <em>({{ level }})</em>
 *   </ng-template>
 * </oge-tree-view>
 * ```
 *
 * `ogeTreeItemTemplateTypeFor` is a pure type anchor — bind the same array you
 * pass to `items` and `let-item` is typed as your row. Angular cannot infer a
 * structural directive's generic from the component it sits in; without the
 * anchor `item` is `unknown`.
 */
@Directive({ selector: '[ogeTreeItemTemplate]' })
export class OgeTreeItemTemplate<T = unknown> {
  readonly templateRef = inject(TemplateRef<OgeTreeItemTemplateContext<T>>);

  /** Type anchor — bind the array you passed to `items`; never read at runtime. */
  readonly typeFor = input<readonly T[] | undefined>(undefined, {
    alias: 'ogeTreeItemTemplateTypeFor',
  });

  static ngTemplateContextGuard<T>(
    _dir: OgeTreeItemTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeTreeItemTemplateContext<T> {
    return true;
  }
}

/**
 * Structural directive replacing the expand/collapse chevron. `$implicit` is
 * the node's expanded state:
 *
 * ```html
 * <ng-template ogeTreeExpandIconTemplate let-expanded let-loading="loading">
 *   {{ loading ? '…' : expanded ? '−' : '+' }}
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeTreeExpandIconTemplate]' })
export class OgeTreeExpandIconTemplate {
  readonly templateRef = inject(TemplateRef<OgeTreeExpandIconTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeTreeExpandIconTemplate,
    _ctx: unknown,
  ): _ctx is OgeTreeExpandIconTemplateContext {
    return true;
  }
}

/**
 * Structural directive replacing the empty-state message shown when the tree
 * has no nodes, or when a search matched nothing.
 */
@Directive({ selector: '[ogeTreeNoDataTemplate]' })
export class OgeTreeNoDataTemplate {
  readonly templateRef = inject(TemplateRef<void>);
}
