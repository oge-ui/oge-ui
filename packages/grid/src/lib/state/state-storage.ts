import { InjectionToken } from '@angular/core';

/** Pluggable persistence backend for `stateKey` (default: localStorage). */
export interface OgeStateStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export const OGE_STATE_STORAGE = new InjectionToken<OgeStateStorage>('OGE_STATE_STORAGE', {
  factory: (): OgeStateStorage => ({
    get: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
    set: (key, value) => {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    },
  }),
});
