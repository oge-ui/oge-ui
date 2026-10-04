import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeMaskedTextBox,
  OgeTextBox,
  ogeMaskComplete,
  type OgeMaskRules,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_MASKED_TEXT_BOX_DEMOS } from './masked-text-box-snippets';

/**
 * TOC of the React view — the same six sections as the Angular masked text
 * box page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_MASKED_TEXT_BOX_SECTIONS = [
  'Getting started',
  'Mask syntax and custom rules',
  'Raw and formatted values',
  'Mask display',
  'Validation and forms',
  'Mask on the text box',
] as const;

const hexRules: OgeMaskRules = { H: /[0-9a-f]/i };
const productMask = '\\A-000-LL';
const IBAN_MASK = 'LL00 0000 0000 0000 0000 00';

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'flex flex-wrap gap-4' }, ...children);

function BasicDemo(): ReactNode {
  const [phone, setPhone] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeMaskedTextBox, {
      label: 'Phone',
      mask: '(000) 000-0000',
      value: phone,
      onValueChange: setPhone,
      autocomplete: 'tel-national',
    }),
    createElement(
      'p',
      { className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'masked-phone-value' }, phone),
    ),
  );
}

function SyntaxDemo(): ReactNode {
  const [plate, setPlate] = useState('');
  const [hex, setHex] = useState('');
  const [extension, setExtension] = useState('');
  const [product, setProduct] = useState('');
  return row(
    createElement(OgeMaskedTextBox, {
      key: 'plate',
      label: 'Licence plate',
      mask: '00 LLL 000',
      value: plate,
      onValueChange: setPlate,
    }),
    createElement(OgeMaskedTextBox, {
      key: 'hex',
      label: 'Hex color',
      mask: 'HHHHHH',
      maskRules: hexRules,
      prefix: createElement('span', null, '#'),
      value: hex,
      onValueChange: setHex,
    }),
    createElement(OgeMaskedTextBox, {
      key: 'ext',
      label: 'Extension',
      mask: 'ext. 0999',
      value: extension,
      onValueChange: setExtension,
    }),
    createElement(OgeMaskedTextBox, {
      key: 'product',
      label: 'Product code',
      mask: productMask,
      value: product,
      onValueChange: setProduct,
    }),
  );
}

function ValuesDemo(): ReactNode {
  const [raw, setRaw] = useState('');
  const [formatted, setFormatted] = useState('');
  const [status, setStatus] = useState('Type all 16 digits');
  return createElement(
    'div',
    null,
    row(
      createElement(OgeMaskedTextBox, {
        key: 'raw',
        label: 'Card (raw)',
        mask: '0000 0000 0000 0000',
        value: raw,
        onValueChange: setRaw,
      }),
      createElement(OgeMaskedTextBox, {
        key: 'formatted',
        label: 'Card (with literals)',
        mask: '0000 0000 0000 0000',
        includeLiterals: true,
        value: formatted,
        onValueChange: setFormatted,
        onMaskCompleted: (event) => setStatus(`Complete: ${event.maskedValue}`),
      }),
    ),
    createElement(
      'p',
      { className: 'mt-3 text-sm' },
      'raw: ',
      createElement('code', { 'data-testid': 'masked-card-raw' }, raw),
      ' · formatted: ',
      createElement(
        'code',
        { 'data-testid': 'masked-card-formatted' },
        formatted,
      ),
    ),
    createElement(
      'p',
      { className: 'text-sm', 'data-testid': 'masked-card-status' },
      status,
    ),
  );
}

function DisplayDemo(): ReactNode {
  const [code, setCode] = useState('');
  const [postal, setPostal] = useState('');
  const [pin, setPin] = useState('');
  return row(
    createElement(OgeMaskedTextBox, {
      key: 'code',
      label: 'Date code',
      mask: '00.00.0000',
      maskChar: '•',
      value: code,
      onValueChange: setCode,
    }),
    createElement(OgeMaskedTextBox, {
      key: 'postal',
      label: 'Postal code',
      mask: '00000',
      showMaskMode: 'onFocus',
      placeholder: '5 digits',
      value: postal,
      onValueChange: setPostal,
    }),
    createElement(OgeMaskedTextBox, {
      key: 'pin',
      label: 'PIN',
      labelMode: 'floating',
      mask: '0000',
      value: pin,
      onValueChange: setPin,
    }),
  );
}

function ValidationDemo(): ReactNode {
  const [iban, setIban] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const ibanValid = iban !== '' && ogeMaskComplete(IBAN_MASK, iban);
  return createElement(
    'div',
    null,
    row(
      createElement(OgeMaskedTextBox, {
        key: 'iban',
        label: 'IBAN',
        mask: IBAN_MASK,
        required: true,
        value: iban,
        onValueChange: setIban,
      }),
      createElement(OgeMaskedTextBox, {
        key: 'tax',
        label: 'Tax number',
        mask: '000-000-0000',
        maskInvalidMessage: 'Enter all 10 digits',
        value: taxNumber,
        onValueChange: setTaxNumber,
      }),
    ),
    createElement(
      'p',
      { className: 'mt-3 text-sm' },
      'IBAN valid: ',
      createElement(
        'code',
        { 'data-testid': 'masked-iban-valid' },
        String(ibanValid),
      ),
    ),
  );
}

function TextBoxDemo(): ReactNode {
  const [time, setTime] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeTextBox, {
      label: 'Time',
      mask: '00:00',
      includeLiterals: true,
      showClearButton: true,
      value: time,
      onValueChange: setTime,
    }),
    createElement(
      'p',
      { className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'masked-time-value' }, time),
    ),
  );
}

/**
 * The React half of the masked text box page — the same six demo sections as
 * the Angular page, rendered as real React trees inside
 * `/components/inputs/masked-text-box` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-masked-text-box-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['mask', 'raw value', 'caret skips literals']"
      heading="Getting started"
      description="<code>0</code> is a required digit; the parentheses, the space and the dash are literals the caret skips. The value is the raw digits — no literals, no placeholders — and a digit-only mask asks mobile keyboards for the numeric layout."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['0 9 # L l A a C c', 'maskRules', 'escapes']"
      heading="Mask syntax and custom rules"
      description="<code>0</code> digit, <code>9</code> optional digit, <code>#</code> digit/space/sign, <code>L</code>/<code>l</code> letter (required/optional, any script), <code>A</code>/<code>a</code> letter or digit, <code>C</code>/<code>c</code> any character; a backslash makes a rule character literal. <code>maskRules</code> adds single-character keys — keep the object stable (module scope or <code>useMemo</code>)."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="syntax" />
    </app-demo-card>

    <app-demo-card
      [chips]="['includeLiterals', 'onMaskCompleted']"
      heading="Raw and formatted values"
      description="By default the value is the raw characters; <code>includeLiterals</code> commits the formatted text instead. <code>onMaskCompleted</code> fires once, when the last required slot is filled."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="values" />
    </app-demo-card>

    <app-demo-card
      [chips]="['maskChar', 'showMaskMode', 'floating label']"
      heading="Mask display"
      description="<code>maskChar</code> sets the placeholder of empty slots. <code>showMaskMode: 'onFocus'</code> keeps the empty mask hidden while blurred so the <code>placeholder</code> shows; a floating label does the same."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="display" />
    </app-demo-card>

    <app-demo-card
      [chips]="['ogeMaskComplete', 'maskInvalidMessage']"
      heading="Validation and forms"
      description="An unfinished mask flags the field (after blur, per <code>errorDisplay</code>) with <code>maskInvalidMessage</code> or the catalog's <code>maskInvalidError</code>. Form libraries check the same rule with <code>ogeMaskComplete()</code>, which also runs on a server."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="validation" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeTextBox', 'mask prop']"
      heading="Mask on the text box"
      description="The same engine on the plain text box: <code>mask</code> is optional there, so a time field keeps its clear button and prefix/suffix slots. Without a mask it is the ordinary text box."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="textBox" />
    </app-demo-card>
  `,
})
export class ReactInputsMaskedTextBoxDemos {
  protected readonly demos = INPUTS_MASKED_TEXT_BOX_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly syntax = () => createElement(SyntaxDemo);
  protected readonly values = () => createElement(ValuesDemo);
  protected readonly display = () => createElement(DisplayDemo);
  protected readonly validation = () => createElement(ValidationDemo);
  protected readonly textBox = () => createElement(TextBoxDemo);
}
