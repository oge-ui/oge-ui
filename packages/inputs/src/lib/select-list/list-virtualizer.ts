import { computed, signal } from '@angular/core';
import {
  OgeListVirtualizerCore,
  type OgeListVirtualizerDeps,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';

// The window model is framework-free data shared with the React dropdown
// editors, so it lives in `@oge-ui/behavior` (ADR 0001); re-exported here so
// package-internal import paths stay unchanged.
export {
  OGE_SELECT_OPTION_HEIGHT,
  type OgeVirtualScrollOptions,
} from '@oge-ui/behavior';

/** Signal getters the owning dropdown editor wires into the virtualizer. */
export type ListVirtualizerDeps = OgeListVirtualizerDeps;

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
 * Fixed-item-height window model for virtualized dropdown lists. Since ADR
 * 0001 Faz 3 the machine itself is `@oge-ui/behavior`'s
 * `OgeListVirtualizerCore`, shared verbatim with the React dropdown editors;
 * this class is the Angular seam handing it `signal()`/`computed()`.
 */
export class ListVirtualizerModel extends OgeListVirtualizerCore {
  constructor(deps: ListVirtualizerDeps) {
    super(deps, SIGNAL_ADAPTER);
  }
}
