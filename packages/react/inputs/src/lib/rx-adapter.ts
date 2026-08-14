'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of `@oge-ui/behavior`'s reactivity contract: cells are plain
 * closures that bump a version reducer on write (the component re-renders
 * and re-reads), derived values recompute on call — no memo, because React
 * re-renders on every bump anyway and the machines' computations are cheap
 * list passes, the same complexity a signal graph pays.
 */
export function createBumpAdapter(bump: () => void): OgeReactivityAdapter {
  return {
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeReactiveCell<T>;
      cell.set = (next) => {
        value = next;
        bump();
      };
      return cell;
    },
    derived: (compute) => compute,
  };
}
