import { computed, signal } from '@angular/core';
import {
  OgeRemoteListCore,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeRemoteListCoreDeps,
} from '@oge-ui/behavior';

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
 * Remote, paged list data for the dropdown editors' `dataSource` input. The
 * machine is `@oge-ui/behavior`'s `OgeRemoteListCore`, shared verbatim with
 * the React editors; this class hands it `signal()`/`computed()`.
 */
export class RemoteListModel<TItem> extends OgeRemoteListCore<TItem> {
  constructor(deps: OgeRemoteListCoreDeps<TItem>) {
    super(deps, SIGNAL_ADAPTER);
  }
}
