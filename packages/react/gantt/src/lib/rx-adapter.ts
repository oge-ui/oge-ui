'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of `@oge-ui/behavior`'s reactivity contract, tuned for the
 * Gantt core: cells are plain closures that bump a version and ask the
 * component to re-render on write; derived values are memoized per version,
 * so the task tree, the scale and the bar geometry are each computed once per
 * render no matter how many getters read them — the same "once per change"
 * cost an Angular `computed` pays.
 *
 * The host bumps the version at the start of every render as well, because
 * props (which the core reads through closures) can change without any cell
 * being written. The same idiom the grid package carries; per
 * `docs/ARCHITECTURE.md` it is copied per package rather than hoisted.
 */
export interface OgeGanttRxAdapter extends OgeReactivityAdapter {
  /** Invalidates every derived value — call once per render. */
  invalidate(): void;
}

export function createGanttRxAdapter(bump: () => void): OgeGanttRxAdapter {
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
          cached = compute();
          seen = version;
        }
        return cached;
      };
    },
  };
}
