'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of `@oge-ui/behavior`'s reactivity contract, tuned for the
 * grid: cells are plain closures that bump a version and ask the component to
 * re-render on write; derived values are memoized per version, so the offset
 * tree, the resolved columns and the view window are each computed once per
 * render no matter how many getters read them — the same "once per change"
 * cost an Angular `computed` pays.
 *
 * The host bumps the version at the start of every render as well, because
 * props (which the machines read through closures) can change without any
 * cell being written.
 */
export interface OgeGridRxAdapter extends OgeReactivityAdapter {
  /** Invalidates every derived value — call once per render. */
  invalidate(): void;
}

export function createGridRxAdapter(bump: () => void): OgeGridRxAdapter {
  let version = 0;
  return {
    invalidate() {
      version += 1;
    },
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(value, next)) return;
        value = next;
        version += 1;
        bump();
      };
      return cell;
    },
    derived<T>(compute: () => T): () => T {
      let seen = -1;
      let cached: T;
      return () => {
        if (seen !== version) {
          // reads inside may write no cells, so the version is stable here
          cached = compute();
          seen = version;
        }
        return cached;
      };
    },
  };
}
