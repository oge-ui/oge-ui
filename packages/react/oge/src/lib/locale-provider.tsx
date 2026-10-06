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
  OGE_DEFAULT_DRAWER_MESSAGES,
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
  OGE_DEFAULT_TOOLBAR_MESSAGES,
  OGE_DEFAULT_TREE_VIEW_MESSAGES,
  OGE_DEFAULT_UPLOAD_MESSAGES,
} from '@oge-ui/behavior';
import { ogeMergeMessages, type OgeLocalePack } from '@oge-ui/locales';
import {
  OgeButtonsConfigProvider,
  OgeFabConfigProvider,
} from '@oge-ui/react-buttons';
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
  OgeLoadIndicatorConfigProvider,
  OgeProgressBarConfigProvider,
  OgeSplitterConfigProvider,
  OgeTileLayoutConfigProvider,
  OgeListViewConfigProvider,
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

/** Props of {@link OgeLocaleProvider}. */
export interface OgeLocaleProviderProps {
  /** The `@oge-ui/locales` pack to apply — swap it to switch language. */
  readonly pack: OgeLocalePack;
  readonly children?: ReactNode;
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
 * Family providers nested inside it still apply on top (the grid and the
 * uploader merge over it). The page's `dir` is the app's job (set it from
 * `pack.dir`); commercial families take their slice through their own
 * providers — this MIT umbrella does not depend on them.
 */
export function OgeLocaleProvider({ pack, children }: OgeLocaleProviderProps) {
  const c = useMemo(() => {
    const { layout, navigation } = pack;
    return {
      grid: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_GRID_MESSAGES, pack.grid),
      },
      inputs: {
        locale: pack.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_INPUTS_MESSAGES, pack.inputs),
      },
      buttons: {
        messages: ogeMergeMessages(OGE_DEFAULT_BUTTONS_MESSAGES, pack.buttons),
      },
      overlay: {
        messages: ogeMergeMessages(OGE_DEFAULT_OVERLAY_MESSAGES, pack.overlay),
      },
      tabs: {
        messages: ogeMergeMessages(OGE_DEFAULT_TABS_MESSAGES, pack.tabs),
      },
      forms: {
        messages: ogeMergeMessages(OGE_DEFAULT_FORMS_MESSAGES, pack.forms),
      },
      upload: {
        messages: ogeMergeMessages(OGE_DEFAULT_UPLOAD_MESSAGES, pack.upload),
      },
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
      // no catalog — the timeline only needs the pack's locale for its dates
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
      fab: {
        messages: ogeMergeMessages(OGE_DEFAULT_FAB_MESSAGES, pack.fab),
      },
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
    <OgeGridConfigProvider config={c.grid}>
      <OgeInputsConfigProvider config={c.inputs}>
        <OgeButtonsConfigProvider config={c.buttons}>
          <OgeOverlayConfigProvider config={c.overlay}>
            <OgeTabsConfigProvider config={c.tabs}>
              <OgeFormsConfigProvider config={c.forms}>
                <OgeUploadConfigProvider config={c.upload}>
                  <OgeAccordionConfigProvider config={c.accordion}>
                    <OgeProgressBarConfigProvider config={c.progressBar}>
                      <OgeLoadIndicatorConfigProvider config={c.loadIndicator}>
                        <OgeSplitterConfigProvider config={c.splitter}>
                          <OgeToolbarConfigProvider config={c.toolbar}>
                            <OgeBreadcrumbConfigProvider config={c.breadcrumb}>
                              <OgeDrawerConfigProvider config={c.drawer}>
                                <OgeMenubarConfigProvider config={c.menubar}>
                                  <OgePaginationConfigProvider
                                    config={c.pagination}
                                  >
                                    <OgeStepperConfigProvider
                                      config={c.stepper}
                                    >
                                      <OgeTreeViewConfigProvider
                                        config={c.treeView}
                                      >
                                        <W8aProviders c={c}>
                                          {children}
                                        </W8aProviders>
                                      </OgeTreeViewConfigProvider>
                                    </OgeStepperConfigProvider>
                                  </OgePaginationConfigProvider>
                                </OgeMenubarConfigProvider>
                              </OgeDrawerConfigProvider>
                            </OgeBreadcrumbConfigProvider>
                          </OgeToolbarConfigProvider>
                        </OgeSplitterConfigProvider>
                      </OgeLoadIndicatorConfigProvider>
                    </OgeProgressBarConfigProvider>
                  </OgeAccordionConfigProvider>
                </OgeUploadConfigProvider>
              </OgeFormsConfigProvider>
            </OgeTabsConfigProvider>
          </OgeOverlayConfigProvider>
        </OgeButtonsConfigProvider>
      </OgeInputsConfigProvider>
    </OgeGridConfigProvider>
  );
}

type ConfigOf<P extends (props: never) => unknown> = NonNullable<
  Parameters<P>[0] extends { config?: infer C } ? C : never
>;

/**
 * The layout and feedback families added in W8a (avatar, badge, chip, alert,
 * timeline, FAB) — split out so the provider nesting above stays readable.
 */
function W8aProviders({
  c,
  children,
}: {
  c: {
    avatar: ConfigOf<typeof OgeAvatarConfigProvider>;
    badge: ConfigOf<typeof OgeBadgeConfigProvider>;
    chip: ConfigOf<typeof OgeChipConfigProvider>;
    alert: ConfigOf<typeof OgeAlertConfigProvider>;
    timeline: ConfigOf<typeof OgeTimelineConfigProvider>;
    fab: ConfigOf<typeof OgeFabConfigProvider>;
    tileLayout: ConfigOf<typeof OgeTileLayoutConfigProvider>;
    dataView: ConfigOf<typeof OgeDataViewConfigProvider>;
    listView: ConfigOf<typeof OgeListViewConfigProvider>;
    carousel: ConfigOf<typeof OgeCarouselConfigProvider>;
  };
  children?: ReactNode;
}) {
  return (
    <OgeAvatarConfigProvider config={c.avatar}>
      <OgeBadgeConfigProvider config={c.badge}>
        <OgeChipConfigProvider config={c.chip}>
          <OgeAlertConfigProvider config={c.alert}>
            <OgeTimelineConfigProvider config={c.timeline}>
              <OgeFabConfigProvider config={c.fab}>
                <OgeTileLayoutConfigProvider config={c.tileLayout}>
                  <OgeDataViewConfigProvider config={c.dataView}>
                    <OgeListViewConfigProvider config={c.listView}>
                      <OgeCarouselConfigProvider config={c.carousel}>
                        {children}
                      </OgeCarouselConfigProvider>
                    </OgeListViewConfigProvider>
                  </OgeDataViewConfigProvider>
                </OgeTileLayoutConfigProvider>
              </OgeFabConfigProvider>
            </OgeTimelineConfigProvider>
          </OgeAlertConfigProvider>
        </OgeChipConfigProvider>
      </OgeBadgeConfigProvider>
    </OgeAvatarConfigProvider>
  );
}
