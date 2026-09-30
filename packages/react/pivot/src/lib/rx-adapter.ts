'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of `@oge-ui/behavior`'s reactivity contract, tuned for the
 * pivot: derived values track the cells they read and recompute only when
 * one of those changed — the same "once per change" cost an Angular
 * `computed` pays.
 *
 * The grid's adapter invalidates every derived value once per render, which
 * is cheap there because its expensive work is windowed. The pivot's is not:
 * its data-dependent phase (`PivotEngine`, one pass over every row) would
 * re-run on each scroll frame of a virtualized 50 000-row matrix. So this
 * adapter keeps a dependency list per derived value, and the component's
 * props enter through cells as well ({@link OgePivotRxAdapter.input}), written
 * quietly during render — a prop that did not change (by `Object.is`) leaves
 * everything that reads it cached.
 */
export interface OgePivotRxAdapter extends OgeReactivityAdapter {
  /**
   * A cell the host writes during render (props): `set` records the change
   * for dependency tracking but does not request another render — the host
   * is already rendering.
   */
  input<T>(initial: T): OgeReactiveCell<T>;
}

interface Source {
  version: number;
  refresh?: () => void;
}

export function createPivotRxAdapter(bump: () => void): OgePivotRxAdapter {
  /** Dependencies being collected by the derived value now computing. */
  let collecting: Set<Source> | null = null;
  /** Bumped by every cell write — a derived value checked at this epoch is fresh. */
  let epoch = 0;

  function makeCell<T>(initial: T, notify: boolean): OgeReactiveCell<T> {
    let value = initial;
    const node: Source = { version: 0 };
    const cell = (() => {
      collecting?.add(node);
      return value;
    }) as OgeReactiveCell<T>;
    cell.set = (next) => {
      if (Object.is(value, next)) return;
      value = next;
      node.version += 1;
      epoch += 1;
      if (notify) bump();
    };
    return cell;
  }

  return {
    cell: <T>(initial: T) => makeCell(initial, true),
    input: <T>(initial: T) => makeCell(initial, false),
    derived<T>(compute: () => T): () => T {
      const node: Source = { version: 0 };
      let deps: [Source, number][] | null = null;
      let checkedAt = -1;
      let value: T;
      const refresh = (): void => {
        if (checkedAt === epoch) return;
        if (deps) {
          let stale = false;
          for (const [dep, seen] of deps) {
            dep.refresh?.();
            if (dep.version !== seen) {
              stale = true;
              break;
            }
          }
          if (!stale) {
            checkedAt = epoch;
            return;
          }
        }
        const outer = collecting;
        const read = new Set<Source>();
        collecting = read;
        try {
          const next = compute();
          if (deps === null || !Object.is(next, value)) {
            value = next;
            node.version += 1;
          }
        } finally {
          collecting = outer;
        }
        deps = [...read].map((dep) => [dep, dep.version]);
        checkedAt = epoch;
      };
      node.refresh = refresh;
      return () => {
        refresh();
        collecting?.add(node);
        return value;
      };
    },
  };
}
