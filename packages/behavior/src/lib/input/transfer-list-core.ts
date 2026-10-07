import { ogeFormatMessage } from '@oge-ui/core';
import { choiceIncludes } from './choice-group-core';
import { ogeListBoxDropTarget } from './list-box-core';

/**
 * The transfer list's framework-free rules (the dual list box: an
 * "available" source list and a "selected" target list), shared by both
 * render layers so the buttons, the keyboard shortcuts and a pointer drop
 * all run one move path and order the result the same way (ADR 0001).
 *
 * The component's **value is the target side**: the `valueExpr` results of
 * the items moved over, in the order they arrived. The source is every other
 * item, in items order. Values compare with `Object.is`.
 */

/** One side of a transfer list. */
export type OgeTransferListSide = 'source' | 'target';

/** What triggered a move — the same command runs for all three. */
export type OgeTransferListMoveCause = 'button' | 'keyboard' | 'drag';

/** Which move a button / shortcut asks for. */
export interface OgeTransferListMoveCommand {
  /** `'selected'` moves the side's selection, `'all'` every movable item. */
  readonly scope: 'selected' | 'all';
  /** The side the items leave. */
  readonly from: OgeTransferListSide;
}

/** The two sides' items for a target value. */
export interface OgeTransferListSplit<TItem> {
  /** Items not in the value, in items order. */
  readonly source: TItem[];
  /** Items in the value, in value (arrival) order. */
  readonly target: TItem[];
}

/**
 * Splits `items` into the two sides: the source keeps items order, the
 * target follows `value` — the order the user moved things in. Values no
 * item produces stay in the value but render nowhere.
 */
export function ogeTransferSplit<TItem>(
  items: readonly TItem[],
  value: readonly unknown[],
  valueOf: (item: TItem) => unknown,
): OgeTransferListSplit<TItem> {
  const source: TItem[] = [];
  const byValue = new Map<unknown, TItem>();
  for (const item of items) {
    const key = valueOf(item);
    if (choiceIncludes(value, key)) {
      if (!byValue.has(key)) byValue.set(key, item);
    } else {
      source.push(item);
    }
  }
  const target: TItem[] = [];
  for (const key of value) {
    const item = byValue.get(key);
    if (item !== undefined) target.push(item);
  }
  return { source, target };
}

/**
 * The target value after moving `moved` values: toward the target they are
 * appended (skipping ones already there), toward the source they are
 * removed.
 */
export function ogeTransferMove(
  value: readonly unknown[],
  moved: readonly unknown[],
  to: OgeTransferListSide,
): unknown[] {
  if (to === 'target') {
    const next = [...value];
    for (const entry of moved) {
      if (!choiceIncludes(next, entry)) next.push(entry);
    }
    return next;
  }
  return value.filter((entry) => !choiceIncludes(moved, entry));
}

/** The side opposite `side`. */
export function ogeTransferOpposite(
  side: OgeTransferListSide,
): OgeTransferListSide {
  return side === 'source' ? 'target' : 'source';
}

/**
 * The values a command moves: the side's enabled selection (`'selected'`),
 * or every enabled item the side shows (`'all'` — after its search filter,
 * so "move all" moves what the user sees).
 */
export function ogeTransferMovableValues<TItem>(
  scope: 'selected' | 'all',
  shown: readonly TItem[],
  selection: readonly unknown[],
  valueOf: (item: TItem) => unknown,
  isDisabled: (item: TItem) => boolean,
): unknown[] {
  const values: unknown[] = [];
  for (const item of shown) {
    if (isDisabled(item)) continue;
    const key = valueOf(item);
    if (scope === 'all' || choiceIncludes(selection, key)) values.push(key);
  }
  return values;
}

