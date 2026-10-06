import { computed, signal } from '@angular/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * Angular's reactivity in the shape `@oge-ui/behavior`'s machines consume
 * (ADR 0001): cells are `signal()`s, derived values `computed()`s. Each
 * Angular package declares its own copy — `behavior` may not import
 * `@angular/core`, so there is nowhere shared to put it.
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
