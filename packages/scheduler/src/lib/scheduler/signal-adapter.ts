import { computed, signal } from '@angular/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * Angular's reactivity, in the shape `@oge-ui/scheduler-engine`'s
 * `OgeSchedulerCore` consumes (ADR 0003): cells are `signal()`s and derived
 * values `computed()`s, so every member keeps driving change detection
 * exactly as before while the shell's logic lives in one place for both
 * render layers.
 *
 * Each Angular package declares its own copy on purpose — the engine may
 * not import `@angular/core`, so there is nowhere shared to put it.
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
