import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeBarcode,
  OgeBarcodeScanner,
  type OgeBarcodeHandle,
  type OgeBarcodeType,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_BARCODE_DEMOS } from './barcode-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_LAYOUT_BARCODE_SECTIONS = [
  'Generate',
  'Labels',
  'Scan',
] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';
const TYPES: OgeBarcodeType[] = ['qr', 'code128', 'ean13'];

function GenerateDemo(): ReactNode {
  const code = useRef<OgeBarcodeHandle>(null);
  const [value, setValue] = useState('https://ogeui.com');
  const [type, setType] = useState<OgeBarcodeType>('qr');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { key: 'controls', className: 'flex flex-wrap items-center gap-2' },
      createElement('input', {
        key: 'value',
        className:
          'min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-transparent',
        'aria-label': 'Value',
        'data-testid': 'barcode-value',
        value,
        onChange: (e: { target: { value: string } }) =>
          setValue(e.target.value),
      }),
      ...TYPES.map((t) =>
        createElement(
          'button',
          {
            key: t,
            type: 'button',
            className: BUTTON,
            'aria-pressed': type === t,
            onClick: () => setType(t),
          },
          t,
        ),
      ),
    ),
    createElement(
      'div',
      { key: 'out', className: 'mt-3 flex flex-wrap items-end gap-3' },
      createElement(OgeBarcode, {
        key: 'code',
        ref: code,
        value,
        type,
        scale: 3,
      }),
      createElement(
        'button',
        {
          key: 'dl',
          type: 'button',
          className: BUTTON,
          onClick: () => code.current?.download('barcode.svg'),
        },
        'Download SVG',
      ),
    ),
  );
}

function ScanDemo(): ReactNode {
  const [last, setLast] = useState('Nothing read yet');
  return createElement(
    'div',
    null,
    createElement(OgeBarcodeScanner, {
      key: 'scanner',
      onDetected: (r) => setLast(`${r.format}: ${r.value}`),
    }),
    createElement(
      'p',
      { key: 'last', className: 'mt-2 text-sm', 'data-testid': 'barcode-last' },
      last,
    ),
  );
}

/**
 * The React half of the barcode page — rendered inside `/components/barcode`
 * when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-barcode-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React components carry the class names but no styles of its own
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/layout/barcode/src/barcode.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'type', 'scale', 'ref.download()']"
      heading="Generate"
      description="Type a value and pick a symbology. A value the symbology cannot hold — letters in an EAN-13, a character outside printable ASCII in Code 128 — shows a message instead of a symbol."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="generate" />
    </app-demo-card>

    <app-demo-card
      [chips]="['ean13', 'errorCorrection', 'barHeight', 'color']"
      heading="Labels"
      description="EAN-13 adds its own check digit; a QR code at level H still reads with 30 % of it scuffed; bars take a height and a colour (keep them dark on light)."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="labels" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeBarcodeScanner', 'onDetected', 'decoder']"
      heading="Scan"
      description="Start opens the camera and reads a frame every 250 ms — a value read again within a moment counts once; “Scan an image” reads a file. A polite status line announces each read, and says so when the browser has no reader or the camera is refused."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="scan" />
    </app-demo-card>
  `,
})
export class ReactLayoutBarcodeDemos {
  protected readonly demos = LAYOUT_BARCODE_DEMOS;
  protected readonly generate = () => createElement(GenerateDemo);
  protected readonly labels = () =>
    createElement(
      'div',
      { className: 'flex flex-wrap items-end gap-6' },
      createElement(OgeBarcode, {
        key: 'ean',
        type: 'ean13',
        value: '400638133393',
        scale: 2,
      }),
      createElement(OgeBarcode, {
        key: 'qr',
        value: 'SKU-2041 · Lot 7',
        errorCorrection: 'H',
        scale: 3,
      }),
      createElement(OgeBarcode, {
        key: 'c128',
        type: 'code128',
        value: 'SHIP-000123',
        barHeight: 30,
        color: '#1e3a8a',
      }),
    );
  protected readonly scan = () => createElement(ScanDemo);
}
