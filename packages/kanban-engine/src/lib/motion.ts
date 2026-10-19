/**
 * The board's layout motion, shared by both render layers and built on
 * `@oge-ui/behavior`'s motion layer: the lifted drag preview settles into
 * the card's new slot (or glides home when the drop is cancelled or
 * vetoed), and cards FLIP between their old and new boxes when a move,
 * a transfer, a search or a filter reshapes the board. Everything no-ops
 * under reduced motion and without `Element.animate` (SSR, jsdom).
 */
import {
  createOgeLayoutAnimator,
  ogeMotionEnabled,
  ogeMotionTiming,
  ogeOwnedElement,
  ogeRectOf,
  ogeSettleGhost,
  type OgeLayoutAnimator,
} from '@oge-ui/behavior';
import type { KanbanSwimlane } from './board-model';

/** The board host selector — cards of a nested board are not this board's. */
const BOARD = '.oge-kanban';

/** The rendered card with `key` (its `data-key`) on the board `host`. */
export function kanbanCardElement(
  host: Element | null | undefined,
  key: string,
): HTMLElement | null {
  return ogeOwnedElement(
    host,
    '.oge-kanban-card[data-key]',
    'data-key',
    key,
    BOARD,
  );
}

/**
 * What the board's card layout looks like — lane, column and card order.
 * The card animator plays when (and only when) it changes; drag state,
 * virtual windows and scrolling are not part of it.
 */
export function kanbanLayoutSignature(
  lanes: readonly KanbanSwimlane<unknown>[],
): string {
  return lanes
    .map(
      (lane) =>
        `${lane.key ?? ''}{${lane.columns
          .map(
            (cell) =>
              `${cell.column.key}:${cell.cards.map((card) => String(card.key)).join(',')}`,
          )
          .join(';')}}`,
    )
    .join('|');
}

/** The board's card animator (see {@link createKanbanCardAnimator}). */
export type KanbanCardAnimator = OgeLayoutAnimator<string>;

/**
 * The FLIP animator of a board's cards, keyed by `data-key`. Capture before
 * a state write, play after the render; leaving cards just go (a ghost
 * appended to the page would lose the board's tokens).
 */
export function createKanbanCardAnimator(
  host: HTMLElement,
): KanbanCardAnimator {
  return createOgeLayoutAnimator<string>({
    root: host,
    exit: false,
    query: () =>
      Array.from(
        host.querySelectorAll<HTMLElement>('.oge-kanban-card[data-key]'),
      )
        .filter((el) => el.closest(BOARD) === host)
        .map((el) => [el.getAttribute('data-key') ?? '', el] as const),
  });
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function')
      requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });

/**
 * Settles the lifted drag preview of `host` onto `to()`: call it when the
 * drag finishes, before the state write that removes the preview. The
 * preview is cloned at once (the render is about to remove it); two frames
 * later — the board rendered the drop — the clone glides onto the element
 * `to()` answers (the card in its new slot, or back at its origin after a
 * cancelled or vetoed drop), drops its tilt and lift, and is removed. When
 * `to()` answers `null` (the card is filtered out or scrolled out of a
 * virtual window) the clone fades where it is.
 */
export function settleKanbanDragPreview(
  host: HTMLElement | null | undefined,
  to: () => Element | null,
): void {
  const preview = host
    ? Array.from(
        host.querySelectorAll<HTMLElement>(
          '.oge-kanban-drag-preview:not([data-oge-settling])',
        ),
      ).find((el) => el.closest(BOARD) === host)
    : undefined;
  if (!preview || !ogeMotionEnabled(preview)) return;
  const ghost = preview.cloneNode(true) as HTMLElement;
  ghost.setAttribute('data-oge-settling', '');
  ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  preview.after(ghost);
  const done = (): void => ghost.remove();
  void nextFrame()
    .then(nextFrame)
    .then((): Promise<unknown> | undefined => {
      if (!ghost.isConnected) return undefined;
      const dest = to();
      const rect = dest ? ogeRectOf(dest) : null;
      ghost.classList.add('oge-kanban-drag-settling');
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        const timing = ogeMotionTiming(ghost, 'fast', 'accelerate');
        return ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: timing.duration,
          easing: timing.easing,
          fill: 'forwards',
        }).finished;
      }
      return ogeSettleGhost(ghost, rect);
    })
    .then(done, done);
}
