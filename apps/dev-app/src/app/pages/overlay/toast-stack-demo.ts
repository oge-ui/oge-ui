import { signal } from '@angular/core';

/**
 * Whether the toast page's service runs in stack mode — the live
 * `provideOgeOverlayConfig(() => ({ toastStacked: … }))` in `toast.routes.ts`
 * reads it, so the page can switch the mode for its "Stack mode" demo. Off by
 * default, and reset when the page goes.
 */
export const TOAST_STACK_DEMO = signal(false);
