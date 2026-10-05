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

/** Install line of the ready-made translations. */
export const READY_MADE_INSTALL = `npm install @oge-ui/locales`;

/** Angular: one provider, one pack, every MIT family. */
export const READY_MADE_ANGULAR = `// app.config.ts
import { provideOgeLocale } from 'oge-ui';
import { tr } from '@oge-ui/locales/tr'; // only this language is bundled

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'tr' }, // Angular's own pipes — the app's job
    provideOgeLocale(tr), // grid + tree list, inputs, buttons, overlay, tabs,
                          // forms, upload, layout and navigation — strings and locale
  ],
};
// right-to-left packs (ar, he) carry dir: 'rtl' — set <html dir> from pack.dir`;

/** React: one provider component around the app. */
export const READY_MADE_REACT = `import { OgeLocaleProvider } from '@oge-ui/react';
import { de } from '@oge-ui/locales/de';

export function Root() {
  return (
    <OgeLocaleProvider pack={de}>
      <App />
    </OgeLocaleProvider>
  );
}`;

/** Commercial families: the slice goes through their own provider. */
export const READY_MADE_COMMERCIAL = `// The MIT umbrella never depends on the commercial packages, so their slices
// are passed to their own providers — merged over the English catalog, so a
// key a newer release adds stays English instead of going blank:
import { ogeMergeMessages } from '@oge-ui/locales';
import { tr } from '@oge-ui/locales/tr';
import { OGE_DEFAULT_SCHEDULER_MESSAGES, provideOgeSchedulerConfig } from '@oge-ui/scheduler';
import { OGE_DEFAULT_GANTT_MESSAGES, provideOgeGanttConfig } from '@oge-ui/gantt';

providers: [
  provideOgeLocale(tr),
  provideOgeSchedulerConfig({
    locale: tr.locale,
    messages: ogeMergeMessages(OGE_DEFAULT_SCHEDULER_MESSAGES, tr.scheduler),
  }),
  provideOgeGanttConfig({
    locale: tr.locale,
    messages: ogeMergeMessages(OGE_DEFAULT_GANTT_MESSAGES, tr.gantt),
  }),
  // pivot: provideOgePivotMessages(ogeMergeMessages(OGE_DEFAULT_PIVOT_MESSAGES, tr.pivot))
  // kanban / bpmn / charts: the same shape with tr.kanban / tr.bpmn / tr.charts
]

// React: <OgeSchedulerConfigProvider config={{ locale: tr.locale,
//   messages: ogeMergeMessages(OGE_DEFAULT_SCHEDULER_MESSAGES, tr.scheduler) }}>`;

/** Runtime switching: lazy packs + the live provider form. */
export const READY_MADE_RUNTIME = `import { signal } from '@angular/core';
import { provideOgeLocale } from 'oge-ui';
import { en, ogeLocalePacks, type OgeLocaleCode, type OgeLocalePack } from '@oge-ui/locales';

export const uiPack = signal<OgeLocalePack>(en);

// each language is its own chunk — only the packs a user picks are downloaded
export async function useLanguage(code: OgeLocaleCode): Promise<void> {
  const pack = await ogeLocalePacks[code]();
  uiPack.set(pack);
  document.documentElement.lang = pack.locale;
  document.documentElement.dir = pack.dir;
}

providers: [
  // a function: every OGE component re-renders when uiPack changes
  provideOgeLocale(() => uiPack()),
  // a family whose other options you also set: provide it after, merge yourself
  provideOgeGridConfig(() => ({
    rowHeight: 32,
    locale: uiPack().locale,
    messages: ogeMergeMessages(OGE_DEFAULT_GRID_MESSAGES, uiPack().grid),
  })),
]`;

/**
 * The live language switcher: a grid, a date box and a select box under one
 * live `provideOgeLocale`, packs loaded on demand.
 */
