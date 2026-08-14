import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeColorBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_COLOR_BOX_DEMOS } from './color-box-snippets';

/**
 * TOC of the React view — the same six sections as the Angular color box page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_COLOR_BOX_SECTIONS = [
  'Getting started',
  'Formats and alpha',
  'Palette view',
  'Apply with buttons',
  'Typed colors',
  'Inside a form',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const note = (...children: ReactNode[]) =>
  createElement('p', { className: 'mt-3 text-sm' }, ...children);

const swatches: readonly string[] = [
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#475569',
  '#111827',
];

/** The committed CSS color string, read back live under the field. */
function BasicDemo(): ReactNode {
  const [brand, setBrand] = useState<string | null>('#3aa0ff');
  return createElement(
    'div',
    null,
    createElement(OgeColorBox, {
      key: 'brand',
      label: 'Brand color',
      value: brand,
      onValueChange: setBrand,
      showClearButton: true,
    }),
    note(
      'Value: ',
      createElement(
        'code',
        { key: 'v', 'data-testid': 'color-value' },
        brand ?? 'null',
      ),
    ),
  );
}

/** `format` + `editAlphaChannel` — the committed shape, side by side. */
function FormatsDemo(): ReactNode {
  const [overlay, setOverlay] = useState<string | null>(
    'rgba(58, 160, 255, 0.5)',
  );
  const [accent, setAccent] = useState<string | null>('hsl(210, 100%, 61%)');
  return createElement(
    'div',
    null,
    row(
      createElement(OgeColorBox, {
        key: 'overlay',
        label: 'Overlay',
        format: 'rgba',
        editAlphaChannel: true,
        value: overlay,
        onValueChange: setOverlay,
      }),
      createElement(OgeColorBox, {
        key: 'accent',
        label: 'Accent (hsl)',
        format: 'hsl',
        value: accent,
        onValueChange: setAccent,
      }),
    ),
    note(
      'Overlay: ',
      createElement('code', { key: 'o' }, overlay),
      ' — Accent: ',
      createElement('code', { key: 'a' }, accent),
    ),
  );
}

/** The swatch grid view. */
function PaletteDemo(): ReactNode {
  const [tag, setTag] = useState<string | null>('#16a34a');
  return createElement(OgeColorBox, {
    label: 'Tag color',
    view: 'palette',
    palette: swatches,
    paletteColumns: 5,
    value: tag,
    onValueChange: setTag,
  });
}

/** Draft collection with the OK/Cancel footer. */
function ButtonsDemo(): ReactNode {
  const [theme, setTheme] = useState<string | null>('#7c3aed');
  return createElement(OgeColorBox, {
    label: 'Theme color',
    view: 'both',
    applyValueMode: 'useButtons',
    value: theme,
    onValueChange: setTheme,
  });
}

/** CSS color parsing, and the picker-only variant. */
function TypedDemo(): ReactNode {
  const [typed, setTyped] = useState<string | null>('rebeccapurple');
  return row(
    createElement(OgeColorBox, {
      key: 'any',
      label: 'Any CSS color',
      value: typed,
      onValueChange: setTyped,
    }),
    createElement(OgeColorBox, {
      key: 'picker',
      label: 'Picker only',
      acceptCustomValue: false,
      value: typed,
      onValueChange: setTyped,
    }),
  );
}

/** The editor inside a hand-composed React form model. */
function FormDemo(): ReactNode {
  const [branding, setBranding] = useState({ primary: '#3aa0ff' });
  return createElement(
    'div',
    null,
    createElement(OgeColorBox, {
      key: 'primary',
      label: 'Primary color',
      format: 'hex',
      showClearButton: true,
      value: branding.primary,
      onValueChange: (primary: string | null) =>
        setBranding((current) => ({ ...current, primary: primary ?? '' })),
    }),
    note('Model: ', createElement('code', { key: 'm' }, branding.primary)),
  );
}

/**
 * The React half of the color box page — the same six demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/color-box` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-color-box-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'swatch', 'dialog focus']"
      heading="Getting started"
      description="The committed value is a CSS color string — bind it straight to styles. Opening moves DOM focus onto the gradient surface; Escape restores it to the input. In Chromium the panel also offers an eyedropper (the <code>EyeDropper</code> API — progressive enhancement, no polyfill). <code>onValueCommitted</code> reports every change with <code>previousValue</code>."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['format', 'editAlphaChannel', 'alpha widening']"
      heading="Formats and alpha"
      description="<code>format: 'hex' | 'rgb' | 'rgba' | 'hsl'</code> fixes the committed shape (hex default — the DevExtreme choice). <code>editAlphaChannel</code> adds the alpha slider and input; translucent colors widen the output to carry alpha, opaque ones stay compact. Without it alpha is coerced to 1 on commit."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="formats" />
    </app-demo-card>

    <app-demo-card
      [chips]="['view', 'palette', 'role=grid']"
      heading="Palette view"
      description="<code>view: 'gradient' | 'palette' | 'both'</code>. The palette is an APG grid — roving tabindex, arrow/Home/End/Ctrl+Home navigation, Enter/Space picks and closes. The selected cell's checkmark picks black or white by WCAG contrast against the swatch."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="palette" />
    </app-demo-card>

    <app-demo-card
      [chips]="['applyValueMode', 'draft', 'OK/Cancel']"
      heading="Apply with buttons"
      description="<code>applyValueMode: 'useButtons'</code> collects panel interactions in a draft and commits only on OK; Cancel, Escape or an outside click discards — the date box's exact contract, with Kendo's committed&nbsp;|&nbsp;draft preview pair in the footer. The default <code>'instantly'</code> commits live while dragging."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="buttons" />
    </app-demo-card>

    <app-demo-card
      [chips]="['CSS parsing', 'named colors', 'revert on blur']"
      heading="Typed colors"
      description="Typed text parses any CSS color — hex in all four lengths, <code>rgb()</code>/<code>rgba()</code> in comma and space/slash syntax, <code>hsl()</code>, the named colors, <code>transparent</code>. Commits normalize to <code>format</code>; unparseable text shows the invalid state while typing and reverts on blur. <code>acceptCustomValue=&#123;false&#125;</code> makes the text read-only."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="typed" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled value', 'own form model']"
      heading="Inside a form"
      description="The forms family has no React render layer yet, so a React form composes the editor directly: one state object, one controlled <code>OgeColorBox</code> per field. Everything the Angular <code>editorType: 'colorBox'</code> options configure — <code>format</code>, <code>editAlphaChannel</code>, <code>view</code>, <code>palette</code> — is a plain prop here."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsColorBoxDemos {
  protected readonly demos = INPUTS_COLOR_BOX_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly formats = () => createElement(FormatsDemo);
  protected readonly palette = () => createElement(PaletteDemo);
  protected readonly buttons = () => createElement(ButtonsDemo);
  protected readonly typed = () => createElement(TypedDemo);
  protected readonly form = () => createElement(FormDemo);
}
