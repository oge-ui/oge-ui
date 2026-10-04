/** Code samples rendered on the localization page. */

export const GLOBAL = `import { provideOgeGridConfig } from '@oge-ui/grid';
import { provideOgeInputsConfig } from '@oge-ui/inputs';
import { provideOgeButtonsConfig } from '@oge-ui/buttons';

// app.config.ts — a Turkish application
providers: [
  provideOgeGridConfig({
    messages: {
      noData: 'Kayıt bulunamadı',
      search: 'Ara…',
      rowsSuffix: 'satır',
      summaryLabels: { sum: 'Toplam', avg: 'Ort', min: 'Min', max: 'Maks', count: 'Adet' },
    },
  }),
  provideOgeInputsConfig({
    messages: {
      requiredError: 'Bu alan zorunludur',
      clearButton: 'Temizle',
      counterAria: '{max} karakterden {count} tanesi kullanıldı',
    },
  }),
  provideOgeButtonsConfig({
    messages: { loading: 'Yükleniyor', holdToConfirm: 'Onaylamak için basılı tutun' },
  }),
]`;

export const PER_COMPONENT = `<!-- the [messages] input overrides the global catalog for one instance -->
<oge-grid [data]="rows" [messages]="{ noData: 'No matching orders' }" />

<oge-text-box
  label="Coupon code"
  [messages]="{ requiredError: 'Enter a coupon to continue' }"
/>`;

export const VALIDATION = `// Message patterns interpolate the constraint that failed:
provideOgeInputsConfig({
  messages: {
    minError: 'Value must be at least {min}',
    maxLengthError: 'Enter no more than {requiredLength} characters',
  },
})

// Priority when an editor resolves its error text:
// 1. errorText input          (always wins when set)
// 2. parse errors             (e.g. invalid number)
// 3. form errors              (Signal Forms / reactive), mapped through the catalog`;

export const NUMBER_LOCALE = `<!-- Intl-powered: grouping, decimal separator and currency follow the locale -->
<oge-number-box
  label="Price"
  locale="de-DE"
  [format]="{ style: 'currency', currency: 'EUR' }"
/>

<!-- without an explicit locale, editors use Angular's LOCALE_ID -->`;

export const BEHAVIOR = `// The same providers also carry non-text defaults:
provideOgeButtonsConfig({
  clickGuardMs: 300,       // default clickGuard window
  holdToConfirmMs: 1000,   // default hold duration
}),
provideOgeInputsConfig({
  spinRepeatDelayMs: 300,  // number-box spin: delay before repeating
  spinRepeatIntervalMs: 60,
  copiedResetMs: 1500,     // "copied" indicator duration
})`;

export const RUNTIME = `import { signal } from '@angular/core';
import { provideOgeGridConfig } from '@oge-ui/grid';
import { provideOgeInputsConfig } from '@oge-ui/inputs';
import { GRID_TR, INPUTS_TR } from './i18n/tr';

/** The app's own language state — a cookie, a store, a user setting… */
export const uiLanguage = signal<'en' | 'tr'>('en');

// Pass a function instead of an object: the config becomes live. Every OGE
// component re-renders its strings when a signal the function reads changes —
// no reload, no re-bootstrap. English is the built-in default, so '{}' is enough.
export const appConfig = {
  providers: [
    provideOgeGridConfig(() => ({
      messages: uiLanguage() === 'tr' ? GRID_TR : {},
    })),
    provideOgeInputsConfig(() => ({
      messages: uiLanguage() === 'tr' ? INPUTS_TR : {},
      locale: uiLanguage() === 'tr' ? 'tr-TR' : 'en-US', // Intl formats follow too
    })),
  ],
};

// anywhere: uiLanguage.set('tr');`;

export const RTL = `<!-- 1. Most components need nothing: layout uses CSS logical properties,
        so setting dir on <html> (or any ancestor) mirrors them. -->
<html lang="ar" dir="rtl">

<!-- 2. Components that compute geometry in script (grid, tree list, charts,
        scheduler, Gantt, kanban, pivot) follow the page too, and re-mirror
        when dir changes at runtime. rtlEnabled forces a direction for one
        instance and also sets dir on its host: -->
<oge-scheduler [dataSource]="appointments" [rtlEnabled]="true" />

// 3. Your own widgets can share the same rule (SSR-safe):
import { ogeIsRtl, observeDirection } from '@oge-ui/behavior';

const rtl = ogeIsRtl(hostElement); // computed direction, then the nearest dir
const stop = observeDirection(hostElement, (direction) => {
  // 'ltr' | 'rtl' — mirror your arrow keys / drag maths here
});`;
