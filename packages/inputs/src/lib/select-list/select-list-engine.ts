import { computed, signal } from '@angular/core';
import {
  OgeSelectListCore,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeSelectListCoreDeps,
  type OgeSelectListRow,
} from '@oge-ui/behavior';

/** A rendered dropdown row — re-exported from the shared machine. */
export type SelectListRow<TItem> = OgeSelectListRow<TItem>;

/** Signal getters the owning component wires into the engine. */
export type SelectListEngineDeps<TItem> = OgeSelectListCoreDeps<TItem>;

/** Angular's reactivity, in the shape the shared machine consumes. */
const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/**
 * The dropdown editors' list model (`OgeSelectBox`, `OgeTagBox`,
 * `OgeAutocomplete`): expression resolution, option ids, active-option
 * bookkeeping, client-side filtering with debounce, flat-data grouping and
 * the lazy items-function state machine.
 *
 * Since ADR 0001 Faz 3 the machine itself is `@oge-ui/behavior`'s
 * `OgeSelectListCore`, shared verbatim with the React dropdown editors; this
 * class is the Angular seam — it hands the machine `signal()`/`computed()`
 * as its reactivity, so every derived member keeps participating in change
 * detection exactly as before.
 */
export class SelectListEngine<TItem> extends OgeSelectListCore<TItem> {
  constructor(deps: SelectListEngineDeps<TItem>) {
    super(deps, SIGNAL_ADAPTER);
  }
}
