import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeRating } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_RATING_DEMOS } from './rating-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_RATING_SECTIONS = [
  'Getting started',
  'Half and fractional values',
  'Icons and templates',
  'Radio group semantics',
  'Inside a form',
] as const;

function RatingDemo(): ReactNode {
  const [stars, setStars] = useState<number | null>(3);
  return createElement(
    'div',
    null,
    createElement(OgeRating, {
      key: 'rating',
      label: 'Your rating',
      value: stars,
      onValueChange: setStars,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'rating-value' }, String(stars)),
    ),
  );
}

function RatingPrecisionDemo(): ReactNode {
  const [half, setHalf] = useState<number | null>(2.5);
  const [ten, setTen] = useState<number | null>(7);
  return createElement(
    'div',
    { className: 'flex flex-col items-start gap-3' },
    createElement(OgeRating, {
      key: 'half',
      label: 'Half stars',
      precision: 0.5,
      value: half,
      onValueChange: setHalf,
    }),
    createElement(
      'span',
      { key: 'out', className: 'text-sm', 'data-testid': 'rating-half' },
      String(half),
    ),
    createElement(OgeRating, {
      key: 'average',
      label: 'Average rating',
      value: 4.3,
      precision: 0.1,
      readonly: true,
    }),
    createElement(OgeRating, {
      key: 'ten',
      label: 'Out of ten',
      max: 10,
      size: 'sm',
      value: ten,
      onValueChange: setTen,
    }),
  );
}

function RatingIconsDemo(): ReactNode {
  const [love, setLove] = useState<number | null>(4);
  const [effort, setEffort] = useState<number | null>(3);
  return createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-6' },
    createElement(OgeRating, {
      key: 'love',
      label: 'Love it',
      icon: 'heart',
      size: 'lg',
      value: love,
      onValueChange: setLove,
    }),
    createElement(OgeRating, {
      key: 'effort',
      label: 'Effort',
      selection: 'single',
      allowClear: false,
      value: effort,
      onValueChange: setEffort,
      renderItem: (item) =>
        createElement(
          'span',
          { className: 'text-sm font-bold' },
          String(item.itemValue),
        ),
    }),
  );
}

function RatingRadioDemo(): ReactNode {
  const [service, setService] = useState<number | null>(4);
  return createElement(
    'div',
    null,
    createElement(OgeRating, {
      key: 'rating',
      label: 'Service',
      semantics: 'radiogroup',
      value: service,
      onValueChange: setService,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement(
        'code',
        { 'data-testid': 'rating-radio-value' },
        String(service),
      ),
    ),
  );
}

function RatingFormDemo(): ReactNode {
  const [overall, setOverall] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  return createElement(OgeRating, {
    label: 'Overall',
    required: true,
    value: overall,
    onValueChange: setOverall,
    touched,
    onBlur: () => setTouched(true),
    errors: overall === null ? [{ kind: 'required' }] : [],
  });
}

/**
 * The React half of the rating page — the same demo sections as the Angular
 * page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-rating-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'allowClear', 'hover preview']"
      heading="Getting started"
      description="Arrows step by one item (RTL-mirrored), PageUp/PageDown too, Home/End to the ends, the digit keys jump and Delete, Backspace or 0 clear. A press on the current value clears it while <code>allowClear</code> is on; the pointer previews the pick."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['precision', 'readonly', 'max']"
      heading="Half and fractional values"
      description="<code>precision</code> sets the step: <code>0.5</code> for half stars, <code>0.1</code> to show an average exactly. <code>readonly</code> stays focusable and announced but unchangeable."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="precision" />
    </app-demo-card>

    <app-demo-card
      [chips]="['icon', 'renderItem', 'selection']"
      heading="Icons and templates"
      description="A built-in glyph — <code>'star' | 'heart' | 'circle'</code> — or any markup through <code>renderItem</code>, called for the empty and the filled layer. <code>selection=&quot;single&quot;</code> paints only the item holding the value."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="icons" />
    </app-demo-card>

    <app-demo-card
      [chips]="['semantics', 'APG radio group', 'roving tabindex']"
      heading="Radio group semantics"
      description='<code>semantics="radiogroup"</code> renders one radio per item with a roving tab stop: arrows move and select (wrapping), Space selects. Whole-item precision only — fractional precisions fall back to the slider.'
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="radio" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'errors', 'touched']"
      heading="Inside a form"
      description="React has no <code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>; pass <code>required</code>, <code>errors</code> and <code>touched</code> from your form layer. Not rated is <code>null</code>."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsRatingDemos {
  protected readonly demos = INPUTS_RATING_DEMOS;

  protected readonly basic = () => createElement(RatingDemo);
  protected readonly precision = () => createElement(RatingPrecisionDemo);
  protected readonly icons = () => createElement(RatingIconsDemo);
  protected readonly radio = () => createElement(RatingRadioDemo);
  protected readonly form = () => createElement(RatingFormDemo);
}
