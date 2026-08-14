import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type CSSProperties, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { BUTTON_DEMOS } from './react-buttons-snippets';

/**
 * TOC of the React view — the same five sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_BUTTONS_SECTIONS = [
  'Severities & styling modes',
  'Sizes',
  'Icons',
  'Custom colors',
  'Badges',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row' }, ...children);

const svgIcon = (paths: ReactNode[], size = 14) =>
  createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    ...paths,
  );

const downloadIcon = () =>
  svgIcon([
    createElement('path', {
      key: 'p',
      d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    }),
    createElement('polyline', { key: 'l', points: '7 10 12 15 17 10' }),
    createElement('line', { key: 'x', x1: 12, y1: 15, x2: 12, y2: 3 }),
  ]);

const nextIcon = () =>
  svgIcon([createElement('path', { key: 'p', d: 'm9 18 6-6-6-6' })]);

const settingsIcon = () =>
  svgIcon(
    [
      createElement('circle', { key: 'c', cx: 12, cy: 12, r: 3 }),
      createElement('path', {
        key: 'p',
        d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
      }),
    ],
    16,
  );

/**
 * The React half of the buttons overview — the same five demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/buttons` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-buttons-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React components carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/buttons/src/styles.scss',
  template: `
    <app-demo-card
      heading="Severities &amp; styling modes"
      [chips]="['severity', 'stylingMode: contained | outlined | text']"
      description="Five semantic severities (<code>normal</code>, <code>accent</code>, <code>success</code>, <code>warning</code>, <code>danger</code>) map straight to the design tokens, so every theme restyles them automatically. Each severity combines with three fill styles — <code>contained</code> (solid, the default), <code>outlined</code> and <code>text</code> — giving you the full action hierarchy of a page from one component."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="severities" />
    </app-demo-card>

    <app-demo-card
      heading="Sizes"
      description="Three presets — <code>sm</code> (28px), <code>md</code> (34px, default) and <code>lg</code> (42px). The scale is shared with the input editors, so a button placed next to a text box of the same size lines up pixel-perfect in form rows."
      [chips]="['size: sm | md | lg']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="sizes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['icon prop', 'iconPosition']"
      heading="Icons"
      description="There is no icon-font dependency: pass any inline SVG as the <code>icon</code> prop and it inherits the button's color. <code>iconPosition</code> places it before or after the label. Icon-only buttons must provide an accessible name via <code>ariaLabel</code> (or a <code>hint</code> tooltip)."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="icons" />
    </app-demo-card>

    <app-demo-card
      [chips]="['color prop', 'per-instance token override']"
      heading="Custom colors"
      description="The <code>color</code> prop accepts any CSS color and overrides the severity palette for that one button — the hover shade and focus ring derive automatically. For brand-wide changes, override the <code>--oge-*</code> tokens instead: globally, per theme file, or inline on a single element."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="colors" />
    </app-demo-card>

    <app-demo-card
      [chips]="['badge: number | string | true (dot)', '99+ capping']"
      heading="Badges"
      description="A number or string renders a pill in the button's corner; numbers cap at <code>99+</code>. The value joins the button's accessible name through a visually hidden span, so screen readers announce it. Passing <code>true</code> renders a plain attention dot instead."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="badges" />
    </app-demo-card>
  `,
})
export class ReactButtonsDemos {
  protected readonly demos = BUTTON_DEMOS;

  protected readonly severities = () =>
    row(
      createElement(OgeButton, {
        key: '1',
        text: 'Contained',
        severity: 'accent',
      }),
      createElement(OgeButton, {
        key: '2',
        text: 'Outlined',
        severity: 'accent',
        stylingMode: 'outlined',
      }),
      createElement(OgeButton, {
        key: '3',
        text: 'Text',
        severity: 'accent',
        stylingMode: 'text',
      }),
      createElement(OgeButton, {
        key: '4',
        text: 'Success',
        severity: 'success',
      }),
      createElement(OgeButton, {
        key: '5',
        text: 'Warning',
        severity: 'warning',
      }),
      createElement(OgeButton, {
        key: '6',
        text: 'Danger',
        severity: 'danger',
      }),
      createElement(OgeButton, { key: '7', text: 'Normal' }),
      createElement(OgeButton, { key: '8', text: 'Disabled', disabled: true }),
    );

  protected readonly sizes = () =>
    row(
      createElement(OgeButton, { key: 's', text: 'Small', size: 'sm' }),
      createElement(OgeButton, { key: 'm', text: 'Medium' }),
      createElement(OgeButton, { key: 'l', text: 'Large', size: 'lg' }),
      createElement(OgeButton, {
        key: 'o',
        text: 'Small outlined',
        size: 'sm',
        severity: 'accent',
        stylingMode: 'outlined',
      }),
    );

  protected readonly icons = () =>
    row(
      createElement(OgeButton, {
        key: 'd',
        text: 'Download',
        severity: 'accent',
        icon: downloadIcon(),
      }),
      createElement(OgeButton, {
        key: 'n',
        text: 'Next',
        iconPosition: 'after',
        stylingMode: 'outlined',
        icon: nextIcon(),
      }),
      createElement(OgeButton, {
        key: 'g',
        ariaLabel: 'Settings',
        hint: 'Settings',
        stylingMode: 'text',
        icon: settingsIcon(),
      }),
    );

  protected readonly colors = () =>
    row(
      createElement(OgeButton, { key: 'p', text: 'Purple', color: '#7c3aed' }),
      createElement(OgeButton, {
        key: 't',
        text: 'Teal',
        color: '#0d9488',
        stylingMode: 'outlined',
      }),
      createElement(OgeButton, {
        key: 'k',
        text: 'Pink',
        color: '#db2777',
        stylingMode: 'text',
      }),
      createElement(OgeButton, {
        key: 'b',
        text: 'Brand token',
        severity: 'accent',
        style: {
          '--oge-accent': '#ea580c',
          '--oge-accent-soft': 'rgba(234, 88, 12, 0.14)',
        } as CSSProperties,
      }),
    );

  protected readonly badges = () =>
    row(
      createElement(OgeButton, { key: 'i', text: 'Inbox', badge: 7 }),
      createElement(OgeButton, {
        key: 'a',
        text: 'Alerts',
        badge: 120,
        severity: 'accent',
        stylingMode: 'outlined',
      }),
      createElement(OgeButton, {
        key: 'l',
        text: 'Live',
        badge: true,
        stylingMode: 'text',
      }),
    );
}
