import { Directive } from '@angular/core';

/**
 * Moves an element into the app bar's start section — a menu button, a
 * logo:
 *
 * ```html
 * <oge-app-bar>
 *   <button ogeAppBarStart type="button" aria-label="Menu">☰</button>
 *   <h1>Inbox</h1>
 *   <button ogeAppBarEnd type="button">Sign out</button>
 * </oge-app-bar>
 * ```
 */
@Directive({
  selector: '[ogeAppBarStart]',
  host: { class: 'oge-app-bar-slot-start' },
})
export class OgeAppBarStart {}

/**
 * Moves an element into the app bar's center section explicitly. Unmarked
 * content lands there too; the marker is for content that must come after
 * other center content in source order, or for readability.
 */
@Directive({
  selector: '[ogeAppBarCenter]',
  host: { class: 'oge-app-bar-slot-center' },
})
export class OgeAppBarCenter {}

/** Moves an element into the app bar's end section — actions, an avatar. */
@Directive({
  selector: '[ogeAppBarEnd]',
  host: { class: 'oge-app-bar-slot-end' },
})
export class OgeAppBarEnd {}
