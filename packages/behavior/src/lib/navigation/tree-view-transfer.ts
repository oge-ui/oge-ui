/**
 * Moving tree view nodes — inside one tree and between trees that share a
 * `dragGroup` — with one commit path for the pointer drag and its keyboard
 * twin (Ctrl+X on a node, Ctrl+V on the target; WCAG 2.1.1 / 2.5.7).
 *
 * Framework-free and DOM-light (ADR 0001), the same shape as the grid's
 * `registerOgeRowDragParticipant` and the kanban board registry: every
 * mounted tree with dragging on registers an {@link OgeTreeDragPeer}; the
 * dragging tree hit-tests the element under the pointer against the peers of
 * its group (innermost host wins), the peer under the pointer previews the
 * drop position, and the drop runs {@link ogeTreeCommitMove} — the target's
 * cancelable `itemReordering`, its `itemReordered`, and for a cross-tree move
 * the source's `itemTransferred`.
 *
 * The trees never move data: they report the move and the application
 * applies it to its own arrays (DevExtreme's `onAdd` precedent, tree-list's
 * `rowReparented`). That holds for both trees of a cross-tree move — the
 * tree view has no uncontrolled data mode to fall back on.
 */
import { ogeFormatMessage, type RowKey } from '@oge-ui/core';
import {
  beginPointerDragDrop,
  type OgePointerDragDropOptions,
} from '../gesture/pointer-drag-drop';
import {
  OGE_LONG_PRESS_DELAY,
  type OgePointerGestureHandle,
  type OgePointerGestureInput,
} from '../gesture/pointer-gesture';
import {
  OGE_TREE_DRAG_HOVER_EXPAND_MS,
  OGE_TREE_DRAG_THRESHOLD,
  resolveTreeDropPosition,
  type OgeTreeDropPosition,
  type OgeTreeMoveSource,
  type OgeTreeReorderedEvent,
  type OgeTreeReorderingEvent,
  type OgeTreeTransferredEvent,
  type OgeTreeViewResolvedMessages,
} from './tree-view-core';

/** The node being moved, as every peer sees it. */
export interface OgeTreeDragSource {
  /** `role="tree"` id of the tree the node comes from. */
  readonly treeId: string;
  readonly key: RowKey;
  readonly item: unknown;
  /** Display text — used in announcements. */
  readonly text: string;
}

/** A resolved drop spot inside one peer. */
export interface OgeTreeDragTarget {
  /** `role="tree"` id of the tree the drop lands in. */
  readonly treeId: string;
  readonly key: RowKey;
  readonly position: OgeTreeDropPosition;
}

/** The facts a peer reports about one of its rendered rows. */
export interface OgeTreeDragRowInfo {
  readonly key: RowKey;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}

/** One mounted tree taking part in moves (its own and its group's). */
export interface OgeTreeDragPeer {
  /** The tree's `role="tree"` id — what events report as source / target. */
  treeId(): string;
  /** Effective group — see {@link ogeTreeDragGroupOf}. */
  group(): string;
  /** Host element hits are tested against. */
  element(): Element | null;
  /** The rendered rows (`[data-key]`), in visual order. */
  rows(): readonly Element[];
  /** Resolves a row's `data-key` attribute; `null` for non-droppable rows. */
  rowInfo(dataKey: string): OgeTreeDragRowInfo | null;
  /** The data item behind a key, `undefined` when unknown. */
  itemOf(key: RowKey): unknown;
  /** Display text of a key (announcements). */
  textOf(key: RowKey): string;
  /** Whether `source` may land on `dropKey` (cycle guard inside one tree). */
  canDrop(source: OgeTreeDragSource, dropKey: RowKey): boolean;
  /** Whether `inside` drops are allowed (`allowDropInside`). */
  allowDropInside(): boolean;
  /** Draw (`target`) or clear (`null`) this tree's drop indicator. */
  preview(target: OgeTreeDragTarget | null): void;
  /** Expands a node — the hover-to-expand while dragging. */
  expand(key: RowKey): void;
  /** Mark (`key`) or unmark (`null`) the node a keyboard move holds. */
  setCut(key: RowKey | null): void;
  /** Speak through the live announcer. */
  announce(text: string): void;
  /** This tree's resolved catalog. */
  messages(): OgeTreeViewResolvedMessages;
  /** Fire the cancelable `itemReordering` on this tree. */
  emitReordering(event: OgeTreeReorderingEvent<unknown>): void;
  /** Fire `itemReordered` on this tree. */
  emitReordered(event: OgeTreeReorderedEvent<unknown>): void;
  /** Fire `itemTransferred` on this tree (it was the source). */
  emitTransferred(event: OgeTreeTransferredEvent<unknown>): void;
}

