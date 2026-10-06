import { Directive, TemplateRef, inject } from '@angular/core';

/** Context of a list box's option template. */
export interface OgeListBoxItemTemplateContext<TItem = unknown> {
  /** The item. */
  $implicit: TItem;
  /** Position among the visible (filtered) options. */
  index: number;
  /** The option is selected. */
  selected: boolean;
  /** The option is the keyboard-active one (`aria-activedescendant`). */
  active: boolean;
  /** The option is disabled (`disabledExpr`). */
  disabled: boolean;
}

/** Context of a list box's group header template. */
export interface OgeListBoxGroupTemplateContext {
  /** The group label (`groupBy` result). */
  $implicit: string;
  /** Options in the group. */
  count: number;
}

/**
 * Custom option content of an `oge-list-box` (or `oge-transfer-list`): the
 * option keeps its role, selection state and check glyph; only the text is
 * replaced.
 *
 * ```html
 * <oge-list-box [items]="people" displayExpr="name">
 *   <ng-template ogeListBoxItemTemplate let-person let-selected="selected">
 *     <strong>{{ person.name }}</strong> {{ person.role }}
 *   </ng-template>
 * </oge-list-box>
 * ```
 */
@Directive({ selector: '[ogeListBoxItemTemplate]' })
// `any` default: a structural directive with no inputs cannot infer the row
// type, and `unknown` would make every `let-item` field access a template
// error under strictTemplates.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class OgeListBoxItemTemplate<TItem = any> {
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeListBoxItemTemplateContext<TItem>>>(TemplateRef);

  static ngTemplateContextGuard<TItem>(
    _dir: OgeListBoxItemTemplate<TItem>,
    _ctx: unknown,
  ): _ctx is OgeListBoxItemTemplateContext<TItem> {
    return true;
  }
}

/**
 * Custom group header content of an `oge-list-box` with `groupBy`.
 *
 * ```html
 * <ng-template ogeListBoxGroupTemplate let-label let-count="count">
 *   {{ label }} ({{ count }})
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeListBoxGroupTemplate]' })
export class OgeListBoxGroupTemplate {
  /** The projected template. */
  readonly template =
    inject<TemplateRef<OgeListBoxGroupTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeListBoxGroupTemplate,
    _ctx: unknown,
  ): _ctx is OgeListBoxGroupTemplateContext {
    return true;
  }
}
