/**
 * The framework-free half of the stand-alone expansion panel (ADR 0001): its
 * event payloads and the one toggle pipeline — cancelable pre-event, then the
 * optional async guard (the accordion's `OgeAsyncGuard`, run by core's
 * `runAsyncGuard`), then the commit. The panel bar runs each of its groups
 * through the same pipeline, so both components veto, wait and commit alike.
 */

import { runAsyncGuard, type OgeAsyncGuard } from '@oge-ui/core';

/** Cancelable pre-event of an expand. */
export interface OgeExpansionPanelExpandingEvent {
  /** The originating DOM event, when a user gesture started it. */
  readonly event?: Event;
  /** Set to `true` to keep the panel collapsed. */
  cancel: boolean;
}

/** Cancelable pre-event of a collapse. */
export interface OgeExpansionPanelCollapsingEvent {
  /** The originating DOM event, when a user gesture started it. */
  readonly event?: Event;
  /** Set to `true` to keep the panel expanded. */
  cancel: boolean;
}

/** Emitted once the panel expanded or collapsed. */
export interface OgeExpansionPanelToggleEvent {
  /** The originating DOM event, when a user gesture started it. */
  readonly event?: Event;
}

/** One request through {@link runOgeExpansionToggle}. */
export interface OgeExpansionToggleRequest<TPre extends { cancel: boolean }> {
  /** The state asked for. */
  readonly next: boolean;
  /** The state now. */
  readonly current: boolean;
  /** A disabled panel refuses every request. */
  readonly disabled: boolean;
  /** A request while a guard promise is in flight is refused (single-flight). */
  readonly pending: boolean;
  /** Veto run after the pre-event; `false`, a throw or a rejection blocks. */
  readonly guard?: OgeAsyncGuard;
  /** Builds the pre-event payload (with `cancel: false`). */
  readonly preEvent: () => TPre;
  /** Emits the pre-event; the pipeline re-reads `cancel` afterwards. */
  readonly emitPre: (event: TPre) => void;
  /** Applies the new state and emits the past-tense event. */
  readonly commit: () => void;
  /** Reports a guard promise starting (`true`) and settling (`false`). */
  readonly setPending?: (active: boolean) => void;
  /** Label the guard's dev warnings carry. */
  readonly label?: string;
}

/**
 * The expand / collapse pipeline: a no-op request (already in that state)
 * resolves `true` without events; a disabled or pending panel resolves
 * `false`; otherwise the cancelable pre-event, then the guard, then
 * `commit()`. Resolves whether the panel ended up in the requested state.
 * Without a guard everything — including `commit()` — runs synchronously.
 */
export function runOgeExpansionToggle<TPre extends { cancel: boolean }>(
  request: OgeExpansionToggleRequest<TPre>,
): Promise<boolean> {
  if (request.next === request.current) return Promise.resolve(true);
  if (request.disabled || request.pending) return Promise.resolve(false);
  const pre = request.preEvent();
  request.emitPre(pre);
  if (pre.cancel) return Promise.resolve(false);
  // a sync guard settles inside runAsyncGuard; an async one resolves later
  const state: {
    settled: boolean | null;
    resolve: ((value: boolean) => void) | null;
  } = { settled: null, resolve: null };
  runAsyncGuard(request.guard, {
    allow: () => {
      request.commit();
      state.settled = true;
      state.resolve?.(true);
    },
    deny: () => {
      state.settled = false;
      state.resolve?.(false);
    },
    pending: (active) => request.setPending?.(active),
    label: request.label ?? 'oge expansion guard',
  });
  if (state.settled !== null) return Promise.resolve(state.settled);
  return new Promise<boolean>((resolve) => {
    state.resolve = resolve;
  });
}

/**
 * Whether the header's chevron is drawn: a per-panel `hideToggle` wins over
 * the component-level one.
 */
export function ogeExpansionShowsToggle(
  own: boolean | undefined,
  inherited: boolean,
): boolean {
  return !(own ?? inherited);
}
