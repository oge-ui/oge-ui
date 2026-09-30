import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * A plain-closure adapter with no memoization: every derived read recomputes.
 * Specs run the cores against it, which proves the machines do not depend on
 * either framework's caching (ARCHITECTURE → Testing).
 */
export const PLAIN_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};
