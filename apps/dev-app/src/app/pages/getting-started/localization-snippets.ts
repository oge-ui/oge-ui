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
