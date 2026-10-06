export {
  useAnchoredPanel,
  type UseAnchoredPanelOptions,
  type OgeAnchoredPanelHandle,
} from './lib/use-anchored-panel';
export { OgePopup, type OgePopupProps } from './lib/popup';
export {
  useOgeAdaptiveViewport,
  useOgeAdaptivePresentation,
} from './lib/use-adaptive';
export {
  OgeMenuList,
  type OgeMenuListProps,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
  type OgeMenuCloseRequestEvent,
} from './lib/menu-list';
export {
  OgeTooltip,
  type OgeTooltipProps,
  type OgeTooltipHandle,
} from './lib/tooltip';
export {
  OgeContextMenu,
  type OgeContextMenuProps,
  type OgeContextMenuHandle,
} from './lib/context-menu';
export {
  OgePopover,
  type OgePopoverProps,
  type OgePopoverHandle,
  type OgePopoverSlotContext,
} from './lib/popover';
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
  type OgeConfirmOptions,
  type OgeAlertOptions,
  type OgePromptOptions,
} from './lib/dialog-content';
export {
  OgeWindow,
  type OgeWindowProps,
  type OgeWindowHandle,
} from './lib/window';
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
  useOgeLiveAnnouncer,
  type OgeLiveAnnouncerHandle,
} from './lib/live-announcer';
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
  OgePopupArrow,
  OgeTooltipShowMode,
  OgeContextMenuOpeningEvent,
  OgePopoverShowOn,
  OgePopoverOpenReason,
  OgePopoverCloseReason,
  OgePopoverInitialFocus,
  OgePopoverOpeningEvent,
  OgePopoverOpenedEvent,
  OgePopoverClosingEvent,
  OgePopoverClosedEvent,
  OgeModalCloseReason,
  OgeModalOpeningEvent,
  OgeModalClosingEvent,
  OgeModalClosedEvent,
  OgeModalResizeEvent,
  OgeModalAutoFocus,
  OgeModalPlacement,
  OgeModalRole,
  OgeDialogSeverity,
  OgePromptInputType,
  OgePromptValidator,
  OgeWindowState,
  OgeWindowPlacement,
  OgeWindowAutoFocus,
  OgeWindowPosition,
  OgeWindowResizeEdge,
  OgeWindowCloseReason,
  OgeWindowChangeSource,
  OgeWindowOpeningEvent,
  OgeWindowClosingEvent,
  OgeWindowClosedEvent,
  OgeWindowMovedEvent,
  OgeWindowResizedEvent,
  OgeWindowStateChangingEvent,
  OgeWindowStateChangedEvent,
  OgeToastSeverity,
  OgeToastPosition,
  OgeToastCloseReason,
  OgeToastAnnounce,
  OgeToastAction,
  OgeToastActionEvent,
  OgeToastClosedEvent,
  OgeLivePoliteness,
  OgeLiveAnnounceOptions,
  OgeAdaptiveConfig,
  OgeAdaptiveMode,
  OgeAdaptivePresentation,
} from '@oge-ui/behavior';
export type { OgeMenuItemType } from '@oge-ui/behavior';
// The checkbox/radio state helper is framework-free; re-exported so a menu's
// owner updates its items from the package it already imports.
export { applyMenuItemCheck } from '@oge-ui/behavior';
