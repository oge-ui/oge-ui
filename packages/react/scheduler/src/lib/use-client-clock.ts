import { useSyncExternalStore } from 'react';

const subscribe = (): (() => void) => () => undefined;

/**
 * `false` while React hydrates server markup, `true` everywhere else —
 * including the very first render of a client-only (`createRoot`) mount.
 *
 * For output that depends on the wall clock (the now indicator, today highlights): the server
 * and the browser render it at different moments, so a pixel position
 * derived from `new Date()` never matches and React reports a hydration
 * mismatch. Gating it on this hook gives the hydration render the server's
 * answer (nothing) and paints it on the next render, while a client-only
 * mount still has it from the first frame (ARCHITECTURE → "SSR and
 * hydration").
 */
export function useClientClock(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