// `/* @__PURE__ */` keeps the module tree-shakable (see grid-columns.ts)
const peers = /* @__PURE__ */ new Set<OgeTreeDragPeer>();
const clipboards = /* @__PURE__ */ new Map<
  string,
  { treeId: string; key: RowKey }
>();

/**
 * The group a tree moves nodes within: its `dragGroup`, or a private group
 * of its own when it has none — so an ungrouped tree only ever sees itself.
 */
export function ogeTreeDragGroupOf(
  dragGroup: string | null | undefined,
  treeId: string,
): string {
  return dragGroup ? `group:${dragGroup}` : `tree:${treeId}`;
}

/** Registers a peer; returns the unregister function (which also drops its cut). */
export function registerOgeTreeDragPeer(peer: OgeTreeDragPeer): () => void {
  peers.add(peer);
  return () => {
    peers.delete(peer);
    for (const [group, entry] of clipboards) {
      if (entry.treeId === peer.treeId()) clipboards.delete(group);
    }
  };
}

/** Number of registered peers (diagnostics, specs). */
export function ogeTreeDragPeerCount(): number {
  return peers.size;
}

function peerById(group: string, treeId: string): OgeTreeDragPeer | null {
  for (const peer of peers) {
    if (peer.group() === group && peer.treeId() === treeId) return peer;
  }
  return null;
}

/**
 * The peer of `self`'s group whose host contains `hit` — the innermost one
 * when hosts nest. No hit at all (an environment without hit-testing) means
 * `self`; a hit outside every peer means none.
 */
export function ogeTreeDragPeerAt(
  self: OgeTreeDragPeer,
  hit: Element | null,
): OgeTreeDragPeer | null {
  if (!hit) return self;
  const group = self.group();
  let best: OgeTreeDragPeer | null = null;
  let bestElement: Element | null = null;
  const candidates = peers.has(self) ? peers : new Set([...peers, self]);
  for (const peer of candidates) {
    if (peer.group() !== group) continue;
    const element = peer.element();
    if (!element || !element.contains(hit)) continue;
    if (!bestElement || bestElement.contains(element)) {
      best = peer;
      bestElement = element;
    }
  }
  return best;
}

/**
 * The drop spot under `clientY` inside `peer`: the row whose box spans the
 * pointer, its drop zone (`before` / `inside` / `after`), and the peer's
 * veto. `null` when no droppable row is there.
 */
export function ogeTreeLocateDrop(
  peer: OgeTreeDragPeer,
  source: OgeTreeDragSource,
  clientY: number,
): (OgeTreeDragTarget & { readonly row: OgeTreeDragRowInfo }) | null {
  for (const element of peer.rows()) {
    const rect = element.getBoundingClientRect();
    if (clientY < rect.top || clientY > rect.bottom) continue;
    const dataKey = element.getAttribute('data-key');
    if (dataKey === null) return null;
    const row = peer.rowInfo(dataKey);
    if (!row || !peer.canDrop(source, row.key)) return null;
    return {
      treeId: peer.treeId(),
      key: row.key,
      position: resolveTreeDropPosition(clientY, rect, peer.allowDropInside()),
      row,
    };
  }
  return null;
}

/** Describes `key` of `peer` as a move source; `null` when unknown. */
export function ogeTreeDragSourceOf(
  peer: OgeTreeDragPeer,
  key: RowKey,
): OgeTreeDragSource | null {
  const item = peer.itemOf(key);
  if (item === undefined) return null;
  return { treeId: peer.treeId(), key, item, text: peer.textOf(key) };
}

/**
 * The one commit path of every move — pointer drop, Ctrl+V and the API:
 * `itemReordering` (cancelable) and `itemReordered` on the target, then
 * `itemTransferred` on the source when the trees differ, then the
 * announcement. Returns whether the move committed.
 */
