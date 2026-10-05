/**
 * Cross-board drag: every mounted board with a `dragGroup` registers a peer
 * here, and a card drag that leaves its own board hit-tests the other peers
 * of the same group — no HTML5 drag and drop, the shared pointer gesture
 * keeps running on the source board. The target peer measures itself,
 * previews the placeholder and receives the items through its own
 * cancelable `cardTransferring` pipeline. The module-level registry only
 * fills after mount, so it is SSR-safe.
 */
import type { KanbanCard, KanbanColumnDef } from './board-model';
import type { KanbanDragTarget } from './interaction';

/** Cards handed from one board to another. */
export interface KanbanTransfer<T = unknown> {
  /** The source items, in board order. */
  readonly items: readonly T[];
  /** The normalized source cards (titles for announcements). */
  readonly cards: readonly KanbanCard<T>[];
  readonly fromBoard: string;
  /** The dragged card's column and lane on the source board. */
  readonly fromColumn: string;
  readonly fromSwimlane: string | null;
  /** Where the cards land on the target board. */
  readonly target: KanbanDragTarget;
}

/** What a target board reports back after a transfer. */
export interface KanbanTransferResult<T = unknown> {
  /** The items as they landed (column / swimlane written). */
  readonly items: readonly T[];
  readonly toBoard: string;
  readonly toColumn: string;
  readonly toSwimlane: string | null;
  readonly toIndex: number;
}

/** One mounted board, as the other boards of its group see it. */
export interface KanbanBoardPeer {
  readonly id: string;
  readonly group: string;
  readonly host: HTMLElement;
  /** Drop target for incoming cards at a viewport point (`null` = none). */
  targetAt(clientX: number, clientY: number): KanbanDragTarget | null;
  /** Shows (or, with `null`, clears) the incoming placeholder. */
  preview(target: KanbanDragTarget | null): void;
  /** Inserts transferred items; `null` = vetoed or impossible. */
  receive(transfer: KanbanTransfer<unknown>): KanbanTransferResult | null;
  /** The visible columns (the move-to-board menu offers their first legal one). */
  columns(): readonly KanbanColumnDef[];
}

const peers = new Set<KanbanBoardPeer>();

/** Registers a mounted board; returns the unregister function. */
export function registerKanbanBoard(peer: KanbanBoardPeer): () => void {
  peers.add(peer);
  return () => {
    peers.delete(peer);
  };
}

/** The other mounted boards of `group`, in mount order. */
export function kanbanBoardPeers(
  group: string | undefined,
  excludeId: string,
): KanbanBoardPeer[] {
  if (group === undefined || group === '') return [];
  return [...peers].filter(
    (peer) => peer.group === group && peer.id !== excludeId,
  );
}

/**
 * The peer of `group` under a viewport point (innermost first, so a board
 * nested in another wins), or `null`. Unmeasured (zero-size) hosts never
 * match — jsdom specs pick the peer explicitly instead.
 */
export function kanbanPeerAt(
  group: string | undefined,
  excludeId: string,
  clientX: number,
  clientY: number,
): KanbanBoardPeer | null {
  let hit: KanbanBoardPeer | null = null;
  for (const peer of kanbanBoardPeers(group, excludeId)) {
    const rect = peer.host.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      if (hit === null || hit.host.contains(peer.host)) hit = peer;
    }
  }
  return hit;
}

/** Whether a viewport point lies inside `host` (unmeasured = inside). */
export function isInsideKanbanHost(
  host: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const rect = host.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return true;
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

let boardCounter = 0;

/**
 * A fallback board id for boards without `boardId`. It only labels transfer
 * events (never a DOM id), so a module counter is acceptable here.
 */
export function nextKanbanBoardId(): string {
  boardCounter += 1;
  return `kanban-${boardCounter}`;
}
