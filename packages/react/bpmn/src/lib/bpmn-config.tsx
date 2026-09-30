'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_BPMN_CONFIG,
  resolveOgeBpmnConfig,
  type OgeBpmnConfig,
  type OgeBpmnConfigInput,
} from '@oge-ui/bpmn-engine';

const OgeBpmnConfigContext = createContext<OgeBpmnConfig>(
  OGE_DEFAULT_BPMN_CONFIG,
);

/** Props of {@link OgeBpmnConfigProvider}. */
export interface OgeBpmnConfigProviderProps {
  /** Partial defaults merged over the enclosing provider (messages one level deep). */
  config?: OgeBpmnConfigInput;
  children?: ReactNode;
}

/**
 * The React counterpart of Angular's `provideOgeBpmnConfig()` — wrap a
 * subtree to change the editor defaults beneath it (grid size, snapping,
 * zoom bounds, the autosave debounce, fill presets, the brand logo and every
 * message string). Nested providers merge over the outer one; a new `config`
 * object re-resolves, so switching the UI language is a prop change.
 *
 * ```tsx
 * <OgeBpmnConfigProvider config={{ gridSize: 20, messages: { emptyText: 'Boş diyagram' } }}>
 *   <OgeBpmnEditor />
 * </OgeBpmnConfigProvider>
 * ```
 */
export function OgeBpmnConfigProvider({
  config,
  children,
}: OgeBpmnConfigProviderProps) {
  const parent = useContext(OgeBpmnConfigContext);
  const value = useMemo<OgeBpmnConfig>(
    () => resolveOgeBpmnConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeBpmnConfigContext.Provider value={value}>
      {children}
    </OgeBpmnConfigContext.Provider>
  );
}

/** The resolved BPMN editor defaults for the current subtree. */
export function useOgeBpmnConfig(): OgeBpmnConfig {
  return useContext(OgeBpmnConfigContext);
}
