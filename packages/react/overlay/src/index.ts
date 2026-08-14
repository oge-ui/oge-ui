export {
  useAnchoredPanel,
  type UseAnchoredPanelOptions,
  type OgeAnchoredPanelHandle,
} from './lib/use-anchored-panel';
export { OgePopup, type OgePopupProps } from './lib/popup';
export {
  OgeMenuList,
  type OgeMenuListProps,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
  type OgeMenuCloseRequestEvent,
} from './lib/menu-list';
export {
  OgeOverlayConfigProvider,
  useOgeOverlayConfig,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
} from './lib/overlay-config';
// The canonical menu vocabulary, shared with the Angular overlay via
// `@oge-ui/behavior` — re-exported so React consumers import one package.
export type {
  OgeMenuItem,
  OgeMenuItemSeverity,
  OgeMenuCloseReason,
  OgePopupCloseReason,
  OgePopupPlacement,
  OgeResolvedPopupPosition,
} from '@oge-ui/behavior';
