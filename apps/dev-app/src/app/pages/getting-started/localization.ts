import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { ogeFormatMessage, type OgeValueFormat } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeDateBox, OgeSelectBox } from '@oge-ui/inputs';
import {
  OGE_LOCALE_NAMES,
  en,
  ogeLocalePacks,
  type OgeLocaleCode,
  type OgeLocalePack,
} from '@oge-ui/locales';
import { OgeLocaleProvider } from '@oge-ui/react';
import {
  OgeGrid as ReactOgeGrid,
  type OgeGridColumnProps,
} from '@oge-ui/react-grid';
import {
  OgeDateBox as ReactOgeDateBox,
  OgeSelectBox as ReactOgeSelectBox,
} from '@oge-ui/react-inputs';
import { provideOgeLocale } from 'oge-ui';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactHost } from '../../shared/react-host';
import {
  BEHAVIOR,
  GLOBAL,
  LOCALE_CONFIG,
  LOCALE_GRID_DEMO,
  LOCALE_GRID_REACT_DEMO,
  NUMBER_LOCALE,
  PER_COMPONENT,
  PLURAL_MESSAGES,
  READY_MADE_ANGULAR,
  READY_MADE_COMMERCIAL,
  READY_MADE_DEMO,
  READY_MADE_INSTALL,
  READY_MADE_REACT,
  READY_MADE_REACT_DEMO,
  READY_MADE_RUNTIME,
  RTL,
  RUNTIME,
  VALIDATION,
} from './localization-snippets';

interface Order {
  id: number;
  placed: Date;
  amount: number;
  share: number;
  quantity: number;
}

/** The same rows the demo snippets inline. */
const ORDERS: Order[] = [
  {
    id: 1,
    placed: new Date(2026, 0, 5),
    amount: 1234.5,
    share: 0.125,
    quantity: 12500,
  },
  {
    id: 2,
    placed: new Date(2026, 2, 17),
    amount: 89.9,
    share: 0.5,
    quantity: 3,
  },
  {
    id: 3,
    placed: new Date(2026, 10, 30),
    amount: 15600,
    share: 0.375,
    quantity: 1,
  },
];

const LOCALES = ['en-US', 'de-DE', 'tr-TR', 'ar-EG'] as const;
const ORDERS_TEXT =
  '{count, plural, =0 {No orders} one {# order} other {# orders}}';

const MONEY: OgeValueFormat = { type: 'currency', currency: 'EUR' };
const PERCENT: OgeValueFormat = { type: 'percent', minimumFractionDigits: 1 };
const COUNT: OgeValueFormat = { type: 'number' };
const LONG_DATE: OgeValueFormat = { type: 'date', dateStyle: 'medium' };

const REACT_COLUMNS: OgeGridColumnProps<Order>[] = [
  { field: 'id', caption: 'Id', dataType: 'number', width: 70 },
  { field: 'placed', caption: 'Placed', dataType: 'date' },
  {
    field: 'amount',
    caption: 'Amount',
    dataType: 'number',
    format: MONEY,
    totalSummary: 'sum',
  },
  { field: 'share', caption: 'Share', dataType: 'number', format: PERCENT },
  { field: 'quantity', caption: 'Quantity', dataType: 'number', format: COUNT },
];

/** The React demo: the same grid as plain props, its own locale state. */
function ReactLocaleDemo(): ReactNode {
  const [locale, setLocale] = useState<string>('de-DE');
  return createElement(
    'div',
    { className: 'app-locale-demo' },
    createElement(
      'div',
      { role: 'group', 'aria-label': 'Locale', className: 'app-locale-switch' },
      ...LOCALES.map((tag) =>
        createElement(
          'button',
          {
            key: tag,
            type: 'button',
            'aria-pressed': locale === tag,
            onClick: () => setLocale(tag),
          },
          tag,
        ),
      ),
    ),
    createElement(ReactOgeGrid<Order>, {
      data: ORDERS,
      keyField: 'id',
      columns: REACT_COLUMNS,
      locale,
      filterRow: true,
      ariaLabel: 'Orders',
    }),
    createElement(
      'p',
      { className: 'app-locale-summary' },
      ogeFormatMessage(ORDERS_TEXT, { count: ORDERS.length }, locale),
    ),
  );
}

// --- "Ready-made translations" ---------------------------------------------

interface Delivery {
  id: number;
  customer: string;
  placed: Date;
  amount: number;
}

