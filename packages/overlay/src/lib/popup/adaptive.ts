import {
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import {
  matchesAdaptiveViewport,
  resolveAdaptivePresentation,
  watchAdaptiveViewport,
  type OgeAdaptiveMode,
  type OgeAdaptivePresentation,
} from '@oge-ui/behavior';

// The vocabulary is framework-free (shared with the React layer); re-exported
// so `@oge-ui/overlay` stays the Angular import path.
export {
  OGE_DEFAULT_ADAPTIVE_BREAKPOINT,
  type OgeAdaptiveConfig,
  type OgeAdaptiveMode,
  type OgeAdaptivePresentation,
} from '@oge-ui/behavior';

/**
 * Whether the viewport is narrower than `breakpoint()` — a signal that follows
 * `matchMedia` crossings and re-subscribes when the breakpoint changes.
 * `false` during SSR. Call in an injection context (a field initializer).
 */
export function ogeAdaptiveViewport(breakpoint: () => number): Signal<boolean> {
  const narrow = signal(false);
  let stop: (() => void) | null = null;
  effect(() => {
    const value = breakpoint();
    untracked(() => {
      stop?.();
      narrow.set(matchesAdaptiveViewport(value));
      stop = watchAdaptiveViewport(value, (matches) => narrow.set(matches));
    });
  });
  inject(DestroyRef).onDestroy(() => stop?.());
  return narrow.asReadonly();
}

/**
 * The presentation a popup editor renders — `'popup'` unless `mode()` is
 * `'auto'` and the viewport is narrower than `breakpoint()`, then `kind`.
 * Call in an injection context; bind the result to `<oge-popup [adaptive]>`.
 */
export function ogeAdaptivePresentation(
  mode: () => OgeAdaptiveMode,
  breakpoint: () => number,
  kind: Exclude<OgeAdaptivePresentation, 'popup'> = 'sheet',
): Signal<OgeAdaptivePresentation> {
  const narrow = ogeAdaptiveViewport(breakpoint);
  return computed(() => resolveAdaptivePresentation(mode(), narrow(), kind));
}
