import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeNumberBox, OgeTextArea, OgeTextBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_SHOWCASE_DEMOS } from './showcase-snippets';

/**
 * TOC of the React view — the same four sections as the Angular showcase
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_SHOWCASE_SECTIONS = [
  'Character counter',
  'Password reveal & copy',
  'Locale-aware numbers',
  'Debounced commits',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'EUR',
};

/** Grapheme-accurate counter demo — real state, so typing updates the count. */
function CounterDemo(): ReactNode {
  const [bio, setBio] = useState('');
  return row(
    createElement(OgeTextBox, {
      key: 'bio',
      label: 'Bio',
      value: bio,
      onValueChange: setBio,
      showCounter: true,
      maxLength: 40,
      hint: 'a family emoji counts as 1',
    }),
    createElement(OgeTextArea, {
      key: 'tweet',
      label: 'Tweet',
      showCounter: true,
      maxLength: 140,
      counterMode: 'soft',
      rows: 2,
    }),
  );
}

/** Password reveal and one-click copy. */
function PasswordDemo(): ReactNode {
  const [password, setPassword] = useState('top-secret-42');
  const [token] = useState('oge_live_4f8a2b91c3d7');
  return row(
    createElement(OgeTextBox, {
      key: 'pwd',
      label: 'Password',
      mode: 'password',
      value: password,
      onValueChange: setPassword,
    }),
    createElement(OgeTextBox, {
      key: 'token',
      label: 'API token',
      value: token,
      showCopyButton: true,
      readonly: true,
    }),
  );
}

/** Locale-aware formatting, spin buttons and clamping. */
function NumbersDemo(): ReactNode {
  const [price, setPrice] = useState<number | null>(1234.5);
  const [quantity, setQuantity] = useState<number | null>(10);
  return row(
    createElement(OgeNumberBox, {
      key: 'price',
      label: 'Price (de-DE)',
      locale: 'de-DE',
      format: PRICE_FORMAT,
      value: price,
      onValueChange: setPrice,
      showSpinButtons: true,
      step: 0.5,
    }),
    createElement(OgeNumberBox, {
      key: 'qty',
      label: 'Quantity',
      value: quantity,
      onValueChange: setQuantity,
      min: 0,
      max: 100,
      showSpinButtons: true,
      hint: '0–100; arrow keys work too',
    }),
  );
}

/** Debounced commit vs. the per-keystroke `onInputChange` firehose. */
function DebounceDemo(): ReactNode {
  const [query, setQuery] = useState('');
  const [keystrokes, setKeystrokes] = useState(0);
  return row(
    createElement(OgeTextBox, {
      key: 'search',
      label: 'Search',
      value: query,
      onValueChange: setQuery,
      debounce: 400,
      onInputChange: () => setKeystrokes((n) => n + 1),
    }),
    createElement(
      'span',
      { key: 'status', className: 'self-center text-sm opacity-70' },
      `keystrokes: ${keystrokes} · committed value: "${query}"`,
    ),
  );
}

/**
 * The React half of the input showcase — the same four demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/showcase` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-showcase-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['grapheme counter', 'soft limit']"
      heading="Character counter"
      description="<code>showCounter</code> renders a live counter in the subscript end slot. It counts what users perceive — grapheme clusters — so a multi-codepoint family emoji or a flag counts as one character, not eight code units. The default <code>limit</code> mode enforces <code>maxLength</code> natively; <code>soft</code> mode lets typing continue past the limit and turns the counter red instead."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="counter" />
    </app-demo-card>

    <app-demo-card
      [chips]="['password reveal', 'copy to clipboard']"
      heading="Password reveal & copy"
      description="<code>mode='password'</code> automatically adds a reveal toggle that flips the input type in place — the caret position survives and password managers stay attached. <code>showCopyButton</code> adds one-click copy with a transient confirmation announced to screen readers; ideal for API keys and tokens, especially combined with <code>readonly</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="password" />
    </app-demo-card>

    <app-demo-card
      [chips]="['Intl.NumberFormat', 'raw on focus', 'spin + arrows']"
      heading="Locale-aware numbers"
      description="<code>format</code> takes standard <code>Intl.NumberFormatOptions</code> (currency, precision, units) and renders it while the field is unfocused; focusing switches to a raw editable number in the locale's decimal notation. Parsing understands grouped input like <code>1.234,56</code>. Spin buttons and arrow keys step by <code>step</code> with hold-to-repeat, and values clamp to <code>min</code>/<code>max</code> on commit."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="numbers" />
    </app-demo-card>

    <app-demo-card
      [chips]="['debounce', 'onInputChange firehose']"
      heading="Debounced commits"
      description="<code>debounce</code> delays the committed value (<code>value</code>, <code>onValueChange</code> and <code>onValueCommitted</code>) until typing pauses — ideal for search fields that trigger requests. Blur and Enter flush immediately so nothing is ever lost, while <code>onInputChange</code> keeps streaming every raw keystroke if you need it."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="debounce" />
    </app-demo-card>
  `,
})
export class ReactInputsShowcaseDemos {
  protected readonly demos = INPUTS_SHOWCASE_DEMOS;

  protected readonly counter = () => createElement(CounterDemo);
  protected readonly password = () => createElement(PasswordDemo);
  protected readonly numbers = () => createElement(NumbersDemo);
  protected readonly debounce = () => createElement(DebounceDemo);
}