const DELIVERIES: Delivery[] = [
  {
    id: 1,
    customer: 'Anadolu Ltd.',
    placed: new Date(2026, 0, 5),
    amount: 1234.5,
  },
  {
    id: 2,
    customer: 'Berlin GmbH',
    placed: new Date(2026, 2, 17),
    amount: 89.9,
  },
  {
    id: 3,
    customer: 'Paris SARL',
    placed: new Date(2026, 5, 30),
    amount: 15600,
  },
  { id: 4, customer: 'Tokyo KK', placed: new Date(2026, 8, 2), amount: 420 },
];
const DELIVERY_COLUMNS: OgeGridColumnProps<Delivery>[] = [
  { field: 'customer', caption: 'Customer' },
  { field: 'placed', caption: 'Placed', dataType: 'date' },
  { field: 'amount', caption: 'Amount', dataType: 'number', format: MONEY },
];
const CITIES = ['İstanbul', 'Berlin', 'Paris', 'Tokyo', 'Cairo', 'Tel Aviv'];
const PACK_CODES = Object.keys(OGE_LOCALE_NAMES) as OgeLocaleCode[];

/** The Angular demo's language — the live `provideOgeLocale` below reads it. */
const demoPack = signal<OgeLocalePack>(en);

/**
 * The live language switcher: its own `provideOgeLocale(() => demoPack())`
 * scopes the pack to this subtree, so the rest of the docs stay English.
 */
