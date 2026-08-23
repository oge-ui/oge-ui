'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_GRID_CONFIG,
  resolveGridConfig,
  type OgeGridConfig,
  type OgeGridConfigInput,
  type OgeStateStorage,
} from '@oge-ui/behavior';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/behavior`, so the two render layers cannot drift (ADR 0001);
// re-exported so React consumers import one package.
export type {
  OgeGridConfig,
  OgeGridConfigInput,
  OgeGridMessages,
  OgeStateStorage,
} from '@oge-ui/behavior';

const OgeGridConfigContext = createContext<OgeGridConfig>(
  OGE_DEFAULT_GRID_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeGridConfig()` — wrap a
 * subtree to change the grid defaults beneath it. Nested providers merge over
 * the outer one, messages key by key.
 */
export function OgeGridConfigProvider({
  config,
  children,
}: {
  config?: OgeGridConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeGridConfigContext);
  const value = useMemo<OgeGridConfig>(
    () => resolveGridConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeGridConfigContext.Provider value={value}>
      {children}
    </OgeGridConfigContext.Provider>
  );
}

/** The resolved grid defaults for the current subtree. */
export function useOgeGridConfig(): OgeGridConfig {
  return useContext(OgeGridConfigContext);
}

/** `localStorage` when it exists; a no-op store otherwise (SSR, sandboxes). */
export const OGE_LOCAL_STATE_STORAGE: OgeStateStorage = {
  get(key) {
    try {
      return typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      // storage is unavailable — persistence degrades to in-memory
    }
  },
};

const OgeGridStateStorageContext = createContext<OgeStateStorage>(
  OGE_LOCAL_STATE_STORAGE,
);

/**
 * The React counterpart of Angular's `OGE_STATE_STORAGE` token: the backend
 * `stateKey` persistence writes to. Default `localStorage`; both methods may
 * return promises, so an HTTP API or IndexedDB works just as well.
 */
export function OgeGridStateStorageProvider({
  storage,
  children,
}: {
  storage: OgeStateStorage;
  children?: ReactNode;
}) {
  return (
    <OgeGridStateStorageContext.Provider value={storage}>
      {children}
    </OgeGridStateStorageContext.Provider>
  );
}

/** The state storage for the current subtree. */
export function useOgeGridStateStorage(): OgeStateStorage {
  return useContext(OgeGridStateStorageContext);
}
