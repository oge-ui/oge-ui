/** Code samples rendered on the localization page. */
import { demoSource } from '../../shared/demo-source';
import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

export const GLOBAL = `import { provideOgeGridConfig } from '@oge-ui/grid';
import { provideOgeInputsConfig } from '@oge-ui/inputs';
import { provideOgeButtonsConfig } from '@oge-ui/buttons';

// app.config.ts — a Turkish application
providers: [
  provideOgeGridConfig({
    messages: {
      noData: 'Kayıt bulunamadı',
      search: 'Ara…',
      pagerInfo: '{count} satır',
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

/**
 * The live demo of "Number & date locales": one grid, four locales. Dates,
 * declarative column formats, the total summary, the filter row's number
 * parsing and the plural-aware text all follow `locale`.
 */
export const LOCALE_GRID_DEMO = demoSource({
  use: { '@oge-ui/grid': ['OgeGrid', 'OgeColumn'] },
  helpers: { '@oge-ui/core': ['ogeFormatMessage'] },
  types: { '@oge-ui/core': ['OgeValueFormat'] },
  before: `interface Order {
  id: number;
  placed: Date;
  amount: number;
  share: number;
  quantity: number;
}

const ORDERS: Order[] = [
  { id: 1, placed: new Date(2026, 0, 5), amount: 1234.5, share: 0.125, quantity: 12500 },
  { id: 2, placed: new Date(2026, 2, 17), amount: 89.9, share: 0.5, quantity: 3 },
  { id: 3, placed: new Date(2026, 10, 30), amount: 15600, share: 0.375, quantity: 1 },
];

// ICU plural: every language's forms in one key; # is the count in the locale's digits
const ORDERS_TEXT = '{count, plural, =0 {No orders} one {# order} other {# orders}}';`,
  body: `readonly locales = ['en-US', 'de-DE', 'tr-TR', 'ar-EG'];
readonly locale = signal('de-DE');
readonly orders = ORDERS;

// declarative formats render through the shared Intl cache, in the grid's locale
readonly money: OgeValueFormat = { type: 'currency', currency: 'EUR' };
readonly percent: OgeValueFormat = { type: 'percent', minimumFractionDigits: 1 };
readonly count: OgeValueFormat = { type: 'number' };
readonly longDate: OgeValueFormat = { type: 'date', dateStyle: 'medium' };

readonly summary = computed(() =>
  ogeFormatMessage(ORDERS_TEXT, { count: this.orders.length }, this.locale()),
);`,
  template: `<div role="group" aria-label="Locale">
  @for (tag of locales; track tag) {
    <button type="button" [attr.aria-pressed]="locale() === tag" (click)="locale.set(tag)">
      {{ tag }}
    </button>
  }
</div>

<!-- typed filters parse in the locale too: try 1234,5 in de-DE -->
<oge-grid [data]="orders" keyField="id" [locale]="locale()" [filterRow]="true">
  <oge-column field="id" dataType="number" [width]="70" />
  <oge-column field="placed" caption="Placed" dataType="date" />
  <oge-column field="placed" caption="Placed (medium)" dataType="date" [format]="longDate" [filterable]="false" />
  <oge-column field="amount" dataType="number" [format]="money" totalSummary="sum" />
  <oge-column field="share" dataType="number" [format]="percent" />
  <oge-column field="quantity" dataType="number" [format]="count" />
</oge-grid>

<p>{{ summary() }}</p>`,
});

/** The React twin of {@link LOCALE_GRID_DEMO}. */
export const LOCALE_GRID_REACT_DEMO: ReactDemo = {
  title: 'One grid, four locales (React)',
  description:
    'The same columns as plain props: dates, declarative formats, the total summary and the filter row follow the <code>locale</code> prop.',
  source: reactDemoSource({
    react: ['useState'],
    use: {
      '@oge-ui/react-grid': ['OgeGrid'],
      '@oge-ui/core': ['ogeFormatMessage'],
    },
    types: {
      '@oge-ui/react-grid': ['OgeGridColumnProps'],
    },
    name: 'LocaleGrid',
    before: `interface Order {
  id: number;
  placed: Date;
  amount: number;
  share: number;
  quantity: number;
}

const ORDERS: Order[] = [
  { id: 1, placed: new Date(2026, 0, 5), amount: 1234.5, share: 0.125, quantity: 12500 },
  { id: 2, placed: new Date(2026, 2, 17), amount: 89.9, share: 0.5, quantity: 3 },
  { id: 3, placed: new Date(2026, 10, 30), amount: 15600, share: 0.375, quantity: 1 },
];

const LOCALES = ['en-US', 'de-DE', 'tr-TR', 'ar-EG'];
const ORDERS_TEXT = '{count, plural, =0 {No orders} one {# order} other {# orders}}';

const columns: OgeGridColumnProps<Order>[] = [
  { field: 'id', dataType: 'number', width: 70 },
  { field: 'placed', caption: 'Placed', dataType: 'date' },
  { field: 'amount', dataType: 'number', format: { type: 'currency', currency: 'EUR' }, totalSummary: 'sum' },
  { field: 'share', dataType: 'number', format: { type: 'percent', minimumFractionDigits: 1 } },
  { field: 'quantity', dataType: 'number', format: { type: 'number' } },
];`,
    body: `const [locale, setLocale] = useState('de-DE');`,
    jsx: `<>
  <div role="group" aria-label="Locale">
    {LOCALES.map((tag) => (
      <button key={tag} type="button" aria-pressed={locale === tag} onClick={() => setLocale(tag)}>
        {tag}
      </button>
    ))}
  </div>
  <OgeGrid data={ORDERS} keyField="id" columns={columns} locale={locale} filterRow />
  <p>{ogeFormatMessage(ORDERS_TEXT, { count: ORDERS.length }, locale)}</p>
</>`,
  }),
};

/** Global locale for every grid / tree list / pivot, live. */
export const LOCALE_CONFIG = `import { signal } from '@angular/core';
import { provideOgeGridConfig } from '@oge-ui/grid';
import { provideOgePivotConfig } from '@oge-ui/pivot';

export const uiLocale = signal('de-DE');

providers: [
  // grids and tree lists; a [locale] input on one instance still wins
  provideOgeGridConfig(() => ({ locale: uiLocale() })),
  provideOgePivotConfig(() => ({ locale: uiLocale() })),
]
// unset everywhere: Angular's LOCALE_ID (React: navigator.language)`;

/** Plural-aware catalog keys: one key, every plural form. */
export const PLURAL_MESSAGES = `provideOgeGridConfig({
  messages: {
    // Polish has one / few / many — all in one key; # is the count
    rowCountAnnouncement:
      '{count, plural, one {# wiersz} few {# wiersze} many {# wierszy} other {# wiersza}}',
    pagerInfo: '{count, plural, one {# wiersz} few {# wiersze} many {# wierszy} other {# wiersza}}',
  },
}),
provideOgeFormsConfig({
  messages: {
    validationSummaryTitle:
      '{count, plural, =1 {Bir alan düzeltilmeli} other {# alan düzeltilmeli}}',
  },
}),

// the same formatter is public — use it for your own strings
ogeFormatMessage('{n, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}', { n: 5 }, 'pl');
// → '5 plików'`;

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
