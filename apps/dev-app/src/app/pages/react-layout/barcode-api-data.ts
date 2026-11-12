import type { ApiSections } from '../../shared/api-reference';
import {
  BARCODE_MESSAGES_DOC,
  BARCODE_SCANNER_READING,
  BARCODE_TYPES,
} from '../layout/barcode-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/barcode.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/barcode-api-data.ts`: the two-way
 * model becomes a controlled prop with its callback (and `defaultActive`),
 * the outputs `onX` callbacks, the methods ref handles.
 */
export const OGE_REACT_BARCODE_API: ApiSections = {
  properties: [
    {
      title: '<OgeBarcode>',
      entries: [
        {
          name: 'value',
          type: 'string (required)',
          description: 'What the symbol encodes.',
        },
        {
          name: 'type',
          type: "'qr' | 'code128' | 'ean13'",
          default: "'qr'",
          description: `${BARCODE_TYPES}. A value the symbology cannot hold shows the <code>invalid</code> message instead of a symbol.`,
        },
        {
          name: 'errorCorrection',
          type: "'L' | 'M' | 'Q' | 'H' | undefined",
          default: "config ?? 'M'",
          description:
            'QR only: recovers about 7, 15, 25 or 30 % of a damaged symbol; higher levels need a larger symbol.',
        },
        {
          name: 'scale',
          type: 'number',
          default: '4',
          description:
            'Pixels per module. The SVG also shrinks to fit its container.',
        },
        {
          name: 'barHeight',
          type: 'number',
          default: '50',
          description: 'Bar height of a linear symbol, in modules.',
        },
        {
          name: 'quietZone',
          type: 'boolean',
          default: 'true',
          description:
            'The light margin scanners need: 4 modules round a QR code, 10 beside bars.',
        },
        {
          name: 'showText',
          type: 'boolean',
          default: 'true',
          description: 'The human-readable line under a linear symbol.',
        },
        {
          name: 'color / background',
          type: 'string',
          default: "'#000000' / '#ffffff'",
          description:
            'Bar and background colours. Keep them dark on light: scanners need the contrast.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          default: 'qrLabel / barcodeLabel message',
          description: 'Accessible name of the symbol (an <code>img</code>).',
        },
        {
          name: 'messages',
          type: 'Partial<OgeBarcodeMessages>',
          description: 'Per-instance overrides of the config catalog.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Added to the root of either component.',
        },
      ],
    },
    {
      title: '<OgeBarcodeScanner>',
      entries: [
        {
          name: 'active',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'The camera is open and reading (controlled; <code>defaultActive</code> when uncontrolled). A camera that cannot open reports <code>false</code>.',
        },
        {
          name: 'decoder',
          type: 'OgeBarcodeDecoder | undefined',
          default: 'the browser’s BarcodeDetector',
          description: BARCODE_SCANNER_READING,
        },
        {
          name: 'types',
          type: 'readonly OgeBarcodeType[]',
          default: "['qr', 'code128', 'ean13']",
          description: 'Symbologies the browser’s reader looks for.',
        },
        {
          name: 'interval',
          type: 'number',
          default: '250',
          description: 'Milliseconds between camera frames read.',
        },
        {
          name: 'facingMode',
          type: "'environment' | 'user'",
          default: "'environment'",
          description: 'The back camera, or the one facing the user.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handles (OgeBarcodeHandle, OgeBarcodeScannerHandle)',
      entries: [
        {
          name: 'toSvg()',
          type: '() => string | null',
          description:
            '&lt;OgeBarcode&gt;: the symbol as a standalone SVG document (for an <code>&lt;img&gt;</code>, a print, an e-mail).',
        },
        {
          name: 'download(fileName?)',
          type: '(fileName?: string) => void',
          description:
            "&lt;OgeBarcode&gt;: saves the symbol as an SVG file (default <code>'barcode.svg'</code>).",
        },
        {
          name: 'start() / stop()',
          type: '() => void',
          description: '&lt;OgeBarcodeScanner&gt;: opens or closes the camera.',
        },
        {
          name: 'scanImage(image)',
          type: '(image: Blob) => Promise<readonly OgeBarcodeResult[]>',
          description:
            '&lt;OgeBarcodeScanner&gt;: reads a picked or pasted image; every barcode found is also reported.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onActiveChange',
          type: '(active: boolean) => void',
          description:
            'The camera opened or closed — the toggle, a method or a failure.',
        },
        {
          name: 'onDetected',
          type: '(result: OgeBarcodeResult) => void',
          description:
            '<code>{ value, format }</code> — <code>format</code> as the Shape Detection API names it (<code>qr_code</code>, <code>code_128</code>, <code>ean_13</code>, …).',
        },
        {
          name: 'onStatusChange',
          type: '(status: OgeBarcodeScannerStatus) => void',
          description:
            "<code>'idle'</code>, <code>'starting'</code>, <code>'scanning'</code>, <code>'unsupported'</code>, <code>'permission'</code> (access refused), <code>'no-camera'</code> or <code>'failed'</code>; a polite status line says the same.",
        },
      ],
    },
  ],
  types: [
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeBarcodeProps / OgeBarcodeScannerProps',
          type: 'interface',
          description: 'The props above.',
        },
        {
          name: 'OgeBarcodeHandle / OgeBarcodeScannerHandle',
          type: '{ toSvg(); download() } / { start(); stop(); scanImage() }',
          description: 'What a <code>ref</code> reaches.',
        },
        {
          name: 'OgeBarcodeType',
          type: "'qr' | 'code128' | 'ean13'",
          description: 'The symbologies drawn.',
        },
        {
          name: 'OgeQrErrorCorrection',
          type: "'L' | 'M' | 'Q' | 'H'",
          description: 'QR error-correction level.',
        },
        {
          name: 'OgeBarcodeResult',
          type: '{ value: string; format: string }',
          description: 'One barcode read.',
        },
        {
          name: 'OgeBarcodeDecoder',
          type: '(source: ImageBitmapSource) => Promise<readonly OgeBarcodeResult[]>',
          description: 'What the scanner reads frames and images with.',
        },
        {
          name: 'OgeBarcodeScannerStatus',
          type: "'idle' | 'starting' | 'scanning' | 'unsupported' | 'permission' | 'no-camera' | 'failed'",
          description: 'Where the scanner stands.',
        },
      ],
    },
    {
      title: 'Functions (@oge-ui/behavior, re-exported)',
      entries: [
        {
          name: 'ogeEncodeBarcode',
          type: '(value, type, { errorCorrection? }) => OgeBarcodeSymbol',
          description:
            'Encodes without drawing: a module matrix or a row of bars. Throws <code>RangeError</code> for a value that does not fit.',
        },
        {
          name: 'ogeBarcodeSvg',
          type: '(drawing, { scale?, color?, background?, label? }) => string',
          description:
            'A standalone SVG of a drawing — for servers and workers.',
        },
        {
          name: 'ogeNativeBarcodeDecoder',
          type: '(formats?) => OgeBarcodeDecoder | null',
          description:
            'The browser’s <code>BarcodeDetector</code> as a decoder, or <code>null</code> where there is none.',
        },
      ],
    },
  ],
};

