'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_CHARTS_CONFIG,
  resolveOgeChartsConfig,
  type OgeChartsConfig,
  type OgeChartsConfigInput,
} from '@oge-ui/charts-engine';

// The message catalog, the config shape, its defaults and the merge rules are
// single-sourced in `@oge-ui/charts-engine` (ADR 0003), so the two render
// layers cannot drift; re-exported so React consumers import one package.
export type {
  OgeChartsAnnouncementMessages,
  OgeChartsAriaMessages,
  OgeChartsConfig,
  OgeChartsConfigInput,
  OgeChartsMessages,
  OgeChartsPeriodMessages,
} from '@oge-ui/charts-engine';

const OgeChartsConfigContext = createContext<OgeChartsConfig>(
  OGE_DEFAULT_CHARTS_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeChartsConfig()` — wrap a
 * subtree to change every chart's messages, locale, sr-table limit and
 * marker threshold beneath it. Nested providers merge over the outer one;
 * the config re-resolves whenever the prop changes, which is how a React app
 * switches the UI language at runtime (Angular's function-form live config).
 */
export function OgeChartsConfigProvider({
  config,
  children,
}: {
  config?: OgeChartsConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeChartsConfigContext);
  const value = useMemo<OgeChartsConfig>(
    () => resolveOgeChartsConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeChartsConfigContext.Provider value={value}>
      {children}
    </OgeChartsConfigContext.Provider>
  );
}

/** The resolved charts config for the current subtree. */
export function useOgeChartsConfig(): OgeChartsConfig {
  return useContext(OgeChartsConfigContext);
}
