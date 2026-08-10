/** Fill color of the bar — the card/toast severity vocabulary. */
export type OgeProgressBarSeverity =
  'accent' | 'success' | 'warning' | 'danger';

/** The value reached `max` — fired once per completion (dx `onComplete`). */
export interface OgeProgressBarCompletedEvent {
  value: number;
}
