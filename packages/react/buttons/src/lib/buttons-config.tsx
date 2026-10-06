'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_BUTTONS_CONFIG,
  resolveOgeButtonsConfig,
  type OgeButtonsConfig,
  type OgeButtonsConfigInput,
  OGE_DEFAULT_FAB_CONFIG,
  resolveOgeFabConfig,
  type OgeFabConfig,
  type OgeFabConfigInput,
} from '@oge-ui/behavior';

// The shape, the defaults and the merge come from `@oge-ui/behavior`, the same
// module the Angular package reads (ADR 0001). Only the delivery mechanism is
// framework-shaped: an injection token there, a context provider here.
export type {
  OgeButtonsConfig,
  OgeButtonsConfigInput,
  OgeButtonsMessages,
} from '@oge-ui/behavior';
export {
  OGE_DEFAULT_BUTTONS_CONFIG,
  OGE_DEFAULT_BUTTONS_MESSAGES,
} from '@oge-ui/behavior';

const OgeButtonsConfigContext = createContext<OgeButtonsConfig>(
  OGE_DEFAULT_BUTTONS_CONFIG,
);

export interface OgeButtonsConfigProviderProps {
  /** Partial overrides; `messages` is shallow-merged onto the defaults. */
  config?: OgeButtonsConfigInput;
  children?: ReactNode;
}

/**
 * Application- or subtree-scoped button defaults — the React counterpart of
 * Angular's `provideOgeButtonsConfig()`:
 *
 * ```tsx
 * <OgeButtonsConfigProvider config={{ clickGuardMs: 300 }}>
 *   <App />
 * </OgeButtonsConfigProvider>
 * ```
 */
export function OgeButtonsConfigProvider({
  config,
  children,
}: OgeButtonsConfigProviderProps) {
  const value = useMemo(() => resolveOgeButtonsConfig(config), [config]);
  return (
    <OgeButtonsConfigContext.Provider value={value}>
      {children}
    </OgeButtonsConfigContext.Provider>
  );
}

/** Reads the nearest button configuration (defaults when no provider is set). */
export function useOgeButtonsConfig(): OgeButtonsConfig {
  return useContext(OgeButtonsConfigContext);
}

// --- floating action button + speed dial (W8a) ------------------------------

const FabContext = createContext<OgeFabConfig>(OGE_DEFAULT_FAB_CONFIG);

/** Subtree-scoped defaults — the React counterpart of `provideOgeFabConfig()`. */
export function OgeFabConfigProvider({
  config,
  children,
}: {
  config?: OgeFabConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeFabConfig(config), [config]);
  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

/** Reads the nearest FAB / speed-dial configuration. */
export const useOgeFabConfig = (): OgeFabConfig => useContext(FabContext);
