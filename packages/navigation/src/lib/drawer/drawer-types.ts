// The drawer vocabulary and event payloads live framework-free in
// `@oge-ui/behavior` (`drawer-core`), shared with the React render layer;
// re-exported here so existing imports keep working.
export type {
  OgeDrawerMode,
  OgeDrawerPosition,
  OgeDrawerLandmark,
  OgeDrawerAutoFocus,
  OgeDrawerCloseReason,
  OgeDrawerOpeningEvent,
  OgeDrawerClosingEvent,
  OgeDrawerClosedEvent,
  OgeDrawerModeChangedEvent,
  OgeDrawerItem,
  OgeDrawerItemClickEvent,
  OgeDrawerSelectionChangedEvent,
} from '@oge-ui/behavior';
import type { OgeDrawerItem } from '@oge-ui/behavior';

/** Context of `[ogeDrawerItemTemplate]`. */
export interface OgeDrawerItemTemplateContext {
  /** The entry. */
  $implicit: OgeDrawerItem;
  /** Its selection key. */
  key: string;
  /** Whether it is the `selectedKey` entry. */
  active: boolean;
  /** Whether the drawer is a collapsed mini rail (icons only) right now. */
  rail: boolean;
  /** Position in `items`. */
  index: number;
}
