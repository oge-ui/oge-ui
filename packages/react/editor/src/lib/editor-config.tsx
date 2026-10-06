'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_EDITOR_CONFIG,
  resolveOgeEditorConfig,
  type OgeEditorConfig,
  type OgeEditorConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/behavior`, so the two render layers cannot drift (ADR 0001);
// re-exported so React consumers import one package.
export type {
  OgeEditorConfig,
  OgeEditorConfigInput,
  OgeEditorMessages,
  OgeEditorMessagesInput,
  OgeEditorToolMessages,
  OgeEditorBlockMessages,
  OgeEditorDialogMessages,
  OgeEditorColorMessages,
  OgeEditorCounterMessages,
  OgeEditorAnnouncementMessages,
  OgeEditorValidationMessages,
  OgeEditorKeyMessages,
} from '@oge-ui/behavior';

const OgeEditorConfigContext = createContext<OgeEditorConfig>(
  OGE_DEFAULT_EDITOR_CONFIG,
);

/**
 * The React counterpart of Angular's `provideOgeEditorConfig()` — wrap a
 * subtree to change the editor defaults beneath it. Nested providers merge
 * over the outer one, messages group by group.
 */
export function OgeEditorConfigProvider({
  config,
  children,
}: {
  config?: OgeEditorConfigInput;
  children?: ReactNode;
}) {
  const parent = useContext(OgeEditorConfigContext);
  const value = useMemo<OgeEditorConfig>(
    () => resolveOgeEditorConfig(config, parent),
    [config, parent],
  );
  return (
    <OgeEditorConfigContext.Provider value={value}>
      {children}
    </OgeEditorConfigContext.Provider>
  );
}

/** The resolved editor defaults for the current subtree. */
export function useOgeEditorConfig(): OgeEditorConfig {
  return useContext(OgeEditorConfigContext);
}
