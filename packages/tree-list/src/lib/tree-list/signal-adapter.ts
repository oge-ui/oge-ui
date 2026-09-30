import { computed, signal, type WritableSignal } from '@angular/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * Angular's reactivity, in the shape the shared `@oge-ui/behavior` machines
 * consume (ADR 0001): cells are `signal()`s and derived values `computed()`s,
 * so every member of `OgeTreeListCore` participates in change detection
 * exactly like the component's own computeds did before the extraction.
 *
 * Each Angular package declares its own copy on purpose — `@oge-ui/behavior`
 * may not import `@angular/core`, so there is nowhere shared to put it.
 */
export const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    return cellOf(signal(initial));
  },
  derived: (compute) => computed(compute),
};

/** Hands an existing (public) writable signal to a core as its cell. */
export function cellOf<T>(state: WritableSignal<T>): OgeReactiveCell<T> {
  const cell = (() => state()) as OgeReactiveCell<T>;
  cell.set = (value) => state.set(value);
  return cell;
}
