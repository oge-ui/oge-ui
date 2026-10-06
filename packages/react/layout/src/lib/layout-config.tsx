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
  OGE_DEFAULT_AVATAR_CONFIG,
  resolveOgeAvatarConfig,
  type OgeAvatarConfig,
  type OgeAvatarConfigInput,
  OGE_DEFAULT_BADGE_CONFIG,
  resolveOgeBadgeConfig,
  type OgeBadgeConfig,
  type OgeBadgeConfigInput,
  OGE_DEFAULT_CHIP_CONFIG,
  resolveOgeChipConfig,
  type OgeChipConfig,
  type OgeChipConfigInput,
  OGE_DEFAULT_ALERT_CONFIG,
  resolveOgeAlertConfig,
  type OgeAlertConfig,
  type OgeAlertConfigInput,
  OGE_DEFAULT_TIMELINE_CONFIG,
  resolveOgeTimelineConfig,
  type OgeTimelineConfig,
  type OgeTimelineConfigInput,
  OGE_DEFAULT_APP_BAR_CONFIG,
  resolveOgeAppBarConfig,
  type OgeAppBarConfig,
  type OgeAppBarConfigInput,
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

// --- layout and feedback components (W8a) -----------------------------------

const AvatarContext = createContext<OgeAvatarConfig>(OGE_DEFAULT_AVATAR_CONFIG);

/** Subtree-scoped defaults — the React counterpart of `provideOgeAvatarConfig()`. */
export function OgeAvatarConfigProvider({
  config,
  children,
}: {
  config?: OgeAvatarConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeAvatarConfig(config), [config]);
  return (
    <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>
  );
}

export const useOgeAvatarConfig = (): OgeAvatarConfig =>
  useContext(AvatarContext);

const BadgeContext = createContext<OgeBadgeConfig>(OGE_DEFAULT_BADGE_CONFIG);

/** Subtree-scoped defaults — the React counterpart of `provideOgeBadgeConfig()`. */
export function OgeBadgeConfigProvider({
  config,
  children,
}: {
  config?: OgeBadgeConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeBadgeConfig(config), [config]);
  return (
    <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>
  );
}

export const useOgeBadgeConfig = (): OgeBadgeConfig => useContext(BadgeContext);

const ChipContext = createContext<OgeChipConfig>(OGE_DEFAULT_CHIP_CONFIG);

/** Subtree-scoped defaults — the React counterpart of `provideOgeChipConfig()`. */
export function OgeChipConfigProvider({
  config,
  children,
}: {
  config?: OgeChipConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeChipConfig(config), [config]);
  return <ChipContext.Provider value={value}>{children}</ChipContext.Provider>;
}

export const useOgeChipConfig = (): OgeChipConfig => useContext(ChipContext);

const AlertContext = createContext<OgeAlertConfig>(OGE_DEFAULT_ALERT_CONFIG);

/** Subtree-scoped defaults — the React counterpart of `provideOgeAlertConfig()`. */
export function OgeAlertConfigProvider({
  config,
  children,
}: {
  config?: OgeAlertConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeAlertConfig(config), [config]);
  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
}

export const useOgeAlertConfig = (): OgeAlertConfig => useContext(AlertContext);

const TimelineContext = createContext<OgeTimelineConfig>(
  OGE_DEFAULT_TIMELINE_CONFIG,
);

/** Subtree-scoped defaults — the React counterpart of `provideOgeTimelineConfig()`. */
export function OgeTimelineConfigProvider({
  config,
  children,
}: {
  config?: OgeTimelineConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeTimelineConfig(config), [config]);
  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export const useOgeTimelineConfig = (): OgeTimelineConfig =>
  useContext(TimelineContext);

const AppBarContext = createContext<OgeAppBarConfig>(
  OGE_DEFAULT_APP_BAR_CONFIG,
);

/** Subtree-scoped defaults — the React counterpart of `provideOgeAppBarConfig()`. */
export function OgeAppBarConfigProvider({
  config,
  children,
}: {
  config?: OgeAppBarConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeAppBarConfig(config), [config]);
  return (
    <AppBarContext.Provider value={value}>{children}</AppBarContext.Provider>
  );
}

export const useOgeAppBarConfig = (): OgeAppBarConfig =>
  useContext(AppBarContext);
