import type { TemplateRef } from '@angular/core';
import type {
  OgeTabCloseGuard,
  OgeTabContentTemplateContext,
  OgeTabHeaderTemplateContext,
  OgeTabItem,
} from './tabs-types';

/**
 * Normalized view of one tab — declarative children and `items` entries are
 * merged into this shape before rendering. Module-internal (not exported from
 * the package barrel).
 */
export interface OgeTabDescriptor {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly text: string;
  readonly hint?: string;
  readonly badge?: string | number;
  readonly disabled: boolean;
  readonly closable: boolean;
  readonly dirty: boolean;
  /** The source `items` entry — `undefined` for declarative tabs. */
  readonly item?: OgeTabItem;
  readonly headerTemplate?: TemplateRef<OgeTabHeaderTemplateContext>;
  readonly contentTemplate?: TemplateRef<
    OgeTabContentTemplateContext | unknown
  >;
  readonly closeGuard?: OgeTabCloseGuard;
}

/**
 * Applies a saved display order (drag reorder) to the source list. Ids
 * missing from `order` (newly added tabs) keep their source position at the
 * end of the ordered block; ids in `order` that no longer exist are ignored.
 */
export function applyTabOrder(
  source: readonly OgeTabDescriptor[],
  order: readonly string[],
): readonly OgeTabDescriptor[] {
  if (order.length === 0) return source;
  const position = new Map<string, number>();
  order.forEach((id, index) => position.set(id, index));
  return [...source].sort((a, b) => {
    const pa = position.get(a.id) ?? order.length + source.indexOf(a);
    const pb = position.get(b.id) ?? order.length + source.indexOf(b);
    return pa - pb;
  });
}
