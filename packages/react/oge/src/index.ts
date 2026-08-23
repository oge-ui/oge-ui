/**
 * Umbrella entry for the OGE React UI suite: one install, one import path.
 *
 * ```sh
 * npm install @oge-ui/react
 * ```
 *
 * ```tsx
 * import { OgeButton, OgeTextBox, OgeTabPanel, OgeCard } from '@oge-ui/react';
 * import '@oge-ui/react/styles.css';
 * ```
 *
 * Star re-exports are the deliberate exception to the house "named exports
 * only" barrel rule — this package mirrors five APIs verbatim and must never
 * drift from them. The scoped packages remain the canonical import paths for
 * size-conscious apps: installing one family pulls in only that family.
 *
 * The families re-exported here share one framework-free engine
 * (`@oge-ui/behavior`, `@oge-ui/core`) with the Angular suite, so the
 * vocabulary types and config shapes below are the same objects the Angular
 * packages document — imported once, from whichever entry point you use.
 *
 * `@oge-ui/react-overlay` is re-exported last: `@oge-ui/react-buttons`,
 * `@oge-ui/react-inputs` and `@oge-ui/react-tabs` each re-export a handful of
 * the same shared vocabulary types from `@oge-ui/behavior`, and ESM silently
 * drops any name exported by two stars. Explicit named re-exports below
 * resolve those collisions so every symbol stays reachable.
 */
export * from '@oge-ui/react-buttons';
export * from '@oge-ui/react-inputs';
export * from '@oge-ui/react-tabs';
export * from '@oge-ui/react-layout';
export * from '@oge-ui/react-navigation';
export * from '@oge-ui/react-forms';
export * from '@oge-ui/react-upload';
export * from '@oge-ui/react-grid';
export {
  useAnchoredPanel,
  OgePopup,
  OgeMenuList,
  OgeTooltip,
  OgeContextMenu,
  OgeModal,
  OgeModalProvider,
  OgeModalRef,
  useOgeModals,
  useOgeModalData,
  useOgeModalRef,
  OgeToastProvider,
  OgeToastRef,
  useOgeToasts,
  OgeOverlayConfigProvider,
  useOgeOverlayConfig,
  type UseAnchoredPanelOptions,
  type OgeAnchoredPanelHandle,
  type OgePopupProps,
  type OgeMenuListProps,
  type OgeMenuListHandle,
  type OgeMenuListItemClickEvent,
  type OgeMenuCloseRequestEvent,
  type OgeTooltipProps,
  type OgeContextMenuProps,
  type OgeContextMenuHandle,
  type OgeModalProps,
  type OgeModalHandle,
  type OgeModalSlotContext,
  type OgeModalsHandle,
  type OgeModalOpenConfig,
  type OgeModalContent,
  type OgeModalContentContext,
  type OgeToastsHandle,
  type OgeToastOptions,
  type OgeToastUpdate,
  type OgeToastPromiseOptions,
  type OgeToastSlotContext,
  type OgeOverlayConfig,
  type OgeOverlayConfigInput,
  type OgeOverlayMessages,
} from '@oge-ui/react-overlay';
export type {
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
// Shared vocabulary that more than one family re-exports — named here so the
// star exports above cannot drop it.
export type {
  OgeMenuItem,
  OgeMenuItemSeverity,
  OgeMenuCloseReason,
  OgePopupCloseReason,
  OgePopupPlacement,
  OgeResolvedPopupPosition,
} from '@oge-ui/behavior';
