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
import {
  OgeGrid as ReactOgeGrid,
  type OgeGridColumnProps,
} from '@oge-ui/react-grid';
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

const SECTIONS = [
  'How it works',
  'Global configuration',
  'Switching language at runtime',
  'Per-component overrides',
  'Validation messages',
  'Number & date locales',
  'Plural messages',
  'Behavior defaults',
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
}
