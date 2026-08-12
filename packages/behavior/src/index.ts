export {
  resolvePopupPosition,
  type OgePopupSide,
  type OgePopupAlign,
  type OgePopupPlacement,
  type OgeRect,
  type OgePopupPositionRequest,
  type OgeResolvedPopupPosition,
} from './lib/overlay/position';
export {
  pushOverlay,
  removeOverlay,
  isTopOverlay,
} from './lib/overlay/overlay-stack';
export { getTabbableElements, trapTabKey } from './lib/overlay/focus-trap';
export {
  lockBodyScroll,
  unlockBodyScroll,
  // `@internal`, but necessarily package-public: the scroll lock is module
  // state, and the modal specs that have to reset it between cases now live
  // one package away. Not re-exported from any component package's barrel.
  resetScrollLockForTests,
} from './lib/overlay/scroll-lock';