export function ogeTreeCommitMove(input: {
  source: OgeTreeDragPeer;
  target: OgeTreeDragPeer;
  dragKey: RowKey;
  dropKey: RowKey;
  position: OgeTreeDropPosition;
  trigger: OgeTreeMoveSource;
  event?: Event;
  /** Announce the result (the keyboard twin always does). Default `true`. */
  announce?: boolean;
}): boolean {
  const { source, target, dragKey, dropKey, position } = input;
  const dragItem = source.itemOf(dragKey);
  const dropItem = target.itemOf(dropKey);
  if (dragItem === undefined || dropItem === undefined) return false;
  const payload = {
    dragKey,
    dragItem,
    dropKey,
    dropItem,
    position,
    sourceTreeId: source.treeId(),
    targetTreeId: target.treeId(),
    trigger: input.trigger,
    event: input.event,
  };
  const reordering: OgeTreeReorderingEvent<unknown> = {
    ...payload,
    cancel: false,
  };
  target.emitReordering(reordering);
  if (reordering.cancel) return false;
  target.emitReordered(payload);
  if (source !== target) source.emitTransferred(payload);
  if (input.announce !== false) {
    target.announce(
      ogeFormatMessage(target.messages().movedAnnouncement, {
        item: source.textOf(dragKey),
        target: target.textOf(dropKey),
        position,
      }),
    );
  }
  return true;
}

// --- keyboard twin: cut & paste ----------------------------------------------

/** What a key on a focused row means for moving nodes. */
export type OgeTreeTransferKeyAction = 'cut' | 'paste' | 'paste-after' | null;

/**
 * Ctrl/⌘+X cuts the focused node, Ctrl/⌘+V pastes the cut node into the
 * focused one (or after it when `inside` drops are off), Ctrl/⌘+Shift+V
 * pastes it after the focused node.
 */
export function planTreeTransferKey(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): OgeTreeTransferKeyAction {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'x' && !event.shiftKey) return 'cut';
  if (key === 'v') return event.shiftKey ? 'paste-after' : 'paste';
  return null;
}

/** The `aria-keyshortcuts` a row advertises while moving is enabled. */
export const OGE_TREE_TRANSFER_SHORTCUTS = 'Control+X Control+V';

/** The key the group's clipboard holds, when it came from `peer`. */
export function ogeTreeCutKey(peer: OgeTreeDragPeer): RowKey | null {
  const entry = clipboards.get(peer.group());
  return entry && entry.treeId === peer.treeId() ? entry.key : null;
}

/** Whether the group of `peer` holds a cut node. */
export function ogeTreeHasCut(peer: OgeTreeDragPeer): boolean {
  return clipboards.has(peer.group());
}

/** Ctrl+X: marks `key` as the node the next paste in the group moves. */
export function ogeTreeCut(peer: OgeTreeDragPeer, key: RowKey): boolean {
  const source = ogeTreeDragSourceOf(peer, key);
  if (!source) return false;
  const group = peer.group();
  const previous = clipboards.get(group);
  if (previous) peerById(group, previous.treeId)?.setCut(null);
  clipboards.set(group, { treeId: source.treeId, key });
  peer.setCut(key);
  peer.announce(
    ogeFormatMessage(peer.messages().cutAnnouncement, { item: source.text }),
  );
  return true;
}

/** Escape: drops a cut this tree holds. Returns whether there was one. */
export function ogeTreeCancelCut(
  peer: OgeTreeDragPeer,
  announce = true,
): boolean {
  const group = peer.group();
  const entry = clipboards.get(group);
  if (!entry) return false;
  clipboards.delete(group);
  peerById(group, entry.treeId)?.setCut(null);
  if (peer.treeId() !== entry.treeId) peer.setCut(null);
  if (announce) peer.announce(peer.messages().moveCancelledAnnouncement);
  return true;
}

/**
 * Ctrl+V: moves the group's cut node onto `dropKey` of `target` through
 * {@link ogeTreeCommitMove}. A spot the node cannot take (its own subtree)
 * is announced and keeps the cut, so the user can pick another target.
 */
export function ogeTreePaste(
  target: OgeTreeDragPeer,
  dropKey: RowKey,
  position: OgeTreeDropPosition,
  event?: Event,
): boolean {
  const group = target.group();
  const entry = clipboards.get(group);
  if (!entry) return false;
  const sourcePeer = peerById(group, entry.treeId);
  const source = sourcePeer ? ogeTreeDragSourceOf(sourcePeer, entry.key) : null;
  if (!sourcePeer || !source) {
    clipboards.delete(group);
    return false;
  }
  if (!target.canDrop(source, dropKey)) {
    target.announce(
      ogeFormatMessage(target.messages().moveRejectedAnnouncement, {
        item: source.text,
      }),
    );
    return false;
  }
  clipboards.delete(group);
  sourcePeer.setCut(null);
  return ogeTreeCommitMove({
    source: sourcePeer,
    target,
    dragKey: entry.key,
    dropKey,
    position,
    trigger: 'keyboard',
    event,
  });
}

