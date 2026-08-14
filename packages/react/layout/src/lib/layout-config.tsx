'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_ACCORDION_CONFIG,
  OGE_DEFAULT_CARD_CONFIG,
  OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  OGE_DEFAULT_SKELETON_CONFIG,
  OGE_DEFAULT_TOOLBAR_CONFIG,
  resolveOgeAccordionConfig,
  OGE_DEFAULT_SPLITTER_CONFIG,
  resolveOgeCardConfig,
  resolveOgeSplitterConfig,
  resolveOgeLoadIndicatorConfig,
  resolveOgeProgressBarConfig,
  resolveOgeSkeletonConfig,
  resolveOgeToolbarConfig,
  type OgeAccordionConfig,
  type OgeAccordionConfigInput,
  type OgeCardConfig,
  type OgeSplitterConfig,
  type OgeSplitterConfigInput,
  type OgeCardConfigInput,
  type OgeLoadIndicatorConfig,
  type OgeLoadIndicatorConfigInput,
  type OgeProgressBarConfig,
  type OgeProgressBarConfigInput,
  type OgeSkeletonConfig,
  type OgeSkeletonConfigInput,
  type OgeToolbarConfig,
  type OgeToolbarConfigInput,
} from '@oge-ui/behavior';

/**
 * The React counterparts of the layout family's `provideOgeXConfig()`
 * providers — one context per component, so a subtree can change just the
 * defaults it cares about. Every provider merges over the same
 * `@oge-ui/behavior` defaults the Angular DI tokens use.
 */

const CardContext = createContext<OgeCardConfig>(OGE_DEFAULT_CARD_CONFIG);
const ProgressBarContext = createContext<OgeProgressBarConfig>(
  OGE_DEFAULT_PROGRESS_BAR_CONFIG,
);
const LoadIndicatorContext = createContext<OgeLoadIndicatorConfig>(
  OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
);
const SkeletonContext = createContext<OgeSkeletonConfig>(
  OGE_DEFAULT_SKELETON_CONFIG,
);

export function OgeCardConfigProvider({
  config,
  children,
}: {
  config?: OgeCardConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeCardConfig(config), [config]);
  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}

export const useOgeCardConfig = (): OgeCardConfig => useContext(CardContext);

export function OgeProgressBarConfigProvider({
  config,
  children,
}: {
  config?: OgeProgressBarConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeProgressBarConfig(config), [config]);
  return (
    <ProgressBarContext.Provider value={value}>
      {children}
    </ProgressBarContext.Provider>
  );
}

export const useOgeProgressBarConfig = (): OgeProgressBarConfig =>
  useContext(ProgressBarContext);

export function OgeLoadIndicatorConfigProvider({
  config,
  children,
}: {
  config?: OgeLoadIndicatorConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeLoadIndicatorConfig(config), [config]);
  return (
    <LoadIndicatorContext.Provider value={value}>
      {children}
    </LoadIndicatorContext.Provider>
  );
}

export const useOgeLoadIndicatorConfig = (): OgeLoadIndicatorConfig =>
  useContext(LoadIndicatorContext);

export function OgeSkeletonConfigProvider({
  config,
  children,
}: {
  config?: OgeSkeletonConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeSkeletonConfig(config), [config]);
  return (
    <SkeletonContext.Provider value={value}>
      {children}
    </SkeletonContext.Provider>
  );
}

export const useOgeSkeletonConfig = (): OgeSkeletonConfig =>
  useContext(SkeletonContext);

const AccordionContext = createContext<OgeAccordionConfig>(
  OGE_DEFAULT_ACCORDION_CONFIG,
);

export function OgeAccordionConfigProvider({
  config,
  children,
}: {
  config?: OgeAccordionConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeAccordionConfig(config), [config]);
  return (
    <AccordionContext.Provider value={value}>
      {children}
    </AccordionContext.Provider>
  );
}

export const useOgeAccordionConfig = (): OgeAccordionConfig =>
  useContext(AccordionContext);

const ToolbarContext = createContext<OgeToolbarConfig>(
  OGE_DEFAULT_TOOLBAR_CONFIG,
);

export function OgeToolbarConfigProvider({
  config,
  children,
}: {
  config?: OgeToolbarConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeToolbarConfig(config), [config]);
  return (
    <ToolbarContext.Provider value={value}>{children}</ToolbarContext.Provider>
  );
}

export const useOgeToolbarConfig = (): OgeToolbarConfig =>
  useContext(ToolbarContext);

const SplitterContext = createContext<OgeSplitterConfig>(
  OGE_DEFAULT_SPLITTER_CONFIG,
);

export function OgeSplitterConfigProvider({
  config,
  children,
}: {
  config?: OgeSplitterConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeSplitterConfig(config), [config]);
  return (
    <SplitterContext.Provider value={value}>
      {children}
    </SplitterContext.Provider>
  );
}

export const useOgeSplitterConfig = (): OgeSplitterConfig =>
  useContext(SplitterContext);