@Component({
  selector: 'app-ready-made-demo',
  imports: [OgeColumn, OgeDateBox, OgeGrid, OgeSelectBox],
  providers: [provideOgeLocale(() => demoPack())],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" aria-label="Language" class="app-locale-switch">
      @for (code of codes; track code) {
        <button
          type="button"
          [attr.aria-pressed]="pack().locale === code"
          [attr.data-locale]="code"
          (click)="pick(code)"
        >
          {{ names[code] }}
        </button>
      }
    </div>
    <div
      class="app-ready-made"
      [attr.dir]="pack().dir"
      [attr.lang]="pack().locale"
    >
      <div class="app-ready-made-editors">
        <oge-date-box label="Delivery" [(value)]="day" />
        <oge-select-box
          label="City"
          [items]="cities"
          [(value)]="city"
          [searchEnabled]="true"
          [showClearButton]="true"
        />
      </div>
      <oge-grid
        [data]="deliveries"
        keyField="id"
        [filterRow]="true"
        [paging]="{ pageSize: 3 }"
      >
        <oge-column field="customer" caption="Customer" />
        <oge-column field="placed" caption="Placed" dataType="date" />
        <oge-column
          field="amount"
          caption="Amount"
          dataType="number"
          [format]="money"
        />
      </oge-grid>
    </div>
  `,
})
export class ReadyMadeDemo {
  protected readonly codes = PACK_CODES;
  protected readonly names = OGE_LOCALE_NAMES;
  protected readonly pack = demoPack;
  protected readonly deliveries = DELIVERIES;
  protected readonly cities = CITIES;
  protected readonly money = MONEY;
  protected readonly city = signal<unknown>(null);
  protected readonly day = signal<Date | null>(new Date(2026, 9, 5));

  protected async pick(code: OgeLocaleCode): Promise<void> {
    // every language is its own chunk, downloaded on first use
    demoPack.set(await ogeLocalePacks[code]());
  }
}

/** The React twin: one `<OgeLocaleProvider>` around the same three components. */
function ReactReadyMadeDemo(): ReactNode {
  const [pack, setPack] = useState<OgeLocalePack>(en);
  const [day, setDay] = useState<Date | null>(new Date(2026, 9, 5));
  const [city, setCity] = useState<unknown>(null);
  const pick = async (code: OgeLocaleCode) =>
    setPack(await ogeLocalePacks[code]());
  return createElement(
    OgeLocaleProvider,
    { pack },
    createElement(
      'div',
      {
        role: 'group',
        'aria-label': 'Language',
        className: 'app-locale-switch',
      },
      ...PACK_CODES.map((code) =>
        createElement(
          'button',
          {
            key: code,
            type: 'button',
            'aria-pressed': pack.locale === code,
            'data-locale': code,
            onClick: () => void pick(code),
          },
          OGE_LOCALE_NAMES[code],
        ),
      ),
    ),
    createElement(
      'div',
      { className: 'app-ready-made', dir: pack.dir, lang: pack.locale },
      createElement(
        'div',
        { className: 'app-ready-made-editors' },
        createElement(ReactOgeDateBox, {
          label: 'Delivery',
          value: day,
          onValueChange: setDay,
        }),
        createElement(ReactOgeSelectBox, {
          label: 'City',
          items: CITIES,
          value: city,
          onValueChange: setCity,
          searchEnabled: true,
          showClearButton: true,
        }),
      ),
      createElement(ReactOgeGrid<Delivery>, {
        data: DELIVERIES,
        keyField: 'id',
        columns: DELIVERY_COLUMNS,
        filterRow: true,
        paging: { pageSize: 3 },
        ariaLabel: 'Deliveries',
      }),
    ),
  );
}

const SECTIONS = [
  'How it works',
  'Ready-made translations',
  'Global configuration',
  'Switching language at runtime',
  'Per-component overrides',
  'Validation messages',
  'Number & date locales',
  'Plural messages',
  'Behavior defaults',
  'Right-to-left',
] as const;

@Component({
  selector: 'app-getting-started-localization',
  imports: [
    CodeBlock,
    DemoCard,
    DocHeader,
    OgeColumn,
    OgeGrid,
    PageToc,
    ReactHost,
    ReadyMadeDemo,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Localization"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['messages', 'provideOge…Config', '[messages]', 'locale']"
    >
      <p>
        Every user-facing string — empty states, aria labels, validation errors,
        tooltips — lives in a typed message catalog. Nothing is hardcoded:
        provide a catalog once for the whole application, or override single
        strings per component instance.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="how-it-works" class="scroll-mt-20">How it works</h2>
    <p>
      Each package exports a <code>messages</code> interface (for example
      <code>OgeGridMessages</code>, <code>OgeInputsMessages</code>). Catalogs
      are partial — you only supply the strings you change, the rest keep their
      English defaults. Patterns support
      <code>{{ '{' }}placeholder{{ '}' }}</code> interpolation for dynamic
      values.
    </p>
    <p class="app-shared-note">
      <strong>The catalogs themselves are shared.</strong> Message names,
      defaults and placeholder syntax live in the framework-free packages, so a
      translation written once is correct in both render layers. Only the
      delivery differs: Angular takes a
      <code>provideOge…Config()</code> provider, React an
      <code>&lt;Oge…ConfigProvider&gt;</code> — the same object, handed over the
      way each framework expects.
    </p>

    <h2 id="ready-made-translations" class="scroll-mt-20">
      Ready-made translations
    </h2>
    <p>
      <code>&#64;oge-ui/locales</code> (MIT) translates every catalog of the
      suite — MIT and commercial families alike — into German, French, Spanish,
      Italian, Brazilian Portuguese, Turkish, Japanese, Simplified Chinese,
      Arabic and Hebrew, with each language's plural forms in the count-bearing
      keys. Each language is its own entry point
      (<code>&#64;oge-ui/locales/tr</code>), so an app bundles only the pack it
      imports. A pack is plain data — a typed <code>OgeLocalePack</code> with
      the <code>locale</code> for <code>Intl</code> formats, the writing
      <code>dir</code> and one slice per catalog — and every key it does not
      carry yet stays English. A CI check keeps each pack's keys, placeholders
      and plurals in step with the English source.
    </p>
    <app-code-block [code]="readyMadeInstall" language="bash" />
    @if (fw.isReact()) {
      <p>
        Wrap the app in <code>&lt;OgeLocaleProvider&gt;</code> from
        <code>&#64;oge-ui/react</code>: it composes every MIT family's config
        provider with the pack's slice and <code>locale</code>. Family providers
        nested inside still apply on top.
      </p>
      <app-code-block [code]="readyMadeReact" language="tsx" />
    } @else {
      <p>
        <code>provideOgeLocale(pack)</code> from <code>oge-ui</code> provides
        every MIT family's config — grid and tree list, inputs, buttons,
        overlay, tabs, forms, upload, layout and navigation — with the pack's
        slice and, where a family formats data, its <code>locale</code>.
        <code>LOCALE_ID</code> (Angular's own pipes) and the page's
        <code>dir</code> remain the app's job.
      </p>
      <app-code-block [code]="readyMadeAngular" language="ts" />
    }
    <app-demo-card
      title="Language switcher"
      description="Pick a language: the date box (open its calendar), the select box (search it, clear it) and the grid's filter row, pager and empty texts switch at once; Arabic and Hebrew mirror the layout. Each pack is downloaded the first time it is picked."
      [chips]="['@oge-ui/locales', 'provideOgeLocale', 'OgeLocaleProvider']"
      [code]="fw.isReact() ? readyMadeReactDemo.source : readyMadeDemo"
      [language]="fw.isReact() ? 'tsx' : 'ts'"
    >
      @if (fw.isReact()) {
        <app-react-host [render]="renderReadyMade" />
      } @else {
        <app-ready-made-demo />
      }
    </app-demo-card>
    <p>
      Switch at runtime with the lazy <code>ogeLocalePacks</code> map and the
      live form (<code>provideOgeLocale(() =&gt; pack())</code>; in React, pass
      a new <code>pack</code>). <code>provideOgeLocale</code> owns the family
      config tokens it sets, so a family whose other options you also tune is
      provided after it, with the slice merged in through
      <code>ogeMergeMessages</code>:
    </p>
    <app-code-block [code]="readyMadeRuntime" language="ts" />
    <p>
      The commercial families (pivot, scheduler, Gantt, Kanban, BPMN, charts)
      are translated in the same packs, but the MIT umbrellas never depend on
      them — hand their slice to their own provider. The full key-by-key
      reference is the
      <a routerLink="/getting-started/localization/api">Localization API</a>.
    </p>
    <app-code-block [code]="readyMadeCommercial" language="ts" />

    <h2 id="global-configuration" class="scroll-mt-20">Global configuration</h2>
    <app-code-block [code]="global" language="ts" />

    <h2 id="switching-language-at-runtime" class="scroll-mt-20">
      Switching language at runtime
    </h2>
    <p>
      Every <code>provideOge…Config()</code> also accepts a <em>function</em>.
      The config then follows the signals that function reads: flip your
      language signal and every OGE component re-renders its strings — and, with
      <code>locale</code>, its number and date formats — without reloading the
      page or fetching the catalog before bootstrap. A component-level
      <code>[messages]</code> input still wins over it. In React, pass a new
      <code>config</code> to the <code>&lt;Oge…ConfigProvider&gt;</code>;
      context already re-renders.
    </p>
    <app-code-block [code]="runtime" language="ts" />

    <h2 id="per-component-overrides" class="scroll-mt-20">
      Per-component overrides
    </h2>
    <p>
      Components accept the same catalog through a
      <code>[messages]</code> input. Instance values win over the global
      provider, which wins over the built-in defaults:
    </p>
    <app-code-block [code]="perComponent" language="html" />

    <h2 id="validation-messages" class="scroll-mt-20">Validation messages</h2>
    <p>
      Input editors resolve validation errors from the catalog — the same
      strings serve standalone validation, reactive forms and Signal Forms, so
      translating them once covers all three binding modes:
    </p>
    <app-code-block [code]="validation" language="ts" />

    <h2 id="number-date-locales" class="scroll-mt-20">
      Number &amp; date locales
    </h2>
    <p>
      Formatting is separate from message catalogs. Every formatter comes from
      one shared <code>Intl</code> cache in <code>&#64;oge-ui/core</code>, in
      the component's <code>locale</code>: the grid, tree list and pivot take a
      <code>locale</code> input (React: prop) and a global one through their
      config — <code>provideOgeGridConfig(&#123; locale &#125;)</code>,
      <code>provideOgePivotConfig(&#123; locale &#125;)</code> or the React
      providers. Unset, Angular uses <code>LOCALE_ID</code> and React
      <code>navigator.language</code>. Default date cells, declarative column
      <code>format</code>s, summaries, group captions, header-filter values, the
      filter row's number parsing, the pager and exported text all follow it.
      Unformatted number columns stay raw — give them a <code>format</code> for
      the locale's separators.
    </p>
    <app-demo-card
      title="One grid, four locales"
      description="Switch the locale: dates, currency, percentages, grouped numbers, the total summary and the plural sentence below re-render. Type 1234,5 into the Amount filter under de-DE or tr-TR — it parses as one thousand two hundred thirty-four and a half."
      [chips]="['locale', 'OgeValueFormat', 'ogeFormatMessage']"
      [code]="fw.isReact() ? localeReactDemo.source : localeDemo"
      [language]="fw.isReact() ? 'tsx' : 'ts'"
    >
      @if (fw.isReact()) {
        <app-react-host [render]="renderReactDemo" />
      } @else {
        <div class="app-locale-demo">
          <div role="group" aria-label="Locale" class="app-locale-switch">
            @for (tag of locales; track tag) {
              <button
                type="button"
                [attr.aria-pressed]="locale() === tag"
                (click)="locale.set(tag)"
              >
                {{ tag }}
              </button>
            }
          </div>
          <oge-grid
            [data]="orders"
            keyField="id"
            [locale]="locale()"
            [filterRow]="true"
          >
            <oge-column
              field="id"
              caption="Id"
              dataType="number"
              [width]="70"
            />
            <oge-column field="placed" caption="Placed" dataType="date" />
            <oge-column
              field="placed"
              caption="Placed (medium)"
              dataType="date"
              [format]="longDate"
              [filterable]="false"
            />
            <oge-column
              field="amount"
              caption="Amount"
              dataType="number"
              [format]="money"
              totalSummary="sum"
            />
            <oge-column
              field="share"
              caption="Share"
              dataType="number"
              [format]="percent"
            />
            <oge-column
              field="quantity"
              caption="Quantity"
              dataType="number"
              [format]="count"
            />
          </oge-grid>
          <p class="app-locale-summary">{{ summary() }}</p>
        </div>
      }
    </app-demo-card>
    <p>Set the locale once for the whole application — live, like messages:</p>
    <app-code-block [code]="localeConfig" language="ts" />
    <p>
      Editors format and parse through the same cache, honoring an explicit
      <code>locale</code> input or Angular's <code>LOCALE_ID</code>. Grouped
      input like <code>1.234,56</code> parses correctly in every locale:
    </p>
    <app-code-block [code]="numberLocale" language="html" />

    <h2 id="plural-messages" class="scroll-mt-20">Plural messages</h2>
    <p>
      Count-bearing catalog keys — the grid's row count, selection and paste
      announcements and pager text, the validation summary heading, the
      uploader's file counts, the tag box's overflow chip — are ICU plurals
      rendered by <code>ogeFormatMessage</code> with
      <code>Intl.PluralRules</code>. One key holds every plural form of a
      language (<code>zero one two few many other</code>, plus exact
      <code>=0</code> matches); <code>#</code> is the count in the locale's
      digits. A plain <code>&#123;count&#125;</code> pattern keeps working. The
      old singular keys (<code>rowCountOneAnnouncement</code>,
      <code>validationSummaryTitleOne</code>, <code>rowsSuffix</code>) are
      deprecated: still honoured for one minor, with a dev-mode warning.
    </p>
    <app-code-block [code]="pluralMessages" language="ts" />

    <h2 id="behavior-defaults" class="scroll-mt-20">Behavior defaults</h2>
    <p>
      The config providers also centralize timing and interaction defaults, so
      product-wide tuning does not require touching templates:
    </p>
    <app-code-block [code]="behavior" language="ts" />

    <h2 id="right-to-left" class="scroll-mt-20">Right-to-left</h2>
    <p>
      Direction is not a setting: every component follows the page's
      <code>dir</code>. Layout mirrors through CSS logical properties, and
      everything decided in script — mirrored Left/Right arrow keys, drag
      deltas, timeline and chart axes, which side a popup opens on — resolves
      the direction through one shared helper,
      <code>ogeResolveDirection</code> from <code>@oge-ui/behavior</code>, so
      both render layers agree. The BPMN canvas is the deliberate exception:
      diagram coordinates are absolute, so only its chrome (palette, properties
      panel, context pad) mirrors.
    </p>
    <app-code-block [code]="rtl" language="html" />
  `,
})
export class GettingStartedLocalizationPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly locales = LOCALES;
  protected readonly locale = signal<string>('de-DE');
  protected readonly orders = ORDERS;
  protected readonly money = MONEY;
  protected readonly percent = PERCENT;
  protected readonly count = COUNT;
  protected readonly longDate = LONG_DATE;
  protected readonly summary = computed(() =>
    ogeFormatMessage(ORDERS_TEXT, { count: ORDERS.length }, this.locale()),
  );
  protected readonly localeDemo = LOCALE_GRID_DEMO;
  protected readonly localeReactDemo = LOCALE_GRID_REACT_DEMO;
  protected readonly localeConfig = LOCALE_CONFIG;
  protected readonly pluralMessages = PLURAL_MESSAGES;
  protected readonly renderReactDemo = (): ReactNode =>
    createElement(ReactLocaleDemo);
  protected readonly runtime = RUNTIME;
  protected readonly global = GLOBAL;
  protected readonly perComponent = PER_COMPONENT;
  protected readonly validation = VALIDATION;
  protected readonly numberLocale = NUMBER_LOCALE;
  protected readonly behavior = BEHAVIOR;
  protected readonly rtl = RTL;
  protected readonly readyMadeInstall = READY_MADE_INSTALL;
  protected readonly readyMadeAngular = READY_MADE_ANGULAR;
  protected readonly readyMadeReact = READY_MADE_REACT;
  protected readonly readyMadeRuntime = READY_MADE_RUNTIME;
  protected readonly readyMadeCommercial = READY_MADE_COMMERCIAL;
  protected readonly readyMadeDemo = READY_MADE_DEMO;
  protected readonly readyMadeReactDemo = READY_MADE_REACT_DEMO;
  protected readonly renderReadyMade = (): ReactNode =>
    createElement(ReactReadyMadeDemo);
}
