'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of `@oge-ui/behavior`'s reactivity contract: cells are plain
 * closures that bump a version reducer on write (the component re-renders and
 * re-reads), derived values recompute on call — no memo, because React
 * re-renders on every bump anyway and the machines' computations are cheap
 * list passes, the same complexity a signal graph pays.
 *
 * The same 15-line idiom the inputs family carries; per `docs/ARCHITECTURE.md`
 * these Angular-shaped conventions are copied per package rather than hoisted
 * into a shared plumbing library.
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
