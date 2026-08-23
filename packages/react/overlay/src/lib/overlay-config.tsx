'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_OVERLAY_CONFIG,
  resolveOverlayConfig,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
} from '@oge-ui/behavior';

// The config shape, its defaults and the `messages` catalog are
// single-sourced in `@oge-ui/behavior`, so the two render layers cannot
// drift (ADR 0001); re-exported so React consumers import one package.
export type {
  OgeOverlayConfig,
  OgeOverlayConfigInput,
  OgeOverlayMessages,
} from '@oge-ui/behavior';

const OgeOverlayConfigContext = createContext<OgeOverlayConfig>(
  OGE_DEFAULT_OVERLAY_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeOverlayConfig()` — wrap a
 * subtree to change the overlay defaults beneath it. Nested providers merge
 * over the outer one, messages one level deep.
 */
export function OgeOverlayConfigProvider({
  config,
  children,
}: {
  config?: OgeOverlayConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeOverlayConfigContext);
  const value = useMemo<OgeOverlayConfig>(
    () => resolveOverlayConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeOverlayConfigContext.Provider value={value}>
      {children}
    </OgeOverlayConfigContext.Provider>
  );
}

/** The resolved overlay defaults for the current subtree. */
export function useOgeOverlayConfig(): OgeOverlayConfig {
  return useContext(OgeOverlayConfigContext);
}
