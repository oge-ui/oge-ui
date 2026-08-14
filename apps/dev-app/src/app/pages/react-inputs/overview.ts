import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeNumberBox, OgeTextArea, OgeTextBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same four sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_OVERVIEW_SECTIONS = [
  'The three editors',
  'Styling modes & sizes',
  'Label modes',
  'Prefix & suffix slots',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

/**
 * The controlled editors of the first demo — a real React function component
 * with `useState`, so the preview runs the exact code the snippet shows.
 */
function EditorsDemo(): ReactNode {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  return row(
    createElement(OgeTextBox, {
      key: 'name',
      label: 'Name',
      value: name,
      onValueChange: setName,
      placeholder: 'Jane Doe',
    }),
    createElement(OgeTextBox, {
      key: 'mail',
      label: 'E-mail',
      mode: 'email',
      hint: 'We never share it',
      showClearButton: true,
    }),
    createElement(OgeNumberBox, {
      key: 'amount',
      label: 'Amount',
      value: amount,
      onValueChange: setAmount,
      min: 0,
      showSpinButtons: true,
    }),
    createElement(OgeTextArea, {
      key: 'notes',
      label: 'Notes',
      value: notes,
      onValueChange: setNotes,
      autoResize: true,
      maxRows: 6,
    }),
  );
}

/**
 * The React half of the inputs overview — the same four demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="[
        'three editors',
        'value + onValueChange',
        'clear button',
        'auto-resize',
      ]"
      heading="The three editors"
      description="<code>OgeTextBox</code>, <code>OgeTextArea</code> and <code>OgeNumberBox</code> share one field chrome, so labels, hints, errors and adornments behave identically. All three are the standard React controlled/uncontrolled pair: pass <code>value</code> + <code>onValueChange</code>, or <code>defaultValue</code> alone. The number editor treats empty as <code>null</code> — never <code>0</code>."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="editors" />
    </app-demo-card>

    <app-demo-card
      [chips]="['stylingMode ×3', 'size: sm | md | lg']"
      heading="Styling modes & sizes"
      description="<code>outlined</code> (default), <code>filled</code> and <code>underlined</code> cover the common form aesthetics; all derive from the design tokens and adapt to every theme. Sizes <code>sm</code>/<code>md</code>/<code>lg</code> (28/34/42px) match the button scale exactly, so mixed button-and-field rows align without manual tweaks."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="styling" />
    </app-demo-card>

    <app-demo-card
      [chips]="['labelMode: static | floating | hidden | outside']"
      heading="Label modes"
      description="Four placements: <code>static</code> renders a compact caption above the field, <code>outside</code> a conventional block label, <code>floating</code> starts in the placeholder position and lifts on focus or content, and <code>hidden</code> keeps the field visually clean while exposing the label to screen readers via <code>aria-label</code>. Avoid mixing modes within one row — floating fields are taller."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="labelModes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['prefix / suffix props']"
      heading="Prefix & suffix slots"
      description="Pass any node — symbols, icons, units — as the <code>prefix</code> or <code>suffix</code> prop (the React counterpart of the <code>ogeInputPrefix</code> / <code>ogeInputSuffix</code> projection slots). Custom suffixes render at the end of the built-in rail, after the clear, reveal and copy buttons, so the ordering stays predictable."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="adornments" />
    </app-demo-card>
  `,
})
export class ReactInputsOverviewDemos {
  protected readonly demos = INPUTS_OVERVIEW_DEMOS;

  protected readonly editors = () => createElement(EditorsDemo);

  protected readonly styling = () =>
    row(
      createElement(OgeTextBox, {
        key: 'o',
        label: 'Outlined',
        stylingMode: 'outlined',
      }),
      createElement(OgeTextBox, {
        key: 'f',
        label: 'Filled',
        stylingMode: 'filled',
      }),
      createElement(OgeTextBox, {
        key: 'u',
        label: 'Underlined',
        stylingMode: 'underlined',
      }),
      createElement(OgeTextBox, { key: 's', label: 'Small', size: 'sm' }),
      createElement(OgeTextBox, { key: 'l', label: 'Large', size: 'lg' }),
    );

  protected readonly labelModes = () =>
    row(
      createElement(OgeTextBox, {
        key: 'st',
        label: 'Static (default)',
        labelMode: 'static',
      }),
      createElement(OgeTextBox, {
        key: 'fl',
        label: 'Floating',
        labelMode: 'floating',
      }),
      createElement(OgeTextBox, {
        key: 'ou',
        label: 'Outside',
        labelMode: 'outside',
      }),
      createElement(OgeTextBox, {
        key: 'hi',
        label: 'Hidden (aria-label)',
        labelMode: 'hidden',
        placeholder: 'Search…',
      }),
    );

  protected readonly adornments = () =>
    row(
      createElement(OgeTextBox, {
        key: 'p',
        label: 'Price',
        prefix: createElement('span', null, '€'),
      }),
      createElement(OgeTextBox, {
        key: 'w',
        label: 'Website',
        placeholder: 'example.com',
        prefix: createElement('span', null, 'https://'),
      }),
    );
}
