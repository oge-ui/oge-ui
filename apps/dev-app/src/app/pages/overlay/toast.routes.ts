import type { Routes } from '@angular/router';
import { OgeToastService, provideOgeOverlayConfig } from '@oge-ui/overlay';
import { OverlayToastPage } from './toast';
import { TOAST_STACK_DEMO } from './toast-stack-demo';

/**
 * The toast page runs its own `OgeToastService` under a live overlay config,
 * so its "Stack mode" demo can switch between plain and stacked regions. It
 * lives in this lazy route — a root provider would pull `@oge-ui/overlay`
 * into the docs app's initial bundle.
 */
export const TOAST_ROUTES: Routes = [
  {
    path: '',
    component: OverlayToastPage,
    providers: [
      OgeToastService,
      provideOgeOverlayConfig(() => ({ toastStacked: TOAST_STACK_DEMO() })),
    ],
  },
];
