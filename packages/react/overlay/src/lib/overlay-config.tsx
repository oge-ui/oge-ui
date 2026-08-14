'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_OVERLAY_TIMINGS,
  type OgeOverlayTimings,
} from '@oge-ui/behavior';

/**
 * React overlay defaults — the anchored-primitive slice of the Angular
 * package's `OgeOverlayConfig`. The timing values themselves are
 * single-sourced in `@oge-ui/behavior`, so the two layers cannot drift; the
 * modal/toast fields join here when those surfaces ship in React.
 */
export type OgeOverlayConfig = OgeOverlayTimings;

export type OgeOverlayConfigInput = Partial<OgeOverlayConfig>;

const OgeOverlayConfigContext = createContext<OgeOverlayConfig>(
  OGE_DEFAULT_OVERLAY_TIMINGS,
);

/**
 * The React counterpart of Angular's `provideOgeOverlayConfig()` — wrap a
 * subtree to change the overlay defaults beneath it.
 */
export function OgeOverlayConfigProvider({
  config,
  children,
}: {
  config?: OgeOverlayConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo<OgeOverlayConfig>(
    () => ({ ...OGE_DEFAULT_OVERLAY_TIMINGS, ...config }),
    [config],
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
