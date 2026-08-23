import { computed, signal } from '@angular/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * Angular's reactivity, in the shape the shared `@oge-ui/behavior` state
 * classes consume (ADR 0001).
 *
 * The slices in this folder are thin Angular seams over framework-free state:
 * they hand the core `signal()` / `computed()`, so every member keeps driving
 * change detection exactly as before while what a sort toggle or a shift-range
 * *means* lives in one place for both render layers.
 *
 * Each Angular package declares its own copy on purpose — `@oge-ui/behavior`
 * may not import `@angular/core`, so there is nowhere shared to put it.
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
