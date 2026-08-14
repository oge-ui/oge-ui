import type { OgeMenubarItemData } from '@oge-ui/behavior';

/**
 * The menubar's vocabulary and event payloads live in `@oge-ui/behavior`
 * (ADR 0001) so the Angular and React menubars cannot drift; they are
 * re-exported here so consumers of `@oge-ui/navigation` need one import.
 * Only the `TemplateRef` context below is Angular-shaped and stays local.
 */
export type {
  OgeMenubarOrientation,
  OgeMenubarOpenMode,
  OgeMenubarCloseReason,
  OgeMenubarItemData,
  OgeMenubarItemClickEvent,
  OgeMenubarSubmenuOpeningEvent,
  OgeMenubarSubmenuOpenedEvent,
  OgeMenubarSubmenuClosingEvent,
  OgeMenubarSubmenuClosedEvent,
  OgeMenubarCompactChangedEvent,
} from '@oge-ui/behavior';

/** Template context of `[ogeMenubarItemTemplate]` (top-level bar items). */
export interface OgeMenubarItemTemplateContext {
  $implicit: OgeMenubarItemData;
  index: number;
}
