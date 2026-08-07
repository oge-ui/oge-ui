/** Why the modal closed. */
export type OgeModalCloseReason = 'api' | 'escape' | 'backdrop' | 'closeButton';

/** Cancelable pre-event fired before the modal opens. */
export interface OgeModalOpeningEvent {
  /** Set `true` to keep the modal closed. */
  cancel: boolean;
}

/** Payload of the resize outputs. */
export interface OgeModalResizeEvent {
  /** Panel width in px (start size for `resizeStarted`, final for `resized`). */
  readonly width: number;
  /** Panel height in px (start size for `resizeStarted`, final for `resized`). */
  readonly height: number;
  /** The originating pointer event. */
  readonly event: PointerEvent;
}

/** Cancelable pre-event fired before the modal closes for any reason. */
export interface OgeModalClosingEvent {
  /** What triggered the close. */
  readonly reason: OgeModalCloseReason;
  /** Set `true` to keep the modal open. */
  cancel: boolean;
}

/** Fired after the modal closed. */
export interface OgeModalClosedEvent<R = unknown> {
  /** What triggered the close. */
  readonly reason: OgeModalCloseReason;
  /** Value passed to `close(result)` or the slot `close` function, if any. */
  readonly result?: R;
}

/**
 * Initial-focus strategy: the first tabbable element, the panel itself, or a
 * CSS selector resolved inside the panel.
 */
export type OgeModalAutoFocus = 'first-tabbable' | 'panel' | (string & {});

/** Where the panel sits in the viewport. */
export type OgeModalPlacement = 'center' | 'top';

/** Context of the `*ogeModalTitle` / `*ogeModalFooter` slots. */
export interface OgeModalSlotContext {
  /** Closes the modal (reason `'api'`); an argument becomes `closed.result`. */
  $implicit: (result?: unknown) => void;
}
