import { Directive } from '@angular/core';

/**
 * Marks projected content as the field's leading adornment:
 *
 * ```html
 * <oge-text-box label="Search">
 *   <svg ogeInputPrefix …></svg>
 * </oge-text-box>
 * ```
 */
@Directive({ selector: '[ogeInputPrefix]' })
export class OgeInputPrefix {}

/**
 * Marks projected content as the field's trailing adornment. Custom suffixes
 * render at the end of the rail, after the built-in buttons.
 */
@Directive({ selector: '[ogeInputSuffix]' })
export class OgeInputSuffix {}
