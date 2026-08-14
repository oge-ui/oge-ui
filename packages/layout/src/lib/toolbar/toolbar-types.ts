import type { OgeToolbarItemData } from '@oge-ui/behavior';

// The toolbar's vocabulary and its event payloads live framework-free in
// `@oge-ui/behavior` (`toolbar-core`), shared with the React render layer;
// this file re-exports them under the names the Angular package has always
// published and adds the one Angular-only shape (the template context).
export type {
  OgeToolbarItemLocation,
  OgeToolbarLocateInMenu,
  OgeToolbarDisplayMode,
  OgeToolbarItemType,
  OgeToolbarOverflow,
  OgeToolbarOrientation,
  OgeToolbarSize,
  OgeToolbarStylingMode,
  OgeToolbarItemSeverity,
  OgeToolbarMenuCloseReason,
  OgeToolbarItemData,
  OgeToolbarItemClickEvent,
  OgeToolbarItemHoldEvent,
  OgeToolbarItemActiveChangedEvent,
  OgeToolbarOverflowChangedEvent,
  OgeToolbarMenuOpeningEvent,
  OgeToolbarMenuClosingEvent,
  OgeToolbarMenuClosedEvent,
} from '@oge-ui/behavior';

/** Context of `[ogeToolbarItemTemplate]` and `[ogeToolbarMenuItemTemplate]`. */
export interface OgeToolbarItemTemplateContext {
  /** The source `items` entry — `undefined` for declarative children. */
  $implicit: OgeToolbarItemData | undefined;
  index: number;
  /** `true` when the item is being stamped inside the overflow menu. */
  inMenu: boolean;
}
