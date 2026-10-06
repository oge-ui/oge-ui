import { ogeFormatMessage } from '@oge-ui/core';
import { choiceIncludes } from './choice-group-core';

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
