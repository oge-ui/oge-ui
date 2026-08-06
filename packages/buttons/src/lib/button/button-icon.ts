import { Directive } from '@angular/core';

/**
 * Marks projected content as the button's icon slot:
 *
 * ```html
 * <oge-button text="Save">
 *   <svg ogeButtonIcon viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">…</svg>
 * </oge-button>
 * ```
 *
 * Placement relative to the label follows the button's `iconPosition` input.
 * Icon-only buttons must provide an accessible name via `hint` or `aria-label`.
 */
@Directive({ selector: '[ogeButtonIcon]' })
export class OgeButtonIcon {}
