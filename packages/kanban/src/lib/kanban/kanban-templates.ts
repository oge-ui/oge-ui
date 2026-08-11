import { Directive, TemplateRef, inject } from '@angular/core';
import type { KanbanCard, KanbanColumnDef } from '../engine/board-model';
import type { KanbanWipState } from '../engine/wip';

/** Context of `*ogeKanbanCardTemplate`. */
export interface OgeKanbanCardTemplateContext<T = unknown> {
  /** The normalized card (its `source` is the original data item). */
  readonly $implicit: KanbanCard<T>;
  /** The column the card renders in. */
  readonly column: KanbanColumnDef;
  /** The swimlane key; `null` on a board without swimlanes. */
  readonly swimlane: string | null;
}

/**
 * Replaces the card body. Gestures, keyboard interaction and ARIA stay on
 * the component — the template only owns the visuals inside the card.
 */
@Directive({ selector: '[ogeKanbanCardTemplate]' })
export class OgeKanbanCardTemplate<T = unknown> {
  readonly templateRef =
    inject<TemplateRef<OgeKanbanCardTemplateContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: OgeKanbanCardTemplate<T>,
    _ctx: unknown,
  ): _ctx is OgeKanbanCardTemplateContext<T> {
    return true;
  }
}

/** Context of `*ogeKanbanColumnHeaderTemplate`. */
export interface OgeKanbanColumnHeaderTemplateContext {
  /** The column being rendered. */
  readonly $implicit: KanbanColumnDef;
  /** Cards currently in the column (across all swimlanes). */
  readonly count: number;
  /** WIP arithmetic for the column. */
  readonly wip: KanbanWipState;
}

/** Replaces the column header's title row (the collapse affordance stays). */
@Directive({ selector: '[ogeKanbanColumnHeaderTemplate]' })
export class OgeKanbanColumnHeaderTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeKanbanColumnHeaderTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeKanbanColumnHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeKanbanColumnHeaderTemplateContext {
    return true;
  }
}
