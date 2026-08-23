import { effect, untracked } from '@angular/core';
import type { DataSource, LoadOptions } from '@oge-ui/core';
import {
  OgeGridDeferredChildrenCore,
  type OgeDeferredBaseOptions,
  type OgePendingChildRequest,
} from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/** Base load options with the per-request fields stripped. */
export type DeferredBaseOptions = OgeDeferredBaseOptions;

/** One lazily-expanded node whose children must be fetched. */
export type PendingChildRequest = OgePendingChildRequest;

export interface DeferredChildrenLoaderDeps<T> {
  /** Expanded keys whose children are neither in the payload nor cached yet. */
  pending: () => readonly PendingChildRequest[];
  /** Current load options; a change of the base fingerprint drops the cache. */
  baseOptions: () => LoadOptions;
  source: () => DataSource<T> | null;
  onError: (err: unknown) => void;
}

/**
 * On-demand child loading for lazily expanded nodes (deferred groups, lazy
 * tree nodes): de-duplicates in-flight requests per key, caches results, and
 * invalidates the whole cache when the base options change. Hosted as a plain
 * field by the component.
 *
 * Since ADR 0001's grid phase the loader is `@oge-ui/behavior`'s
 * `OgeGridDeferredChildrenCore`, shared verbatim with the React grid; this
 * class is the Angular seam and supplies the one thing the core leaves to the
 * host — *when* to look for work. The effect below tracks `pending` and
 * `baseOptions` and runs the (untracked) sync, which is what the core used to
 * do inline.
 */
export class DeferredChildrenLoader<
  T = unknown,
> extends OgeGridDeferredChildrenCore<T> {
  private readonly loadEffect;

  constructor(angularDeps: DeferredChildrenLoaderDeps<T>) {
    super(angularDeps, SIGNAL_ADAPTER);
    this.loadEffect = effect(() => {
      angularDeps.pending();
      angularDeps.baseOptions();
      untracked(() => this.sync());
    });
  }
}