export const OGE_REACT_BARCODE_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeBarcodeConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeBarcodeMessages',
          description: BARCODE_MESSAGES_DOC,
        },
        {
          name: 'errorCorrection',
          type: "'L' | 'M' | 'Q' | 'H' | undefined",
          description:
            'Default QR error correction. <code>useOgeBarcodeConfig()</code> reads the resolved value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeBarcodeConfigProvider',
          type: '({ config?, children }) => JSX.Element',
          description: 'Subtree-scoped defaults.',
        },
        {
          name: 'useOgeBarcodeConfig',
          type: '() => OgeBarcodeConfig',
          description: 'Reads the resolved config.',
        },
        {
          name: 'OGE_DEFAULT_BARCODE_CONFIG',
          type: 'OgeBarcodeConfig',
          description: 'The defaults.',
        },
        {
          name: 'OGE_DEFAULT_BARCODE_MESSAGES',
          type: 'OgeBarcodeMessages',
          description: 'The English catalog.',
        },
        {
          name: 'OgeBarcodeConfig',
          type: '{ messages: OgeBarcodeMessages; errorCorrection? }',
          description: 'Resolved config shape.',
        },
        {
          name: 'OgeBarcodeConfigInput',
          type: 'Partial<OgeBarcodeConfig> with partial messages',
          description: 'What the provider accepts.',
        },
        {
          name: 'OgeBarcodeMessages',
          type: '{ qrLabel; barcodeLabel; invalid; scannerLabel; start; stop; scanImage; scanning; unsupported; permission; noCamera; failed; detected; nothingFound }',
          description: 'The barcode catalog.',
        },
      ],
    },
  ],
};
