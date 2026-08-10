/** Axis the slider lays its track along. */
export type OgeSliderOrientation = 'horizontal' | 'vertical';

/**
 * When the inline value bubble shows: `'none'` never, `'active'` while a
 * thumb is focused or dragged (Material's `discrete`), `'always'` (DevExtreme
 * `tooltip.showMode: 'always'`).
 */
export type OgeSliderValueIndicator = 'none' | 'active' | 'always';

/** A drag gesture began on a thumb (or on the track, which moves a thumb). */
export interface OgeSliderDragStartedEvent {
  event: PointerEvent;
}

/**
 * A drag gesture completed — the release-time counterpart of the live
 * `valueCommitted` stream (PrimeNG `onSlideEnd`; DevExtreme's
 * `valueChangeMode: 'onHandleRelease'` is this event). Not emitted when the
 * gesture is cancelled with Escape.
 */
export interface OgeSliderSlideEndedEvent<T> {
  value: T;
  event: PointerEvent;
}
