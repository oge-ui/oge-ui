'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_FORMS_CONFIG,
  resolveOgeFormsConfig,
  type OgeFormsConfig,
  type OgeFormsConfigInput,
} from '@oge-ui/behavior';

/**
 * Application-wide forms defaults — the React counterpart of Angular's
 * `provideOgeFormsConfig()`. Both merge over the same table in
 * `@oge-ui/behavior`, so a Turkish `submitButton` or a wider `minColWidth`
 * means the same thing in either layer (ADR 0001).
 */
const FormsConfigContext = createContext<OgeFormsConfig>(
  OGE_DEFAULT_FORMS_CONFIG,
);

export function OgeFormsConfigProvider({
  config,
  children,
}: {
  config?: OgeFormsConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeFormsConfig(config), [config]);
  return (
    <FormsConfigContext.Provider value={value}>
      {children}
    </FormsConfigContext.Provider>
  );
}

export const useOgeFormsConfig = (): OgeFormsConfig =>
  useContext(FormsConfigContext);
