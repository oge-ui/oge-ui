// Type-only imports, all of them: the catalogs' shapes are single-sourced in
// `@oge-ui/behavior` (MIT families) and the commercial engines, and this
// package only ever *references* them. `import type` is erased by the build,
// so `@oge-ui/locales` ships no runtime dependency at all — and in particular
// no commercial code. The commercial engines are optional peer dependencies:
// an app that never installs one simply never reads that slice, and its
// `skipLibCheck` (the Angular CLI and Vite default) keeps the unresolved type
// reference silent.
import type {
  OgeAccordionMessages,
  OgeAlertMessages,
  OgeAvatarMessages,
  OgeBadgeMessages,
  OgeBreadcrumbMessages,
  OgeButtonsMessages,
  OgeChipMessages,
  OgeDrawerMessages,
  OgeFabMessages,
  OgeFormsMessages,
  OgeGridMessages,
  OgeInputsMessages,
  OgeLoadIndicatorMessages,
  OgeMenubarMessages,
  OgeOverlayMessages,
  OgePaginationMessages,
  OgeProgressBarMessages,
  OgeSplitterMessages,
  OgeStepperMessages,
  OgeTabsMessages,
  OgeToolbarMessages,
  OgeTreeViewMessages,
  OgeUploadMessages,
} from '@oge-ui/behavior';
import type { OgeBpmnMessages } from '@oge-ui/bpmn-engine';
import type { OgeChartsMessages } from '@oge-ui/charts-engine';
import type { OgeGanttMessages } from '@oge-ui/gantt-engine';
import type { OgeKanbanMessages } from '@oge-ui/kanban-engine';
import type { OgePivotMessages } from '@oge-ui/pivot-engine';
import type { OgeSchedulerMessages } from '@oge-ui/scheduler-engine';

/**
 * A catalog with every key optional, nested blocks included. Packs are deep
 * partial on purpose: a key a newer release adds to a catalog is simply
 * missing from an older pack — it falls back to the English default through
 * {@link ogeMergeMessages} instead of breaking the app's build.
 */
export type OgeDeepPartial<T> = {
  [K in keyof T]?: T[K] extends string
    ? T[K]
    : T[K] extends object
      ? OgeDeepPartial<T[K]>
      : T[K];
};

/** The layout family's catalogs, one per component. */
export interface OgeLocaleLayoutMessages {
  readonly accordion?: OgeDeepPartial<OgeAccordionMessages>;
  readonly progressBar?: OgeDeepPartial<OgeProgressBarMessages>;
  readonly loadIndicator?: OgeDeepPartial<OgeLoadIndicatorMessages>;
  readonly splitter?: OgeDeepPartial<OgeSplitterMessages>;
  readonly toolbar?: OgeDeepPartial<OgeToolbarMessages>;
  readonly avatar?: OgeDeepPartial<OgeAvatarMessages>;
  readonly badge?: OgeDeepPartial<OgeBadgeMessages>;
  readonly chip?: OgeDeepPartial<OgeChipMessages>;
  readonly alert?: OgeDeepPartial<OgeAlertMessages>;
}

/** The navigation family's catalogs, one per component. */
export interface OgeLocaleNavigationMessages {
  readonly breadcrumb?: OgeDeepPartial<OgeBreadcrumbMessages>;
  readonly drawer?: OgeDeepPartial<OgeDrawerMessages>;
  readonly menubar?: OgeDeepPartial<OgeMenubarMessages>;
  readonly pagination?: OgeDeepPartial<OgePaginationMessages>;
  readonly stepper?: OgeDeepPartial<OgeStepperMessages>;
  readonly treeView?: OgeDeepPartial<OgeTreeViewMessages>;
}

/**
 * One language for the whole suite: the BCP 47 `locale` its `Intl` formats
 * use, the writing direction, and a translated slice per message catalog.
 * Every slice is optional and deep partial — what a pack leaves out stays
 * English. The tree list reads the grid's catalog, so `grid` covers both.
 *
 * ```ts
 * import { tr } from '@oge-ui/locales/tr';
 * providers: [provideOgeLocale(tr)]; // oge-ui
 * ```
 */
export interface OgeLocalePack {
  /** BCP 47 tag fed to every family's `locale` config (`Intl` formats). */
  readonly locale: string;
  /** Writing direction. Components follow the page's `dir`; set it from this. */
  readonly dir: 'ltr' | 'rtl';
  /** Data grid and tree list (`provideOgeGridConfig`). */
  readonly grid?: OgeDeepPartial<OgeGridMessages>;
  /** Editors (`provideOgeInputsConfig`). */
  readonly inputs?: OgeDeepPartial<OgeInputsMessages>;
  /** Buttons (`provideOgeButtonsConfig`). */
  readonly buttons?: OgeDeepPartial<OgeButtonsMessages>;
  /** Floating action button and speed dial (`provideOgeFabConfig`). */
  readonly fab?: OgeDeepPartial<OgeFabMessages>;
  /** Modal, toast, tooltip (`provideOgeOverlayConfig`). */
  readonly overlay?: OgeDeepPartial<OgeOverlayMessages>;
  /** Tabs (`provideOgeTabsConfig`). */
  readonly tabs?: OgeDeepPartial<OgeTabsMessages>;
  /** Form layout (`provideOgeFormsConfig`). */
  readonly forms?: OgeDeepPartial<OgeFormsMessages>;
  /** File uploader (`provideOgeUploadConfig`). */
  readonly upload?: OgeDeepPartial<OgeUploadMessages>;
  /** Accordion, progress bar, load indicator, splitter, toolbar, avatar, badge, chip, alert. */
  readonly layout?: OgeLocaleLayoutMessages;
  /** Breadcrumb, drawer, menubar, pagination, stepper, tree view. */
  readonly navigation?: OgeLocaleNavigationMessages;
  /** Commercial: pivot grid (`provideOgePivotMessages`). */
  readonly pivot?: OgeDeepPartial<OgePivotMessages>;
  /** Commercial: scheduler (`provideOgeSchedulerConfig`). */
  readonly scheduler?: OgeDeepPartial<OgeSchedulerMessages>;
  /** Commercial: Gantt (`provideOgeGanttConfig`). */
  readonly gantt?: OgeDeepPartial<OgeGanttMessages>;
  /** Commercial: Kanban (`provideOgeKanbanConfig`). */
  readonly kanban?: OgeDeepPartial<OgeKanbanMessages>;
  /** Commercial: BPMN modeler (`provideOgeBpmnConfig`). */
  readonly bpmn?: OgeDeepPartial<OgeBpmnMessages>;
  /** Commercial: charts (`provideOgeChartsConfig`). */
  readonly charts?: OgeDeepPartial<OgeChartsMessages>;
}
