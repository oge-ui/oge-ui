import type { RowKey } from '@oge-ui/core';

/**
 * Cross-component row drag & drop (`rowDragGroup`): grids — and anything else
 * that registers — sharing a group name accept each other's rows. Framework-
 * free and DOM-light (ADR 0001): a participant registers its host element and
 * three callbacks, and the dragging grid hit-tests the element under the
 * pointer against the registry instead of only against itself.
 *
 * The drag itself is still `beginPointerDragDrop` in the source grid; a drop
 * on another participant runs that participant's `drop`, which fires its
 * `rowDrop` event. Data is the consumer's: the grids move nothing across
 * component boundaries themselves, exactly like DevExtreme's `onAdd`.
 */

/** Where a dragged row lands relative to the target row. */
export type OgeRowDropPosition = 'before' | 'after' | 'inside';

/** The row being dragged, as every participant sees it. */
export interface OgeRowDragSource {
  /** The source component's id (its host `id`, else an internal id). */
  readonly componentId: string;
  readonly key: RowKey;
  readonly row: unknown;
}

/** A resolved drop target inside one participant. */
export interface OgeRowDragTarget {
  readonly componentId: string;
  /** The row under the pointer; `null` for the empty area after the last row. */
  readonly key: RowKey | null;
  readonly row: unknown;
  readonly position: OgeRowDropPosition;
  /** Position among the target's data rows the drop inserts at. */
  readonly index: number;
}

/** One registered drop zone. */
export interface OgeRowDragParticipant {
  readonly componentId: string;
  readonly group: string;
  /** The host element hits are tested against. */
  readonly element: () => Element | null;
  /** Maps a hit inside the host to a target (`null`: not a drop spot). */
  resolve(hit: Element, clientY: number, source: OgeRowDragSource): OgeRowDragTarget | null;
  /** The drag hovers this participant (`target`) or left it (`null`). */
  over(source: OgeRowDragSource, target: OgeRowDragTarget | null): void;
  /** A committed drop on this participant. */
  drop(source: OgeRowDragSource, target: OgeRowDragTarget): void;
}

// `/* @__PURE__ */` keeps the module tree-shakable (see grid-columns.ts)
const participants = /* @__PURE__ */ new Set<OgeRowDragParticipant>();

/** Registers a drop zone; returns the unregister function. */
export function registerOgeRowDragParticipant(
  participant: OgeRowDragParticipant,
): () => void {
  participants.add(participant);
  return () => {
    participants.delete(participant);
  };
}

/**
 * The participant of `group` whose host contains `hit` — the innermost one
 * when hosts nest (a grid inside another grid's detail row).
 */
export function findOgeRowDragParticipant(
  hit: Element | null,
  group: string,
): OgeRowDragParticipant | null {
  if (!hit) return null;
  let best: OgeRowDragParticipant | null = null;
  let bestElement: Element | null = null;
  for (const participant of participants) {
    if (participant.group !== group) continue;
    const element = participant.element();
    if (!element || !element.contains(hit)) continue;
    if (!bestElement || bestElement.contains(element)) {
      best = participant;
      bestElement = element;
    }
  }
  return best;
}

/**
 * Which part of a row the pointer is over: the top quarter means `before`,
 * the bottom quarter `after`, the middle `inside` when inside drops are
 * allowed (otherwise the upper / lower half).
 */
export function ogeRowDropPosition(
  rect: { top: number; height: number },
  clientY: number,
  allowInside: boolean,
): OgeRowDropPosition {
  const offset = (clientY - rect.top) / (rect.height || 1);
  if (allowInside) {
    if (offset < 0.25) return 'before';
    if (offset > 0.75) return 'after';
    return 'inside';
  }
  return offset < 0.5 ? 'before' : 'after';
}

/** Number of registered participants (diagnostics, specs). */
export function ogeRowDragParticipantCount(): number {
  return participants.size;
}