export const READY_MADE_DEMO = demoSource({
  use: {
    '@oge-ui/grid': ['OgeGrid', 'OgeColumn'],
    '@oge-ui/inputs': ['OgeDateBox', 'OgeSelectBox'],
  },
  helpers: {
    '@oge-ui/locales': ['OGE_LOCALE_NAMES', 'en', 'ogeLocalePacks'],
    'oge-ui': ['provideOgeLocale'],
  },
  types: {
    '@angular/core': ['ApplicationConfig'],
    '@oge-ui/locales': ['OgeLocaleCode', 'OgeLocalePack'],
  },
  before: `// the app's language state — provideOgeLocale (below) reads it live
const uiPack = signal<OgeLocalePack>(en);

const ORDERS = [
  { id: 1, customer: 'Anadolu Ltd.', placed: new Date(2026, 0, 5), amount: 1234.5 },
  { id: 2, customer: 'Berlin GmbH', placed: new Date(2026, 2, 17), amount: 89.9 },
  { id: 3, customer: 'Paris SARL', placed: new Date(2026, 5, 30), amount: 15600 },
  { id: 4, customer: 'Tokyo KK', placed: new Date(2026, 8, 2), amount: 420 },
];`,
  body: `readonly codes = Object.keys(OGE_LOCALE_NAMES) as OgeLocaleCode[];
readonly names = OGE_LOCALE_NAMES;
readonly pack = uiPack;
readonly orders = ORDERS;
readonly cities = ['İstanbul', 'Berlin', 'Paris', 'Tokyo', 'Cairo', 'Tel Aviv'];
readonly city = signal<unknown>(null);
readonly day = signal<Date | null>(new Date(2026, 9, 5));

async pick(code: OgeLocaleCode): Promise<void> {
  // every language is its own chunk, downloaded on first use
  uiPack.set(await ogeLocalePacks[code]());
}`,
  template: `<div role="group" aria-label="Language">
  @for (code of codes; track code) {
    <button type="button" [attr.aria-pressed]="pack().locale === code" (click)="pick(code)">
      {{ names[code] }}
    </button>
  }
</div>

<!-- ar and he are right-to-left: components follow the nearest dir -->
<div [attr.dir]="pack().dir" [attr.lang]="pack().locale">
  <oge-date-box label="Delivery" [(value)]="day" />
  <oge-select-box label="City" [items]="cities" [(value)]="city" [searchEnabled]="true" [showClearButton]="true" />
  <oge-grid [data]="orders" keyField="id" [filterRow]="true" [paging]="{ pageSize: 3 }">
    <oge-column field="customer" caption="Customer" />
    <oge-column field="placed" caption="Placed" dataType="date" />
    <oge-column field="amount" caption="Amount" dataType="number" [format]="{ type: 'currency', currency: 'EUR' }" />
  </oge-grid>
</div>`,
  after: `// app.config.ts — the live form: the strings follow uiPack
export const appConfig: ApplicationConfig = {
  providers: [provideOgeLocale(() => uiPack())],
};`,
});

/** The React twin of {@link READY_MADE_DEMO}. */
export const READY_MADE_REACT_DEMO: ReactDemo = {
  title: 'Ready-made translations (React)',
  description:
    'One <code>&lt;OgeLocaleProvider&gt;</code> around a grid, a date box and a select box; packs load on demand.',
  source: reactDemoSource({
    react: ['useState'],
    use: {
      '@oge-ui/react': [
        'OgeLocaleProvider',
        'OgeGrid',
        'OgeDateBox',
        'OgeSelectBox',
      ],
      '@oge-ui/locales': ['OGE_LOCALE_NAMES', 'en', 'ogeLocalePacks'],
    },
    types: {
      '@oge-ui/react': ['OgeGridColumnProps'],
      '@oge-ui/locales': ['OgeLocaleCode', 'OgeLocalePack'],
    },
    name: 'LanguageSwitcher',
    before: `interface Order {
  id: number;
  customer: string;
  placed: Date;
  amount: number;
}

const ORDERS: Order[] = [
  { id: 1, customer: 'Anadolu Ltd.', placed: new Date(2026, 0, 5), amount: 1234.5 },
  { id: 2, customer: 'Berlin GmbH', placed: new Date(2026, 2, 17), amount: 89.9 },
  { id: 3, customer: 'Paris SARL', placed: new Date(2026, 5, 30), amount: 15600 },
  { id: 4, customer: 'Tokyo KK', placed: new Date(2026, 8, 2), amount: 420 },
];

const columns: OgeGridColumnProps<Order>[] = [
  { field: 'customer', caption: 'Customer' },
  { field: 'placed', caption: 'Placed', dataType: 'date' },
  { field: 'amount', caption: 'Amount', dataType: 'number', format: { type: 'currency', currency: 'EUR' } },
];

const CODES = Object.keys(OGE_LOCALE_NAMES) as OgeLocaleCode[];
const CITIES = ['İstanbul', 'Berlin', 'Paris', 'Tokyo', 'Cairo', 'Tel Aviv'];`,
    body: `const [pack, setPack] = useState<OgeLocalePack>(en);
const [day, setDay] = useState<Date | null>(new Date(2026, 9, 5));
const [city, setCity] = useState<unknown>(null);
// every language is its own chunk, downloaded on first use
const pick = async (code: OgeLocaleCode) => setPack(await ogeLocalePacks[code]());`,
    jsx: `<OgeLocaleProvider pack={pack}>
  <div role="group" aria-label="Language">
    {CODES.map((code) => (
      <button key={code} type="button" aria-pressed={pack.locale === code} onClick={() => void pick(code)}>
        {OGE_LOCALE_NAMES[code]}
      </button>
    ))}
  </div>
  {/* ar and he are right-to-left: components follow the nearest dir */}
  <div dir={pack.dir} lang={pack.locale}>
    <OgeDateBox label="Delivery" value={day} onValueChange={setDay} />
    <OgeSelectBox label="City" items={CITIES} value={city} onValueChange={setCity} searchEnabled showClearButton />
    <OgeGrid data={ORDERS} keyField="id" columns={columns} filterRow paging={{ pageSize: 3 }} />
  </div>
</OgeLocaleProvider>`,
  }),
};
