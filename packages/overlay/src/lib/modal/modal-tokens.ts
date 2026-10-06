import { InjectionToken } from '@angular/core';

/**
 * Data passed via `OgeModalService.open(component, { data })`; inject it in
 * the content component: `readonly data = inject(OGE_MODAL_DATA)`.
 */
export const OGE_MODAL_DATA = new InjectionToken<unknown>('OGE_MODAL_DATA');
