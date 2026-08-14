// The crumb vocabulary and the click payload are framework-free and live in
// `@oge-ui/behavior` (ADR 0001) — re-exported so Angular consumers keep
// importing them from this package. Only the `TemplateRef` contexts below are
// Angular-specific.
export type {
  OgeBreadcrumbCollapseMode,
  OgeBreadcrumbItemData,
  OgeBreadcrumbItemClickEvent,
} from '@oge-ui/behavior';

import type { OgeBreadcrumbItemData } from '@oge-ui/behavior';

/** Template context of `[ogeBreadcrumbItemTemplate]`. */
export interface OgeBreadcrumbItemTemplateContext {
  $implicit: OgeBreadcrumbItemData;
  index: number;
  /** `true` on the current page's crumb. */
  last: boolean;
}

/** Template context of `[ogeBreadcrumbSeparatorTemplate]`. */
export interface OgeBreadcrumbSeparatorTemplateContext {
  /** Index of the crumb the separator precedes. */
  index: number;
}
