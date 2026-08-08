import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { OgeNumberBox, OgeTextArea, OgeTextBox } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  COUNTER_SNIPPET,
  DEBOUNCE_SNIPPET,
  NUMBER_SNIPPET,
  PASSWORD_SNIPPET,
} from './showcase-snippets';

const SECTIONS = [
  'Character counter',
  'Password reveal & copy',
  'Locale-aware numbers',
  'Debounced commits',
] as const;

@Component({
  selector: 'app-inputs-showcase',
  imports: [
    OgeTextBox,
    OgeTextArea,
    OgeNumberBox,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Input Showcase"
      [chips]="[
        'showCounter',
        'mode=password',
        'showCopyButton',
        'format',
        'debounce',
      ]"
    >
      <p>
        The differentiators: a character counter that counts what users perceive
        (grapheme clusters — emoji families are 1 character), a password reveal
        that keeps the caret, one-click copy with a live-region announcement,
        locale-aware number formatting and debounced commits with a separate
        per-keystroke stream.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['grapheme counter', 'soft limit']"
      heading="Character counter"
      description="<code>showCounter</code> renders a live counter in the subscript end slot. It counts what users perceive — grapheme clusters — so a multi-codepoint family emoji or a flag counts as one character, not eight code units. The default <code>limit</code> mode enforces <code>maxLength</code> natively; <code>soft</code> mode lets typing continue past the limit and turns the counter red instead."
      [code]="counterSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box
          label="Bio"
          [(value)]="bio"
          [showCounter]="true"
          [maxLength]="40"
          hint="a family emoji counts as 1"
        />
        <oge-text-area
          label="Tweet"
          [showCounter]="true"
          [maxLength]="140"
          counterMode="soft"
          [rows]="2"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['password reveal', 'copy to clipboard']"
      heading="Password reveal & copy"
      description="<code>mode='password'</code> automatically adds a reveal toggle that flips the input type in place — the caret position survives and password managers stay attached. <code>showCopyButton</code> adds one-click copy with a transient confirmation announced to screen readers; ideal for API keys and tokens, especially combined with <code>readonly</code>."
      [code]="passwordSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box label="Password" mode="password" [(value)]="password" />
        <oge-text-box
          label="API token"
          [(value)]="token"
          [showCopyButton]="true"
          [readonly]="true"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['Intl.NumberFormat', 'raw on focus', 'spin + arrows']"
      heading="Locale-aware numbers"
      description="<code>format</code> takes standard <code>Intl.NumberFormatOptions</code> (currency, precision, units) and renders it while the field is unfocused; focusing switches to a raw editable number in the locale's decimal notation. Parsing understands grouped input like <code>1.234,56</code>. Spin buttons and arrow keys step by <code>step</code> with hold-to-repeat, and values clamp to <code>min</code>/<code>max</code> on commit."
      [code]="numberSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-number-box
          label="Price (de-DE)"
          locale="de-DE"
          [format]="priceFormat"
          [(value)]="price"
          [showSpinButtons]="true"
          [step]="0.5"
        />
        <oge-number-box
          label="Quantity"
          [(value)]="quantity"
          [min]="0"
          [max]="100"
          [showSpinButtons]="true"
          hint="0–100; arrow keys work too"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['debounce', 'inputChange firehose']"
      heading="Debounced commits"
      description="<code>debounce</code> delays the committed value (the model, forms and <code>valueCommitted</code>) until typing pauses — ideal for search fields that trigger requests. Blur and Enter flush immediately so nothing is ever lost, while <code>inputChange</code> keeps streaming every raw keystroke if you need it."
      [code]="debounceSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box
          label="Search"
          [(value)]="query"
          [debounce]="400"
          (inputChange)="keystrokes.set(keystrokes() + 1)"
        />
        <span class="self-center text-sm opacity-70">
          keystrokes: {{ keystrokes() }} · committed value: "{{ query() }}"
        </span>
      </div>
    </app-demo-card>
  `,
})
export class InputsShowcasePage {
  protected readonly sections = SECTIONS;
  protected readonly bio = signal('');
  protected readonly password = signal('top-secret-42');
  protected readonly token = signal('oge_live_4f8a2b91c3d7');
  protected readonly price = signal<number | null>(1234.5);
  protected readonly quantity = signal<number | null>(10);
  protected readonly query = signal('');
  protected readonly keystrokes = signal(0);

  protected readonly priceFormat: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'EUR',
  };

  protected readonly counterSnippet = COUNTER_SNIPPET;
  protected readonly passwordSnippet = PASSWORD_SNIPPET;
  protected readonly numberSnippet = NUMBER_SNIPPET;
  protected readonly debounceSnippet = DEBOUNCE_SNIPPET;
}
