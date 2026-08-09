export {
  resolvePopupPosition,
  type OgePopupSide,
  type OgePopupAlign,
  type OgePopupPlacement,
  type OgeRect,
  type OgePopupPositionRequest,
  type OgeResolvedPopupPosition,
} from './lib/position/position';
export {
  OgeAnchoredPanel,
  type OgeAnchoredPanelOptions,
  type OgePopupCloseReason,
} from './lib/panel/anchored-panel';
export { OgePopup } from './lib/popup/popup';
// Primitives a modal surface implemented in another package needs. They are
// public so that surface can join *this* Escape stack and reuse *this* focus
// trap rather than growing a second, competing copy of either.
export { pushOverlay, removeOverlay, isTopOverlay } from './lib/overlay-stack';
export { getTabbableElements, trapTabKey } from './lib/modal/focus-trap';
export { lockBodyScroll, unlockBodyScroll } from './lib/modal/scroll-lock';
export {
  type OgeMenuItem,
  type OgeMenuItemSeverity,
  type OgeMenuListItemClickEvent,
  type OgeMenuCloseRequestEvent,
  type OgeMenuItemTemplateContext,
} from './lib/menu/menu-types';
export { OgeMenuList } from './lib/menu/menu-list';
export { OgeTooltip } from './lib/tooltip/tooltip';
export { OgeContextMenu } from './lib/context-menu/context-menu';
export { OgeModal } from './lib/modal/modal';
export {
  OgeModalTitle,
  OgeModalHeaderActions,
  OgeModalFooter,
} from './lib/modal/modal-templates';
export {
  OgeModalService,
  OgeModalRef,
  OGE_MODAL_DATA,
  type OgeModalOpenConfig,
} from './lib/modal/modal-service';
export {
  type OgeModalCloseReason,
  type OgeModalOpeningEvent,
  type OgeModalClosingEvent,
  type OgeModalClosedEvent,
  type OgeModalResizeEvent,
  type OgeModalAutoFocus,
  type OgeModalPlacement,
  type OgeModalSlotContext,
} from './lib/modal/modal-types';
export { OgeToastService, OgeToastRef } from './lib/toast/toast-service';
export {
  type OgeToastSeverity,
  type OgeToastPosition,
  type OgeToastCloseReason,
  type OgeToastAnnounce,
  type OgeToastAction,
  type OgeToastActionEvent,
  type OgeToastClosedEvent,
  type OgeToastSlotContext,
  type OgeToastOptions,
  type OgeToastUpdate,
  type OgeToastPromiseOptions,
} from './lib/toast/toast-types';
export {
  provideOgeOverlayConfig,
  OGE_OVERLAY_CONFIG,
  OGE_DEFAULT_OVERLAY_CONFIG,
  OGE_DEFAULT_OVERLAY_MESSAGES,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
  type OgeOverlayMessages,
} from './lib/config';
