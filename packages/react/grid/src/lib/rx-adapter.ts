'use client';

import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * React's face of `@oge-ui/behavior`'s reactivity contract, tuned for the
 * grid: cells are plain closures that ask the component to re-render on
 * write; derived values track what they read and recompute only when one of
 * those cells (or derived values) changed — the "once per change" cost an
 * Angular `computed` pays.
 *
 * Derived values also read props through closures, which no cell sees, so the
 * host calls {@link OgeGridRxAdapter.invalidate} at the start of every render
 * with the inputs those closures expose (props, config, messages). When they
 * are the same objects — a re-render the grid asked for itself, a scroll, a
 * hover — nothing is invalidated, and a scroll over 100 000 rows no longer
 * rebuilds the row offsets or the resolved columns on every frame.
 */
export interface OgeGridRxAdapter extends OgeReactivityAdapter {
  /**
   * Invalidates every derived value when any of `inputs` is a different
   * object than at the last call (without arguments: always).
   */
  invalidate(...inputs: readonly unknown[]): void;
  /**
   * Runs `write` without asking for a re-render: for state the render in
   * progress writes before it reads it (the first page of a server or
   * hydration render), where a re-render request would be a render-phase
   * update.
   */
  quietly(write: () => void): void;
}

interface Source {
  /** Bumped whenever the value changes. */
  ver: number;
  /** Brings a derived value up to date (cells need nothing). */
  refresh?(): void;
}

export function createGridRxAdapter(bump: () => void): OgeGridRxAdapter {
  /** Any change at all: lets a derived value skip its dependency walk. */
  let world = 0;
  /** Changes of the inputs no cell sees (props, config, messages). */
  let epoch = 0;
  let quiet = 0;
  let lastInputs: readonly unknown[] | null = null;
  /** The dependency set of the derived value being computed. */
  let tracking: Set<Source> | null = null;

  return {
    invalidate(...inputs) {
      const same =
        inputs.length > 0 &&
        lastInputs !== null &&
        lastInputs.length === inputs.length &&
        inputs.every((input, i) => Object.is(input, lastInputs?.[i]));
      lastInputs = inputs;
      if (same) return;
      epoch += 1;
      world += 1;
    },
    quietly(write) {
      quiet += 1;
      try {
        write();
      } finally {
        quiet -= 1;
      }
    },
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const source: Source = { ver: 0 };
      const cell = (() => {
        tracking?.add(source);
        return value;
      }) as OgeReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(value, next)) return;
        value = next;
        source.ver += 1;
        world += 1;
        if (quiet === 0) bump();
      };
      return cell;
    },
    derived<T>(compute: () => T): () => T {
      let cached: T;
      let computed = false;
      let deps: [Source, number][] = [];
      let epochSeen = -1;
      let checkedAt = -1;
      const source: Source = {
        ver: 0,
        refresh() {
          if (checkedAt === world) return;
          const fresh =
            computed &&
            epochSeen === epoch &&
            deps.every(([dep, ver]) => {
              dep.refresh?.();
              return dep.ver === ver;
            });
          if (!fresh) {
            const outer = tracking;
            const used = new Set<Source>();
            tracking = used;
            let next: T;
            try {
              // reads inside may write no cells, so the world is stable here
              next = compute();
            } finally {
              tracking = outer;
            }
            deps = [...used].map((dep) => [dep, dep.ver]);
            epochSeen = epoch;
            if (!computed || !Object.is(next, cached)) {
              cached = next;
              source.ver += 1;
            }
            computed = true;
          }
          checkedAt = world;
        },
      };
      return () => {
        source.refresh?.();
        tracking?.add(source);
        return cached;
      };
    },
  };
}
