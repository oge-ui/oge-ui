'use client';

import { useMemo, type ReactNode } from 'react';
import {
  OGE_DEFAULT_ACCORDION_MESSAGES,
  OGE_DEFAULT_ALERT_MESSAGES,
  OGE_DEFAULT_CAROUSEL_MESSAGES,
  OGE_DEFAULT_AVATAR_MESSAGES,
  OGE_DEFAULT_BADGE_MESSAGES,
  OGE_DEFAULT_BREADCRUMB_MESSAGES,
  OGE_DEFAULT_BUTTONS_MESSAGES,
  OGE_DEFAULT_CHIP_MESSAGES,
  OGE_DEFAULT_DATA_VIEW_MESSAGES,
  OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
  OGE_DEFAULT_DRAWER_MESSAGES,
  OGE_DEFAULT_EDITOR_MESSAGES,
  OGE_DEFAULT_FAB_MESSAGES,
  OGE_DEFAULT_FORMS_MESSAGES,
  OGE_DEFAULT_GRID_MESSAGES,
  OGE_DEFAULT_INPUTS_MESSAGES,
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OGE_DEFAULT_MENUBAR_MESSAGES,
  OGE_DEFAULT_OVERLAY_MESSAGES,
  OGE_DEFAULT_PAGINATION_MESSAGES,
  OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
  OGE_DEFAULT_SPLITTER_MESSAGES,
  OGE_DEFAULT_STEPPER_MESSAGES,
  OGE_DEFAULT_TABS_MESSAGES,
  OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
  OGE_DEFAULT_LIST_VIEW_MESSAGES,
  OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
  OGE_DEFAULT_BARCODE_MESSAGES,
  OGE_DEFAULT_DIFF_VIEWER_MESSAGES,
  OGE_DEFAULT_TOOLBAR_MESSAGES,
  OGE_DEFAULT_TREE_VIEW_MESSAGES,
  OGE_DEFAULT_UPLOAD_MESSAGES,
} from '@oge-ui/behavior';
import { ogeMergeMessages, type OgeLocalePack } from '@oge-ui/locales';
import {
  OgeButtonsConfigProvider,
  OgeFabConfigProvider,
} from '@oge-ui/react-buttons';
import { OgeEditorConfigProvider } from '@oge-ui/react-editor';
import { OgeFormsConfigProvider } from '@oge-ui/react-forms';
import { OgeGridConfigProvider } from '@oge-ui/react-grid';
import { OgeInputsConfigProvider } from '@oge-ui/react-inputs';
import {
  OgeAccordionConfigProvider,
  OgeAlertConfigProvider,
  OgeCarouselConfigProvider,
  OgeAvatarConfigProvider,
  OgeBadgeConfigProvider,
  OgeChipConfigProvider,
  OgeDataViewConfigProvider,
  OgeSimpleTableConfigProvider,
  OgeLoadIndicatorConfigProvider,
  OgeProgressBarConfigProvider,
  OgeSplitterConfigProvider,
  OgeTileLayoutConfigProvider,
  OgeListViewConfigProvider,
  OgeImageViewerConfigProvider,
  OgeBarcodeConfigProvider,
  OgeDiffViewerConfigProvider,
  OgeTimelineConfigProvider,
  OgeToolbarConfigProvider,
} from '@oge-ui/react-layout';
import {
  OgeBreadcrumbConfigProvider,
  OgeDrawerConfigProvider,
  OgeMenubarConfigProvider,
  OgePaginationConfigProvider,
  OgeStepperConfigProvider,
  OgeTreeViewConfigProvider,
} from '@oge-ui/react-navigation';
import { OgeOverlayConfigProvider } from '@oge-ui/react-overlay';
import { OgeTabsConfigProvider } from '@oge-ui/react-tabs';
import { OgeUploadConfigProvider } from '@oge-ui/react-upload';

