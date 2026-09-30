'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of the reactivity contract `@oge-ui/scheduler-engine`'s
 * `OgeSchedulerCore` consumes (the grid's adapter, same shape): cells are
 * plain closures that bump a version and ask the component to re-render on
 * write; derived values are memoized per version, so the normalized
 * appointments, the visible window and the period title are each computed
 * once per render — the same "once per change" cost an Angular `computed`
 * pays.
 *
 * The host bumps the version at the start of every render as well, because
 * props (which the core reads through closures) can change without any cell
 * being written.
 */
export interface OgeSchedulerRxAdapter extends OgeReactivityAdapter {
  /** Invalidates every derived value — call once per render. */
  invalidate(): void;
}

export function createSchedulerRxAdapter(
  bump: () => void,
): OgeSchedulerRxAdapter {
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
