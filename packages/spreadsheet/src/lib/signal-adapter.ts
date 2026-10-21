import { computed, signal } from '@angular/core';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '@oge-ui/spreadsheet-engine';

/**
 * Angular's reactivity, in the shape `@oge-ui/spreadsheet-engine`'s
 * `OgeSpreadsheetCore` consumes (ADR 0003): cells are `signal()`s, derived
 * values `computed()`s, so every view model the core builds drives change
 * detection like the component's own signals.
 *
 * Each Angular package declares its own copy on purpose — the engine may not
 * import `@angular/core`, so there is nowhere shared to put it.
 */
export const SIGNAL_ADAPTER: OgeSpreadsheetReactivity = {
  cell<T>(initial: T): OgeSpreadsheetReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeSpreadsheetReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};
