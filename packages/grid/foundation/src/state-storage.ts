import { InjectionToken } from '@angular/core';

/**
 * Pluggable persistence backend for `stateKey` (default: localStorage).
 *
 * Both methods may return promises, so the backend can just as well be an
 * HTTP API or IndexedDB:
 *
 * ```ts
 * providers: [{
 *   provide: OGE_STATE_STORAGE,
 *   useValue: {
 *     get: (key) => http.get(`/api/grid-state/${key}`, { responseType: 'text' }),
 *     set: (key, value) => http.put(`/api/grid-state/${key}`, value),
 *   } satisfies OgeStateStorage,
 * }]
 * ```
 *
 * For full control without a token, use the grid's `state()` / `applyState()`
 * methods and the `stateChange` output instead.
 */
export interface OgeStateStorage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}

export const OGE_STATE_STORAGE = new InjectionToken<OgeStateStorage>(
  'OGE_STATE_STORAGE',
  {
    factory: (): OgeStateStorage => ({
      get: (key) =>
        typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
      set: (key, value) => {
        if (typeof localStorage !== 'undefined')
          localStorage.setItem(key, value);
      },
    }),
  },
);
