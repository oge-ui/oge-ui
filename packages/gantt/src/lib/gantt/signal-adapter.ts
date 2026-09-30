import { computed, signal } from '@angular/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';

/**
 * Angular's reactivity, in the shape `@oge-ui/gantt-engine`'s
 * `OgeGanttCore` consumes (ADR 0001 / 0003): cells are `signal()`s, derived
 * values `computed()`s, so every view model the core builds keeps driving
 * change detection exactly as the component's own signals used to.
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
