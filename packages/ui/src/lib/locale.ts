import type { Provider } from '@angular/core';
import {
  OGE_DEFAULT_ACCORDION_MESSAGES,
  OGE_DEFAULT_ALERT_MESSAGES,
  OGE_DEFAULT_CAROUSEL_MESSAGES,
  OGE_DEFAULT_DATA_VIEW_MESSAGES,
  OGE_DEFAULT_AVATAR_MESSAGES,
  OGE_DEFAULT_BADGE_MESSAGES,
  OGE_DEFAULT_BREADCRUMB_MESSAGES,
  OGE_DEFAULT_BUTTONS_MESSAGES,
  OGE_DEFAULT_CHIP_MESSAGES,
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
  OGE_DEFAULT_TOOLBAR_MESSAGES,
  OGE_DEFAULT_TREE_VIEW_MESSAGES,
  OGE_DEFAULT_UPLOAD_MESSAGES,
} from '@oge-ui/behavior';
import { provideOgeButtonsConfig } from '@oge-ui/buttons';
import { provideOgeEditorConfig } from '@oge-ui/editor';
import { provideOgeFabConfig } from '@oge-ui/buttons/fab';
import { provideOgeFormsConfig } from '@oge-ui/forms';
import { provideOgeGridConfig } from '@oge-ui/grid';
import { provideOgeInputsConfig } from '@oge-ui/inputs/field';
import { provideOgeAccordionConfig } from '@oge-ui/layout/accordion';
import { provideOgeAlertConfig } from '@oge-ui/layout/alert';
import { provideOgeCarouselConfig } from '@oge-ui/layout/carousel';
import { provideOgeDataViewConfig } from '@oge-ui/layout/data-view';
import { provideOgeAvatarConfig } from '@oge-ui/layout/avatar';
import { provideOgeBadgeConfig } from '@oge-ui/layout/badge';
import { provideOgeChipConfig } from '@oge-ui/layout/chip';
import { provideOgeLoadIndicatorConfig } from '@oge-ui/layout/load-indicator';
import { provideOgeProgressBarConfig } from '@oge-ui/layout/progress-bar';
import { provideOgeSplitterConfig } from '@oge-ui/layout/splitter';
import { provideOgeTimelineConfig } from '@oge-ui/layout/timeline';
import { provideOgeTileLayoutConfig } from '@oge-ui/layout/tile-layout';
import { provideOgeListViewConfig } from '@oge-ui/layout/list-view';
import { provideOgeToolbarConfig } from '@oge-ui/layout/toolbar';
import { ogeMergeMessages, type OgeLocalePack } from '@oge-ui/locales';
import {
  provideOgeBreadcrumbConfig,
  provideOgeDrawerConfig,
  provideOgeMenubarConfig,
  provideOgePaginationConfig,
  provideOgeStepperConfig,
  provideOgeTreeViewConfig,
} from '@oge-ui/navigation';
import { provideOgeOverlayConfig } from '@oge-ui/overlay';
import { provideOgeTabsConfig } from '@oge-ui/tabs';
import { provideOgeUploadConfig } from '@oge-ui/upload';

type PackSource = OgeLocalePack | (() => OgeLocalePack);

/**
 * Applies one `@oge-ui/locales` pack to every MIT family at once: each
 * family's `provideOge…Config()` receives the pack's slice merged over the
 * English catalog (nested blocks key by key, so a key the pack lacks stays
 * English), plus the pack's `locale` for the families that format data
 * (grid and tree list, editors, the rich-text editor's counter).
 *
 * Pass a function to make it live — the language then follows the signals it
 * reads, exactly like the live form of the family providers:
 *
 * ```ts
 * import { tr } from '@oge-ui/locales/tr';
 * providers: [provideOgeLocale(tr)];
 *
 * const pack = signal<OgeLocalePack>(en);
 * providers: [provideOgeLocale(() => pack())];
 * ```
 *
 * It owns those families' config tokens: to change other options of one
 * family too, provide that family's config *after* it and merge the slice
 * yourself (`messages: ogeMergeMessages(OGE_DEFAULT_GRID_MESSAGES, tr.grid)`).
 * `LOCALE_ID` and the page's `dir` stay the application's job — components
 * follow `document.dir`, so set it from `pack.dir`. Commercial families are
 * not covered (this package is MIT-only): pass `tr.scheduler` & co. to their
 * own providers.
 */
