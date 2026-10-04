import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeColorPalette } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_COLOR_PALETTE_DEMOS } from './color-palette-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_COLOR_PALETTE_SECTIONS = [
  'Getting started',
  'Presets',
  'Custom swatches',
  'Inside a form',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const BRAND = [
  '#0f172a',
  '#334155',
  '#64748b',
  '#cbd5e1',
  '#4f46e5',
  '#7c3aed',
  '#db2777',
  '#f59e0b',
];

function PaletteDemo(): ReactNode {
  const [tag, setTag] = useState<string | null>('#4a86e8');
  return createElement(
    'div',
    null,
    createElement(OgeColorPalette, {
      key: 'palette',
      label: 'Tag color',
      value: tag,
      onValueChange: setTag,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'palette-value' }, tag ?? 'null'),
    ),
  );
}

function PalettePresetsDemo(): ReactNode {
  const [office, setOffice] = useState<string | null>('#4472c4');
  const [material, setMaterial] = useState<string | null>('#009688');
  return row(
    createElement(OgeColorPalette, {
      key: 'office',
      label: 'Office',
      palette: 'office',
      value: office,
      onValueChange: setOffice,
    }),
    createElement(OgeColorPalette, {
      key: 'material',
      label: 'Material',
      palette: 'material',
      value: material,
      onValueChange: setMaterial,
    }),
  );
}

function PaletteCustomDemo(): ReactNode {
  const [swatch, setSwatch] = useState<string | null>('#7c3aed');
  return createElement(OgeColorPalette, {
    label: 'Brand swatches',
    palette: BRAND,
    columns: 4,
    tileSize: 32,
    value: swatch,
    onValueChange: setSwatch,
  });
}

function PaletteFormDemo(): ReactNode {
  const [color, setColor] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  return createElement(OgeColorPalette, {
    label: 'Label color',
    palette: 'basic',
    required: true,
    value: color,
    onValueChange: setColor,
    touched,
    onBlur: () => setTouched(true),
    errors: color ? [] : [{ kind: 'required' }],
  });
}

/**
 * The React half of the color palette page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-color-palette-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'APG grid', 'Enter / Space']"
      heading="Getting started"
      description="Arrows move by tile / row (RTL-mirrored; the grid neither wraps nor crosses rows), Home/End to the row edges, Ctrl+Home/Ctrl+End to the corners; Enter, Space or a click picks the swatch string as listed."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['palette', 'office', 'material']"
      heading="Presets"
      description="<code>palette</code> takes a preset name — <code>'default' | 'basic' | 'office' | 'material' | 'monochrome'</code> — each with its own column count; <code>OGE_COLOR_PALETTE_PRESETS</code> exports the data."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="presets" />
    </app-demo-card>

    <app-demo-card
      [chips]="['palette: string[]', 'columns', 'tileSize']"
      heading="Custom swatches"
      description="Your own CSS colors (unparseable entries are dropped), a <code>columns</code> count and a fixed <code>tileSize</code> in px — the grid then shrink-wraps the tiles."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="custom" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'errors', 'touched']"
      heading="Inside a form"
      description="React has no <code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>; pass <code>required</code>, <code>errors</code> and <code>touched</code> from your form layer for the validation state. <code>disabled</code> takes every tile out of the Tab sequence."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsColorPaletteDemos {
  protected readonly demos = INPUTS_COLOR_PALETTE_DEMOS;

  protected readonly basic = () => createElement(PaletteDemo);
  protected readonly presets = () => createElement(PalettePresetsDemo);
  protected readonly custom = () => createElement(PaletteCustomDemo);
  protected readonly form = () => createElement(PaletteFormDemo);
}
