// ---------------------------------------------------------------------------
// Re-exported from `@oge-ui/behavior`, where these framework-free primitives
// now live so the React render layer can share them (ADR 0001). They stay on
// this barrel as a compatibility surface: `@oge-ui/navigation`'s drawer and
// every downstream consumer keep importing them from `@oge-ui/overlay`, and
// nothing about the Angular-facing API changed.
// ---------------------------------------------------------------------------
export {
  resolvePopupPosition,
  type OgePopupSide,
  type OgePopupAlign,
  type OgePopupPlacement,
  type OgeRect,
  type OgePopupPositionRequest,
  type OgeResolvedPopupPosition,
} from '@oge-ui/behavior';
export {
  OgeAnchoredPanel,
  type OgeAnchoredPanelOptions,
  type OgePopupCloseReason,
} from './lib/panel/anchored-panel';
export { OgePopup } from './lib/popup/popup';
// Primitives a modal surface implemented in another package needs. They are
// public so that surface can join *this* Escape stack and reuse *this* focus
// trap rather than growing a second, competing copy of either — which is also
// exactly why they moved to `@oge-ui/behavior`: the stack has to stay single
// across render layers, not just across packages.
export {
  pushOverlay,
  removeOverlay,
  isTopOverlay,
  getTabbableElements,
  trapTabKey,
  lockBodyScroll,
  unlockBodyScroll,
} from '@oge-ui/behavior';
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