export function provideOgeLocale(pack: PackSource): Provider[] {
  const live = typeof pack === 'function';
  const read = live ? pack : () => pack;
  // one helper per family: static object for a static pack, a function (the
  // live config form) when the pack itself is live
  const config = <T>(build: (p: OgeLocalePack) => T): T | (() => T) =>
    live ? () => build(read()) : build(read());
  return [
    provideOgeGridConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_GRID_MESSAGES, p.grid),
      })),
    ),
    provideOgeInputsConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_INPUTS_MESSAGES, p.inputs),
      })),
    ),
    provideOgeButtonsConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_BUTTONS_MESSAGES, p.buttons),
      })),
    ),
    provideOgeOverlayConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_OVERLAY_MESSAGES, p.overlay),
      })),
    ),
    provideOgeTabsConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_TABS_MESSAGES, p.tabs),
      })),
    ),
    provideOgeFormsConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_FORMS_MESSAGES, p.forms),
      })),
    ),
    provideOgeUploadConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_UPLOAD_MESSAGES, p.upload),
      })),
    ),
    provideOgeEditorConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_EDITOR_MESSAGES, p.editor),
      })),
    ),
    provideOgeAccordionConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_ACCORDION_MESSAGES,
          p.layout?.accordion,
        ),
      })),
    ),
    provideOgeProgressBarConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
          p.layout?.progressBar,
        ),
      })),
    ),
    provideOgeLoadIndicatorConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
          p.layout?.loadIndicator,
        ),
      })),
    ),
    provideOgeSplitterConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_SPLITTER_MESSAGES,
          p.layout?.splitter,
        ),
      })),
    ),
    provideOgeToolbarConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_TOOLBAR_MESSAGES,
          p.layout?.toolbar,
        ),
      })),
    ),
    provideOgeAvatarConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_AVATAR_MESSAGES,
          p.layout?.avatar,
        ),
      })),
    ),
    provideOgeBadgeConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(OGE_DEFAULT_BADGE_MESSAGES, p.layout?.badge),
      })),
    ),
    provideOgeChipConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_CHIP_MESSAGES, p.layout?.chip),
      })),
    ),
    provideOgeAlertConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_ALERT_MESSAGES, p.layout?.alert),
      })),
    ),
    // no catalog — the timeline only needs the pack's locale for its dates
    provideOgeTimelineConfig(config((p) => ({ locale: p.locale }))),
    provideOgeCarouselConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_CAROUSEL_MESSAGES,
          p.layout?.carousel,
        ),
      })),
    ),
    provideOgeListViewConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_LIST_VIEW_MESSAGES,
          p.layout?.listView,
        ),
      })),
    ),
    provideOgeDataViewConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_DATA_VIEW_MESSAGES,
          p.layout?.dataView,
        ),
      })),
    ),
    provideOgeTileLayoutConfig(
      config((p) => ({
        locale: p.locale,
        messages: ogeMergeMessages(
          OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
          p.layout?.tileLayout,
        ),
      })),
    ),
    provideOgeFabConfig(
      config((p) => ({
        messages: ogeMergeMessages(OGE_DEFAULT_FAB_MESSAGES, p.fab),
      })),
    ),
    provideOgeBreadcrumbConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_BREADCRUMB_MESSAGES,
          p.navigation?.breadcrumb,
        ),
      })),
    ),
    provideOgeDrawerConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_DRAWER_MESSAGES,
          p.navigation?.drawer,
        ),
      })),
    ),
    provideOgeMenubarConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_MENUBAR_MESSAGES,
          p.navigation?.menubar,
        ),
      })),
    ),
    provideOgePaginationConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_PAGINATION_MESSAGES,
          p.navigation?.pagination,
        ),
      })),
    ),
    provideOgeStepperConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_STEPPER_MESSAGES,
          p.navigation?.stepper,
        ),
      })),
    ),
    provideOgeTreeViewConfig(
      config((p) => ({
        messages: ogeMergeMessages(
          OGE_DEFAULT_TREE_VIEW_MESSAGES,
          p.navigation?.treeView,
        ),
      })),
    ),
  ];
}
