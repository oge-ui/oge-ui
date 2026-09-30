import { computed, signal } from '@angular/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * Angular's reactivity, in the shape `@oge-ui/pivot-engine`'s cores consume
 * (ADR 0001 / 0003): cells are `signal()`s and derived values `computed()`s,
 * so every member the template reads keeps participating in change detection
 * while the semantics live once for both render layers.
 *
 * Each Angular package declares its own copy on purpose — the engine may not
 * import `@angular/core`, so there is nowhere shared to put it.
 */
export const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};
