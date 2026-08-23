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
export { OgeTooltip, type OgeTooltipProps } from './lib/tooltip';
export {
  OgeContextMenu,
  type OgeContextMenuProps,
  type OgeContextMenuHandle,
} from './lib/context-menu';
export {
  OgeModal,
  type OgeModalProps,
  type OgeModalHandle,
  type OgeModalSlotContext,
} from './lib/modal';
export {
  OgeModalProvider,
  OgeModalRef,
  useOgeModals,
  useOgeModalData,
  useOgeModalRef,
  type OgeModalsHandle,
  type OgeModalOpenConfig,
  type OgeModalContent,
  type OgeModalContentContext,
} from './lib/modal-provider';
export {
  OgeToastProvider,
  OgeToastRef,
  useOgeToasts,
  type OgeToastsHandle,
  type OgeToastOptions,
  type OgeToastUpdate,
  type OgeToastPromiseOptions,
  type OgeToastSlotContext,
} from './lib/toast';
export {
  OgeOverlayConfigProvider,
  useOgeOverlayConfig,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
  type OgeOverlayMessages,
} from './lib/overlay-config';
// The canonical vocabulary, shared with the Angular overlay via
// `@oge-ui/behavior` — re-exported so React consumers import one package.
export type {
  OgeMenuItem,
  OgeMenuItemSeverity,
  OgeMenuCloseReason,
  OgePopupCloseReason,
  OgePopupPlacement,
  OgeResolvedPopupPosition,
  OgeModalCloseReason,
  OgeModalOpeningEvent,
  OgeModalClosingEvent,
  OgeModalClosedEvent,
  OgeModalResizeEvent,
  OgeModalAutoFocus,
  OgeModalPlacement,
  OgeToastSeverity,
  OgeToastPosition,
  OgeToastCloseReason,
  OgeToastAnnounce,
  OgeToastAction,
  OgeToastActionEvent,
  OgeToastClosedEvent,
} from '@oge-ui/behavior';