// --- pointer session ---------------------------------------------------------

/** Options of {@link beginOgeTreeDrag}. */
export interface OgeTreeDragOptions {
  /** The tree the drag starts in. */
  peer: OgeTreeDragPeer;
  /** The node being dragged. */
  key: RowKey;
  /** The row element — pointer capture and the ghost preview. */
  row: Element | null;
  /** The source tree's scroll container, edge-auto-scrolled while dragging. */
  autoScroll?: HTMLElement | null;
  /** The drag started (first move past the threshold). */
  onStart?(): void;
  /** Always last; clear the dragging state here. */
  onEnd?(result: { dropped: boolean; cancelled: boolean }): void;
}

type Spot = {
  readonly peer: OgeTreeDragPeer;
  readonly target: OgeTreeDragTarget & { readonly row: OgeTreeDragRowInfo };
};

/**
 * Starts a node drag from `pointerdown` on top of `beginPointerDragDrop`:
 * the 4px tree threshold, the house touch long press (rows stay scrollable
 * at rest), a ghost, auto-scroll, capture-phase Escape, cross-tree
 * hit-testing, hover-to-expand after {@link OGE_TREE_DRAG_HOVER_EXPAND_MS},
 * and the drop through {@link ogeTreeCommitMove}.
 */
export function beginOgeTreeDrag(
  event: OgePointerGestureInput,
  options: OgeTreeDragOptions,
): OgePointerGestureHandle | null {
  const self = options.peer;
  const source = ogeTreeDragSourceOf(self, options.key);
  if (!source) return null;
  let shown: OgeTreeDragPeer | null = null;
  let hoverKey: RowKey | null = null;
  let hoverTreeId: string | null = null;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let lastEvent: PointerEvent | undefined;

  const clearHover = (): void => {
    if (hoverTimer !== null) clearTimeout(hoverTimer);
    hoverTimer = null;
    hoverKey = null;
    hoverTreeId = null;
  };
  const armHover = (spot: Spot | null): void => {
    const row = spot?.target.row;
    const arm =
      !!spot &&
      !!row &&
      spot.target.position === 'inside' &&
      row.hasChildren &&
      !row.expanded;
    if (!arm || !spot) {
      if (hoverKey !== null) clearHover();
      return;
    }
    if (hoverKey === spot.target.key && hoverTreeId === spot.target.treeId) {
      return;
    }
    clearHover();
    hoverKey = spot.target.key;
    hoverTreeId = spot.target.treeId;
    const { peer, target } = spot;
    hoverTimer = setTimeout(() => {
      hoverTimer = null;
      peer.expand(target.key);
    }, OGE_TREE_DRAG_HOVER_EXPAND_MS);
  };

  const drag: OgePointerDragDropOptions<Spot> = {
    source: options.row,
    ghost: options.row ?? false,
    autoScroll: options.autoScroll ?? null,
    threshold: OGE_TREE_DRAG_THRESHOLD,
    longPress: OGE_LONG_PRESS_DELAY,
    resolve(hit, moveEvent) {
      lastEvent = moveEvent;
      const peer = ogeTreeDragPeerAt(self, hit);
      if (!peer) return null;
      const target = ogeTreeLocateDrop(peer, source, moveEvent.clientY);
      return target ? { peer, target } : null;
    },
    onStart: () => options.onStart?.(),
    onOver(spot) {
      const peer = spot?.peer ?? null;
      if (shown && shown !== peer) shown.preview(null);
      shown = peer;
      peer?.preview(spot ? spot.target : null);
      armHover(spot);
    },
    onDrop(spot) {
      ogeTreeCommitMove({
        source: self,
        target: spot.peer,
        dragKey: source.key,
        dropKey: spot.target.key,
        position: spot.target.position,
        trigger: 'pointer',
        event: lastEvent,
      });
    },
    onEnd(result) {
      clearHover();
      shown?.preview(null);
      shown = null;
      options.onEnd?.(result);
    },
  };
  return beginPointerDragDrop(event, drag);
}
