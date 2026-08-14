import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeRangeSlider, OgeSlider } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_SLIDER_DEMOS } from './slider-snippets';

/**
 * TOC of the React view — the same six sections as the Angular slider page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_SLIDER_SECTIONS = [
  'Getting started',
  'Range slider',
  'Ticks and labels',
  'Value indicator',
  'Buttons and vertical',
  'Inside a form',
] as const;

/** One thumb, the full APG key set — a real controlled React component. */
function SliderDemo(): ReactNode {
  const [volume, setVolume] = useState(40);
  return createElement(
    'div',
    null,
    createElement(OgeSlider, {
      key: 'slider',
      value: volume,
      onValueChange: setVolume,
      min: 0,
      max: 100,
      ariaLabel: 'Volume',
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'slider-value' }, volume),
    ),
  );
}

/** Two thumbs selecting a `[start, end]` pair. */
function RangeSliderDemo(): ReactNode {
  const [price, setPrice] = useState<readonly [number, number]>([200, 600]);
  return createElement(
    'div',
    null,
    createElement(OgeRangeSlider, {
      key: 'slider',
      value: price,
      onValueChange: setPrice,
      min: 0,
      max: 1000,
      step: 10,
      minRange: 50,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Range: ',
      createElement(
        'code',
        { 'data-testid': 'range-value' },
        `${price[0]} – ${price[1]}`,
      ),
    ),
  );
}

/** Ticks on the `tickStep` grid, with formatted tick labels. */
function SliderTicksDemo(): ReactNode {
  const [rating, setRating] = useState(6);
  return createElement(OgeSlider, {
    value: rating,
    onValueChange: setRating,
    min: 0,
    max: 10,
    largeStep: 2,
    showTicks: true,
    showTickLabels: true,
    ariaLabel: 'Rating',
  });
}

const asDecibels = (value: number): string => `${value} dB`;

/** The value bubble while focused or dragging, formatted by `formatValue`. */
function SliderIndicatorDemo(): ReactNode {
  const [decibels, setDecibels] = useState(40);
  return createElement(OgeSlider, {
    value: decibels,
    onValueChange: setDecibels,
    valueIndicator: 'active',
    formatValue: asDecibels,
    showLabels: true,
    ariaLabel: 'Volume',
  });
}

/** Step buttons and the vertical orientation, sharing one value. */
function SliderButtonsDemo(): ReactNode {
  const [level, setLevel] = useState(30);
  return createElement(
    'div',
    null,
    createElement(OgeSlider, {
      key: 'h',
      value: level,
      onValueChange: setLevel,
      showButtons: true,
      ariaLabel: 'With buttons',
    }),
    createElement(
      'div',
      { key: 'v', className: 'mt-4', style: { height: 180 } },
      createElement(OgeSlider, {
        value: level,
        onValueChange: setLevel,
        orientation: 'vertical',
        ariaLabel: 'Vertical',
      }),
    ),
  );
}

/** The React form integration point: the controlled pair itself. */
function SliderFormDemo(): ReactNode {
  const [settings, setSettings] = useState({ brightness: 70 });
  return createElement(
    'form',
    { onSubmit: (event: { preventDefault(): void }) => event.preventDefault() },
    createElement('span', { key: 'label', className: 'text-sm' }, 'Brightness'),
    createElement(OgeSlider, {
      key: 'slider',
      value: settings.brightness,
      onValueChange: (brightness: number) => setSettings({ brightness }),
      min: 0,
      max: 100,
      step: 5,
      ariaLabel: 'Brightness',
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Model: ',
      createElement('code', null, settings.brightness),
    ),
  );
}

/**
 * The React half of the slider page — the same six demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/slider` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-slider-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React sliders carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'step', 'keyboard']"
      heading="Getting started"
      description="One thumb, the full APG key set, live commits while dragging. <code>onValueChange</code> reports every committed change (<code>onValueCommitted</code> adds the previous value and the originating event); <code>onSlideEnded</code> fires once per gesture at release — the DevExtreme <code>onHandleRelease</code> timing without a mode switch."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['[start, end]', 'minRange', 'aria constraint']"
      heading="Range slider"
      description="Two thumbs selecting a <code>[start, end]</code> pair. Each thumb's <code>aria-valuemin</code>/<code>aria-valuemax</code> is dynamically constrained by the other — the APG multi-thumb rule — and <code>minRange</code> keeps a minimum gap. Clicking the track moves the nearest thumb."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="range" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showTicks', 'tickStep', 'showLabels']"
      heading="Ticks and labels"
      description="Ticks sit on the <code>tickStep</code> grid (falling back to <code>largeStep</code>, then <code>step</code>). <code>showTickLabels</code> renders a formatted label under each tick — Kendo's tick <code>title</code> callback, fed by <code>formatValue</code>; <code>showLabels</code> renders just the <code>min</code>/<code>max</code> ends instead."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="ticks" />
    </app-demo-card>

    <app-demo-card
      [chips]="['valueIndicator', 'formatValue', 'aria-valuetext']"
      heading="Value indicator"
      description="<code>valueIndicator: 'active'</code> shows the bubble while focused or dragging; <code>'always'</code> keeps it up. <code>formatValue</code> feeds the bubble, the end labels <strong>and</strong> <code>aria-valuetext</code> — display and screen-reader announcement can never diverge."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="indicator" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showButtons', 'orientation']"
      heading="Buttons and vertical"
      description="<code>showButtons</code> adds Kendo-style increment/decrement buttons with press-and-hold repeat (the number box's spin timing). A vertical slider keeps the same role with <code>aria-orientation</code> — Up still increases, per the APG."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="buttons" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'bare editor']"
      heading="Inside a form"
      description="React has no <code>formField</code>/<code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>. Hold the value in your form state (<code>useState</code>, React Hook Form, Formik, TanStack Form) and feed it back through <code>value</code> + <code>onValueChange</code>. The slider stays a bare editor, so the label/hint/error chrome belongs to your form layer — the job the Angular <code>&lt;oge-form&gt;</code> does on the other side of this switch."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsSliderDemos {
  protected readonly demos = INPUTS_SLIDER_DEMOS;

  protected readonly basic = () => createElement(SliderDemo);
  protected readonly range = () => createElement(RangeSliderDemo);
  protected readonly ticks = () => createElement(SliderTicksDemo);
  protected readonly indicator = () => createElement(SliderIndicatorDemo);
  protected readonly buttons = () => createElement(SliderButtonsDemo);
  protected readonly form = () => createElement(SliderFormDemo);
}
