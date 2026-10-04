import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeColorGradient } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_COLOR_GRADIENT_DEMOS } from './color-gradient-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_COLOR_GRADIENT_SECTIONS = [
  'Getting started',
  'Alpha and formats',
  'Contrast checker',
  'Inside a form',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

function GradientDemo(): ReactNode {
  const [brand, setBrand] = useState<string | null>('#3aa0ff');
  return createElement(
    'div',
    null,
    createElement(OgeColorGradient, {
      key: 'gradient',
      label: 'Brand color',
      value: brand,
      onValueChange: setBrand,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement(
        'code',
        { 'data-testid': 'gradient-value' },
        brand ?? 'null',
      ),
    ),
  );
}

function GradientAlphaDemo(): ReactNode {
  const [overlay, setOverlay] = useState<string | null>(
    'rgba(58, 160, 255, 0.5)',
  );
  const [accent, setAccent] = useState<string | null>('hsl(160, 84%, 39%)');
  return row(
    createElement(OgeColorGradient, {
      key: 'overlay',
      label: 'Overlay',
      format: 'rgba',
      editAlphaChannel: true,
      value: overlay,
      onValueChange: setOverlay,
    }),
    createElement(OgeColorGradient, {
      key: 'compact',
      label: 'Compact (hsl)',
      format: 'hsl',
      showInputs: false,
      value: accent,
      onValueChange: setAccent,
    }),
  );
}

function GradientContrastDemo(): ReactNode {
  const [text, setText] = useState<string | null>('#767676');
  const [darkText, setDarkText] = useState<string | null>('#94a3b8');
  return row(
    createElement(OgeColorGradient, {
      key: 'light',
      label: 'Text on white',
      showContrast: true,
      contrastBackground: '#ffffff',
      value: text,
      onValueChange: setText,
    }),
    createElement(OgeColorGradient, {
      key: 'dark',
      label: 'Text on dark',
      showContrast: true,
      contrastBackground: '#1e293b',
      value: darkText,
      onValueChange: setDarkText,
    }),
  );
}

function GradientFormDemo(): ReactNode {
  const [model, setModel] = useState<{ theme: string | null }>({
    theme: '#7c3aed',
  });
  return createElement(
    'div',
    null,
    createElement(OgeColorGradient, {
      key: 'gradient',
      label: 'Theme color',
      required: true,
      value: model.theme,
      onValueChange: (theme: string | null) => setModel({ ...model, theme }),
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Model: ',
      createElement('code', null, model.theme),
    ),
  );
}

/**
 * The React half of the color gradient page — the same demo sections as the
 * Angular page, rendered as real React trees when the reader has chosen
 * React (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-color-gradient-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'role=group', 'live commit']"
      heading="Getting started"
      description="Surface, hue slider and channel inputs, each its own Tab stop. Dragging commits live and flushes on release; <kbd>Escape</kbd> mid-drag restores the start color. <code>onValueCommitted</code> adds the previous value and the originating event."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['editAlphaChannel', 'format', 'showInputs']"
      heading="Alpha and formats"
      description="<code>editAlphaChannel</code> adds the alpha slider and percent input; <code>format</code> fixes the committed string, widening to carry alpha when the color is translucent. <code>showInputs={false}</code> keeps only the surface and sliders."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="alpha" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showContrast', 'contrastBackground', 'AA / AAA']"
      heading="Contrast checker"
      description="<code>showContrast</code> renders the WCAG readout against <code>contrastBackground</code> (translucent colors composited over it first) with AA (4.5:1) and AAA (7:1) verdicts — a failing 4.499 never displays as a pass. <code>contrastRatio()</code> / <code>contrastLevels()</code> are exported."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="contrast" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'required']"
      heading="Inside a form"
      description="React has no <code>formField</code> binding — <strong>the controlled pair is the integration point</strong>: hold the value in <code>useState</code>, React Hook Form, Formik or TanStack Form, and pass <code>errors</code> / <code>touched</code> back for the validation state."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsColorGradientDemos {
  protected readonly demos = INPUTS_COLOR_GRADIENT_DEMOS;

  protected readonly basic = () => createElement(GradientDemo);
  protected readonly alpha = () => createElement(GradientAlphaDemo);
  protected readonly contrast = () => createElement(GradientContrastDemo);
  protected readonly form = () => createElement(GradientFormDemo);
}
