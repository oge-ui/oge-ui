'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_BREADCRUMB_CONFIG,
  OGE_DEFAULT_DRAWER_CONFIG,
  OGE_DEFAULT_MENUBAR_CONFIG,
  OGE_DEFAULT_PAGINATION_CONFIG,
  OGE_DEFAULT_STEPPER_CONFIG,
  OGE_DEFAULT_TREE_VIEW_CONFIG,
  resolveOgeBreadcrumbConfig,
  resolveOgeDrawerConfig,
  resolveOgeMenubarConfig,
  resolveOgePaginationConfig,
  resolveOgeStepperConfig,
  resolveOgeTreeViewConfig,
  type OgeBreadcrumbConfig,
  type OgeBreadcrumbConfigInput,
  type OgeDrawerConfig,
  type OgeDrawerConfigInput,
  type OgeMenubarConfig,
  type OgeMenubarConfigInput,
  type OgePaginationConfig,
  type OgePaginationConfigInput,
  type OgeStepperConfig,
  type OgeStepperConfigInput,
  type OgeTreeViewConfig,
  type OgeTreeViewConfigInput,
} from '@oge-ui/behavior';

/**
 * The React counterparts of the navigation family's `provideOgeXConfig()`
 * providers — one context per component, so a subtree can change just the
 * defaults it cares about. Every provider merges over the same
 * `@oge-ui/behavior` defaults the Angular DI tokens use.
 */

const TreeViewContext = createContext<OgeTreeViewConfig>(
  OGE_DEFAULT_TREE_VIEW_CONFIG,
);

/**
 * Application- or subtree-scoped tree view defaults — the React shape of
 * `provideOgeTreeViewConfig()`:
 *
 * ```tsx
 * <OgeTreeViewConfigProvider config={{ messages: { searchPlaceholder: 'Ara…' } }}>
 *   <App />
 * </OgeTreeViewConfigProvider>
 * ```
 */
export function OgeTreeViewConfigProvider({
  config,
  children,
}: {
  config?: OgeTreeViewConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeTreeViewConfig(config), [config]);
  return (
    <TreeViewContext.Provider value={value}>
      {children}
    </TreeViewContext.Provider>
  );
}

/** The tree view defaults in scope — the merged config, never a partial. */
export const useOgeTreeViewConfig = (): OgeTreeViewConfig =>
  useContext(TreeViewContext);

const DrawerContext = createContext<OgeDrawerConfig>(OGE_DEFAULT_DRAWER_CONFIG);

/**
 * Application- or subtree-scoped drawer defaults — the React shape of
 * `provideOgeDrawerConfig()`:
 *
 * ```tsx
 * <OgeDrawerConfigProvider config={{ size: 280, messages: { close: 'Kapat' } }}>
 *   <App />
 * </OgeDrawerConfigProvider>
 * ```
 */
export function OgeDrawerConfigProvider({
  config,
  children,
}: {
  config?: OgeDrawerConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeDrawerConfig(config), [config]);
  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
}

/** The drawer defaults in scope — the merged config, never a partial. */
export const useOgeDrawerConfig = (): OgeDrawerConfig =>
  useContext(DrawerContext);

const StepperContext = createContext<OgeStepperConfig>(
  OGE_DEFAULT_STEPPER_CONFIG,
);

/**
 * Application- or subtree-scoped stepper defaults — the React shape of
 * `provideOgeStepperConfig()`:
 *
 * ```tsx
 * <OgeStepperConfigProvider config={{ linear: true, messages: { next: 'İleri' } }}>
 *   <App />
 * </OgeStepperConfigProvider>
 * ```
 */
export function OgeStepperConfigProvider({
  config,
  children,
}: {
  config?: OgeStepperConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeStepperConfig(config), [config]);
  return (
    <StepperContext.Provider value={value}>{children}</StepperContext.Provider>
  );
}

/** The stepper defaults in scope — the merged config, never a partial. */
export const useOgeStepperConfig = (): OgeStepperConfig =>
  useContext(StepperContext);

const BreadcrumbContext = createContext<OgeBreadcrumbConfig>(
  OGE_DEFAULT_BREADCRUMB_CONFIG,
);

/**
 * Application- or subtree-scoped breadcrumb defaults — the React shape of
 * `provideOgeBreadcrumbConfig()`:
 *
 * ```tsx
 * <OgeBreadcrumbConfigProvider config={{ messages: { breadcrumb: 'Yol izi' } }}>
 *   <App />
 * </OgeBreadcrumbConfigProvider>
 * ```
 */
export function OgeBreadcrumbConfigProvider({
  config,
  children,
}: {
  config?: OgeBreadcrumbConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeBreadcrumbConfig(config), [config]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/** The breadcrumb defaults in scope — the merged config, never a partial. */
export const useOgeBreadcrumbConfig = (): OgeBreadcrumbConfig =>
  useContext(BreadcrumbContext);

const MenubarContext = createContext<OgeMenubarConfig>(
  OGE_DEFAULT_MENUBAR_CONFIG,
);

/**
 * Application- or subtree-scoped menubar defaults — the React shape of
 * `provideOgeMenubarConfig()`:
 *
 * ```tsx
 * <OgeMenubarConfigProvider
 *   config={{ openMode: 'hover', messages: { hamburger: 'Menü' } }}
 * >
 *   <App />
 * </OgeMenubarConfigProvider>
 * ```
 */
export function OgeMenubarConfigProvider({
  config,
  children,
}: {
  config?: OgeMenubarConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgeMenubarConfig(config), [config]);
  return (
    <MenubarContext.Provider value={value}>{children}</MenubarContext.Provider>
  );
}

/** The menubar defaults in scope — the merged config, never a partial. */
export const useOgeMenubarConfig = (): OgeMenubarConfig =>
  useContext(MenubarContext);

const PaginationContext = createContext<OgePaginationConfig>(
  OGE_DEFAULT_PAGINATION_CONFIG,
);

/**
 * Application- or subtree-scoped pagination defaults — the React shape of
 * `provideOgePaginationConfig()`:
 *
 * ```tsx
 * <OgePaginationConfigProvider config={{ maxButtons: 9 }}>
 *   <App />
 * </OgePaginationConfigProvider>
 * ```
 */
export function OgePaginationConfigProvider({
  config,
  children,
}: {
  config?: OgePaginationConfigInput;
  children?: ReactNode;
}) {
  const value = useMemo(() => resolveOgePaginationConfig(config), [config]);
  return (
    <PaginationContext.Provider value={value}>
      {children}
    </PaginationContext.Provider>
  );
}

/** The pagination defaults in scope — the merged config, never a partial. */
export const useOgePaginationConfig = (): OgePaginationConfig =>
  useContext(PaginationContext);
