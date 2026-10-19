import { signal } from '@angular/core';

/**
 * Whether the docs app's root toast service runs in stack mode — a live
 * `provideOgeOverlayConfig(() => ({ toastStacked: … }))` in `app.config.ts`
 * reads it, so the toast page can switch the mode for its "Stack mode" demo.
 * Off by default, so every other page (and its e2e) sees plain toasts.
 */
export const TOAST_STACK_DEMO = signal(false);
