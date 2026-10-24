import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { en, type OgeLocalePack } from '@oge-ui/locales';
import { tr } from '@oge-ui/locales/tr';
import { provideOgeLocale } from 'oge-ui';
import type { KbLocaleCode } from './data';

export const activeLang = signal<KbLocaleCode>('en');

export const activeLocalePack = (): OgeLocalePack => (activeLang() === 'tr' ? tr : en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideOgeLocale(() => activeLocalePack()),
  ],
};