/** Props of {@link OgeLocaleProvider} and of every family slice of it. */
export interface OgeLocaleProviderProps {
  /** The `@oge-ui/locales` pack to apply — swap it to switch language. */
  readonly pack: OgeLocalePack;
  readonly children?: ReactNode;
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-grid` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeGridLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      grid: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_GRID_MESSAGES, pack.grid),
      },
    };
  }, [pack]);
  return (
    <OgeGridConfigProvider config={c.grid}>{children}</OgeGridConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-inputs` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeInputsLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      inputs: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_INPUTS_MESSAGES, pack.inputs),
      },
    };
  }, [pack]);
  return (
    <OgeInputsConfigProvider config={c.inputs}>
      {children}
    </OgeInputsConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-buttons` (buttons and the floating action button) only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeButtonsLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      buttons: {
        messages: ogeMergeMessages(OGE_DEFAULT_BUTTONS_MESSAGES, pack.buttons),
      },
      fab: {
        messages: ogeMergeMessages(OGE_DEFAULT_FAB_MESSAGES, pack.fab),
      },
    };
  }, [pack]);
  return (
    <OgeButtonsConfigProvider config={c.buttons}>
      <OgeFabConfigProvider config={c.fab}>{children}</OgeFabConfigProvider>
    </OgeButtonsConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-overlay` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeOverlayLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      overlay: {
        messages: ogeMergeMessages(OGE_DEFAULT_OVERLAY_MESSAGES, pack.overlay),
      },
    };
  }, [pack]);
  return (
    <OgeOverlayConfigProvider config={c.overlay}>
      {children}
    </OgeOverlayConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-tabs` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeTabsLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      tabs: {
        messages: ogeMergeMessages(OGE_DEFAULT_TABS_MESSAGES, pack.tabs),
      },
    };
  }, [pack]);
  return (
    <OgeTabsConfigProvider config={c.tabs}>{children}</OgeTabsConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-forms` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeFormsLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      forms: {
        messages: ogeMergeMessages(OGE_DEFAULT_FORMS_MESSAGES, pack.forms),
      },
    };
  }, [pack]);
  return (
    <OgeFormsConfigProvider config={c.forms}>{children}</OgeFormsConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-upload` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeUploadLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      upload: {
        messages: ogeMergeMessages(OGE_DEFAULT_UPLOAD_MESSAGES, pack.upload),
      },
    };
  }, [pack]);
  return (
    <OgeUploadConfigProvider config={c.upload}>
      {children}
    </OgeUploadConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-editor` only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeEditorLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    return {
      editor: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_EDITOR_MESSAGES, pack.editor),
      },
    };
  }, [pack]);
  return (
    <OgeEditorConfigProvider config={c.editor}>
      {children}
    </OgeEditorConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-layout` (every layout component) only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeLayoutLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    const { layout } = pack;
    return {
      accordion: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_ACCORDION_MESSAGES,
          layout?.accordion,
        ),
      },
      progressBar: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
          layout?.progressBar,
        ),
      },
      loadIndicator: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
          layout?.loadIndicator,
        ),
      },
      splitter: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_SPLITTER_MESSAGES,
          layout?.splitter,
        ),
      },
      toolbar: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_TOOLBAR_MESSAGES,
          layout?.toolbar,
        ),
      },
      avatar: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_AVATAR_MESSAGES, layout?.avatar),
      },
      badge: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_BADGE_MESSAGES, layout?.badge),
      },
      chip: {
        messages: ogeMergeMessages(OGE_DEFAULT_CHIP_MESSAGES, layout?.chip),
      },
      alert: {
        messages: ogeMergeMessages(OGE_DEFAULT_ALERT_MESSAGES, layout?.alert),
      },
      timeline: { locale: pack.locale },
      carousel: {
        locale: pack.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_CAROUSEL_MESSAGES,
          layout?.carousel,
        ),
      },
      dataView: {
        locale: pack.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_DATA_VIEW_MESSAGES,
          layout?.dataView,
        ),
      },
      simpleTable: {
        locale: pack.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
          layout?.simpleTable,
        ),
      },
      tileLayout: {
        locale: pack.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
          layout?.tileLayout,
        ),
      },
      listView: {
        locale: pack.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_LIST_VIEW_MESSAGES,
          layout?.listView,
        ),
      },
      diffViewer: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_DIFF_VIEWER_MESSAGES,
          layout?.diffViewer,
        ),
      },
      barcode: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_BARCODE_MESSAGES,
          layout?.barcode,
        ),
      },
      imageViewer: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
          layout?.imageViewer,
        ),
      },
    };
  }, [pack]);
  return (
    <OgeAccordionConfigProvider config={c.accordion}>
      <OgeProgressBarConfigProvider config={c.progressBar}>
        <OgeLoadIndicatorConfigProvider config={c.loadIndicator}>
          <OgeSplitterConfigProvider config={c.splitter}>
            <OgeToolbarConfigProvider config={c.toolbar}>
              <OgeAvatarConfigProvider config={c.avatar}>
                <OgeBadgeConfigProvider config={c.badge}>
                  <OgeChipConfigProvider config={c.chip}>
                    <OgeAlertConfigProvider config={c.alert}>
                      <OgeTimelineConfigProvider config={c.timeline}>
                        <OgeCarouselConfigProvider config={c.carousel}>
                          <OgeDataViewConfigProvider config={c.dataView}>
                            <OgeSimpleTableConfigProvider
                              config={c.simpleTable}
                            >
                              <OgeTileLayoutConfigProvider
                                config={c.tileLayout}
                              >
                                <OgeListViewConfigProvider config={c.listView}>
                                  <OgeDiffViewerConfigProvider
                                    config={c.diffViewer}
                                  >
                                    <OgeBarcodeConfigProvider
                                      config={c.barcode}
                                    >
                                      <OgeImageViewerConfigProvider
                                        config={c.imageViewer}
                                      >
                                        {children}
                                      </OgeImageViewerConfigProvider>
                                    </OgeBarcodeConfigProvider>
                                  </OgeDiffViewerConfigProvider>
                                </OgeListViewConfigProvider>
                              </OgeTileLayoutConfigProvider>
                            </OgeSimpleTableConfigProvider>
                          </OgeDataViewConfigProvider>
                        </OgeCarouselConfigProvider>
                      </OgeTimelineConfigProvider>
                    </OgeAlertConfigProvider>
                  </OgeChipConfigProvider>
                </OgeBadgeConfigProvider>
              </OgeAvatarConfigProvider>
            </OgeToolbarConfigProvider>
          </OgeSplitterConfigProvider>
        </OgeLoadIndicatorConfigProvider>
      </OgeProgressBarConfigProvider>
    </OgeAccordionConfigProvider>
  );
}

/**
 * Applies a `@oge-ui/locales` pack to `@oge-ui/react-navigation` (every navigation component) only — the slice of
 * {@link OgeLocaleProvider} for an app that ships this family alone, so the
 * other families' catalogs stay out of its bundle. Same merge rule as
 * `OgeLocaleProvider`.
 */
export function OgeNavigationLocaleProvider({
  pack,
  children,
}: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    const { navigation } = pack;
    return {
      breadcrumb: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_BREADCRUMB_MESSAGES,
          navigation?.breadcrumb,
        ),
      },
      drawer: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_DRAWER_MESSAGES,
          navigation?.drawer,
        ),
      },
      menubar: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_MENUBAR_MESSAGES,
          navigation?.menubar,
        ),
      },
      pagination: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_PAGINATION_MESSAGES,
          navigation?.pagination,
        ),
      },
      stepper: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_STEPPER_MESSAGES,
          navigation?.stepper,
        ),
      },
      treeView: {
        messages: ogeMergeMessages(
          OGE_DEFAULT_TREE_VIEW_MESSAGES,
          navigation?.treeView,
        ),
      },
    };
  }, [pack]);
  return (
    <OgeBreadcrumbConfigProvider config={c.breadcrumb}>
      <OgeDrawerConfigProvider config={c.drawer}>
        <OgeMenubarConfigProvider config={c.menubar}>
          <OgePaginationConfigProvider config={c.pagination}>
            <OgeStepperConfigProvider config={c.stepper}>
              <OgeTreeViewConfigProvider config={c.treeView}>
                {children}
              </OgeTreeViewConfigProvider>
            </OgeStepperConfigProvider>
          </OgePaginationConfigProvider>
        </OgeMenubarConfigProvider>
      </OgeDrawerConfigProvider>
    </OgeBreadcrumbConfigProvider>
  );
}

/**
 * The React twin of Angular's `provideOgeLocale()`: wraps the subtree in every
 * MIT family's config provider, each with the pack's slice merged over the
 * English catalog (nested blocks key by key — a key the pack lacks stays
 * English) and, for the grid / tree list and the editors, the pack's
 * `locale`. Pass a different `pack` to switch language at runtime; context
 * re-renders every component beneath.
 *
 * ```tsx
 * import { tr } from '@oge-ui/locales/tr';
 * <OgeLocaleProvider pack={tr}>
 *   <App />
 * </OgeLocaleProvider>
 * ```
 *
 * An app that ships only some families can nest their slices instead
 * (`<OgeGridLocaleProvider pack={tr}>`, `<OgeInputsLocaleProvider>`…): each
 * pulls in only its own catalogs, where this one bundles every family's.
 * Family providers nested inside it still apply on top (the grid and the
 * uploader merge over it). The page's `dir` is the app's job (set it from
 * `pack.dir`); commercial families take their slice through their own
 * providers — this MIT umbrella does not depend on them.
 */
export function OgeLocaleProvider({ pack, children }: OgeLocaleProviderProps) {
  let tree: ReactNode = children;
  for (const Slice of [
    OgeNavigationLocaleProvider,
    OgeLayoutLocaleProvider,
    OgeEditorLocaleProvider,
    OgeUploadLocaleProvider,
    OgeFormsLocaleProvider,
    OgeTabsLocaleProvider,
    OgeOverlayLocaleProvider,
    OgeButtonsLocaleProvider,
    OgeInputsLocaleProvider,
    OgeGridLocaleProvider,
  ]) {
    tree = <Slice pack={pack}>{tree}</Slice>;
  }
  return <>{tree}</>;
}
