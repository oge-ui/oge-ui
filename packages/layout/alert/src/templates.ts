import { Directive } from '@angular/core';

/**
 * Marks a row of controls rendered under the alert's message — "Retry",
 * "Undo", "View details". They are real controls in the Tab sequence:
 *
 * ```html
 * <oge-alert severity="error" title="Upload failed">
 *   The server rejected the file.
 *   <div ogeAlertActions>
 *     <button type="button" (click)="retry()">Retry</button>
 *   </div>
 * </oge-alert>
 * ```
 */
@Directive({
  selector: '[ogeAlertActions]',
  host: { class: 'oge-alert-actions' },
})
export class OgeAlertActions {}

/**
 * Replaces the default severity glyph with your own icon (an `<svg>`, an icon
 * font `<i>`). It is rendered inside an `aria-hidden` wrapper — the severity
 * reaches screen readers through the visually hidden prefix, not the icon.
 */
@Directive({
  selector: '[ogeAlertIcon]',
  host: { class: 'oge-alert-custom-icon' },
})
export class OgeAlertIcon {}