/** The slice of a `keydown` event the shortcut map reads. */
export interface OgeTransferListKeyInput {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * The keyboard shortcuts of a focused list: Ctrl/⌘ + the arrow pointing at
 * the other list moves the selection there, with Shift every item. The
 * arrows are **visual** — in RTL the target list sits on the left, so
 * Ctrl+← moves toward it. `null` when the key is not a shortcut (or points
 * away from the other list).
 */
export function ogeTransferKeyCommand(
  input: OgeTransferListKeyInput,
  side: OgeTransferListSide,
  rtl: boolean,
): OgeTransferListMoveCommand | null {
  if (!(input.ctrlKey || input.metaKey) || input.altKey) return null;
  if (input.key !== 'ArrowRight' && input.key !== 'ArrowLeft') return null;
  // the visual direction toward the target list
  const towardTarget = rtl ? 'ArrowLeft' : 'ArrowRight';
  const pointsToTarget = input.key === towardTarget;
  if (side === 'source' && !pointsToTarget) return null;
  if (side === 'target' && pointsToTarget) return null;
  return { scope: input.shiftKey ? 'all' : 'selected', from: side };
}

/** The `aria-keyshortcuts` a list advertises for its side. */
export function ogeTransferKeyShortcuts(
  side: OgeTransferListSide,
  rtl: boolean,
): string {
  const toward =
    side === 'source'
      ? rtl
        ? 'ArrowLeft'
        : 'ArrowRight'
      : rtl
        ? 'ArrowRight'
        : 'ArrowLeft';
  return `Control+${toward} Control+Shift+${toward}`;
}

/**
 * The announcement after a move — `template` is the
 * `transferMovedAnnouncement` catalog string, an ICU plural over `{count}`
 * that may name the destination as `{list}`.
 */
export function ogeTransferAnnouncement(
  template: string,
  count: number,
  list: string,
  locale?: string,
): string {
  return ogeFormatMessage(template, { count, list }, locale);
}

/**
 * Drop-target resolution of a drag between the lists: the pane under the
 * pointer (`[data-oge-transfer-side]`, owned by `host` — a nested transfer
 * list never answers for its parent) when it is the **other** side, else
 * `null`. The drop then runs the same move as the buttons.
 */
export function ogeTransferDropSide(
  hit: Element | null,
  host: Element,
  from: OgeTransferListSide,
): OgeTransferListSide | null {
  const pane = hit?.closest('[data-oge-transfer-side]') ?? null;
  if (!pane || !host.contains(pane)) return null;
  if (pane.closest('.oge-transfer-list') !== host) return null;
  const side = pane.getAttribute('data-oge-transfer-side');
  if (side !== 'source' && side !== 'target') return null;
  return side === from ? null : side;
}

/** The header's item count — the `transferItemCount` ICU plural. */
export function ogeTransferCountText(
  template: string,
  count: number,
  locale?: string,
): string {
  return ogeFormatMessage(template, { count }, locale);
}

/**
 * Which sides of a transfer list let the user reorder their items:
 * `true` both, a side name only that one, `false` none.
 */
export type OgeTransferListReorderSides = boolean | OgeTransferListSide;

/** Whether `side` is reorderable under `allowReordering`. */
export function ogeTransferReorderable(
  allow: OgeTransferListReorderSides,
  side: OgeTransferListSide,
): boolean {
  return allow === true || allow === side;
}

/** A drop target of the transfer list's one drag: a move or a reorder. */
export type OgeTransferListDropTarget =
  | { readonly kind: 'move'; readonly side: OgeTransferListSide }
  | {
      readonly kind: 'reorder';
      /** Visible index of the option under the pointer, in the drag's own list. */
      readonly index: number;
      readonly position: 'before' | 'after';
    };

/**
 * Resolves the transfer list's drag: over the **other** pane it is a move
 * (the buttons' move path); over an option of the drag's own list — when that
 * side is reorderable (`list` given) — a reorder before / after it.
 */
export function ogeTransferDropTarget(
  hit: Element | null,
  host: Element,
  from: OgeTransferListSide,
  list: Element | null,
  clientY: number,
): OgeTransferListDropTarget | null {
  const side = ogeTransferDropSide(hit, host, from);
  if (side) return { kind: 'move', side };
  if (!list) return null;
  const target = ogeListBoxDropTarget(hit, list, clientY);
  return target ? { kind: 'reorder', ...target } : null;
}

/**
 * The full item order after the source list was reordered: the source's
 * slots in `items` (every item not in the value) refilled with `source` in
 * its new order, target items untouched.
 */
export function ogeTransferReorderSource<TItem>(
  items: readonly TItem[],
  source: readonly TItem[],
  value: readonly unknown[],
  valueOf: (item: TItem) => unknown,
): TItem[] {
  let next = 0;
  return items.map((item) =>
    choiceIncludes(value, valueOf(item)) ? item : (source[next++] ?? item),
  );
}

/**
 * The value after the target list was reordered: the target items' values
 * in their new order, then any value no item produces (kept, as before).
 */
export function ogeTransferReorderTarget<TItem>(
  value: readonly unknown[],
  target: readonly TItem[],
  valueOf: (item: TItem) => unknown,
): unknown[] {
  const ordered = target.map(valueOf);
  return [
    ...ordered,
    ...value.filter((entry) => !choiceIncludes(ordered, entry)),
  ];
}

/**
 * The drop line of a reorder inside a pane: the option's top or bottom edge
 * relative to the pane, spanning the option — in px, physical coordinates.
 */
export function ogeTransferReorderLine(
  option: Element,
  pane: Element,
  position: 'before' | 'after',
): { top: number; left: number; width: number } {
  const rect = option.getBoundingClientRect();
  const box = pane.getBoundingClientRect();
  return {
    top: (position === 'after' ? rect.bottom : rect.top) - box.top,
    left: rect.left - box.left,
    width: rect.width,
  };
}
