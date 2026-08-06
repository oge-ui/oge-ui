import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const SECTIONS = [
  'How it works',
  'Global configuration',
  'Per-component overrides',
  'Validation messages',
  'Number & date locales',
  'Behavior defaults',
] as const;

const GLOBAL = `import { provideOgeGridConfig } from '@oge-ui/grid';
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

const PER_COMPONENT = `<!-- the [messages] input overrides the global catalog for one instance -->
<oge-grid [data]="rows" [messages]="{ noData: 'No matching orders' }" />

<oge-text-box
  label="Coupon code"
  [messages]="{ requiredError: 'Enter a coupon to continue' }"
/>`;

const VALIDATION = `// Message patterns interpolate the constraint that failed:
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

const NUMBER_LOCALE = `<!-- Intl-powered: grouping, decimal separator and currency follow the locale -->
<oge-number-box
  label="Price"
  locale="de-DE"
  [format]="{ style: 'currency', currency: 'EUR' }"
/>

<!-- without an explicit locale, editors use Angular's LOCALE_ID -->`;

const BEHAVIOR = `// The same providers also carry non-text defaults:
provideOgeButtonsConfig({
  clickGuardMs: 300,       // default clickGuard window
  holdToConfirmMs: 1000,   // default hold duration
}),
provideOgeInputsConfig({
  spinRepeatDelayMs: 300,  // number-box spin: delay before repeating
  spinRepeatIntervalMs: 60,
  copiedResetMs: 1500,     // "copied" indicator duration
})`;

@Component({
  selector: 'app-getting-started-localization',
  imports: [CodeBlock, DocHeader, PageToc],
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
      <code>OgeGridMessages</code>, <code>OgeInputsMessages</code>) and a
      <code>provideOge…Config()</code> provider. Catalogs are partial — you only
      supply the strings you change, the rest keep their English defaults.
      Patterns support <code>{{ '{' }}placeholder{{ '}' }}</code>
      interpolation for dynamic values.
    </p>

    <h2 id="global-configuration" class="scroll-mt-20">Global configuration</h2>
    <app-code-block [code]="global" language="ts" />

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
      Formatting is separate from message catalogs: number editors format and
      parse through <code>Intl.NumberFormat</code>, honoring an explicit
      <code>locale</code> input or Angular's <code>LOCALE_ID</code>. Grouped
      input like <code>1.234,56</code> parses correctly in every locale:
    </p>
    <app-code-block [code]="numberLocale" language="html" />

    <h2 id="behavior-defaults" class="scroll-mt-20">Behavior defaults</h2>
    <p>
      The config providers also centralize timing and interaction defaults, so
      product-wide tuning does not require touching templates:
    </p>
    <app-code-block [code]="behavior" language="ts" />
  `,
})
export class GettingStartedLocalizationPage {
  protected readonly sections = SECTIONS;
  protected readonly global = GLOBAL;
  protected readonly perComponent = PER_COMPONENT;
  protected readonly validation = VALIDATION;
  protected readonly numberLocale = NUMBER_LOCALE;
  protected readonly behavior = BEHAVIOR;
}
