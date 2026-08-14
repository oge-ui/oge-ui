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
} from '@oge-ui/behavior';
