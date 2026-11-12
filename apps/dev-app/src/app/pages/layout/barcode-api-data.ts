import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/barcode/src/** and
 * packages/behavior/src/lib/barcode/** — keep in sync with the source TSDoc
 * when the public API changes.
 */

export const BARCODE_TYPES =
  "<code>'qr'</code> (numeric, alphanumeric or UTF-8 byte mode, versions 1–40, the smallest that fits, the lowest-penalty mask), <code>'code128'</code> (printable ASCII; set C packs runs of digits two to a symbol) or <code>'ean13'</code> (12 digits — the check digit is added — or 13, verified)";

export const BARCODE_SCANNER_READING =
  'Reading uses the browser’s own <code>BarcodeDetector</code> (the Shape Detection API: Chrome and Edge on Android, macOS and ChromeOS, Safari 17+). Elsewhere — Firefox, desktop Chrome on Windows and Linux — pass a <code>decoder</code> (a ZXing build, a server call); without one the scanner says it cannot read. A value read again within 1.5 s counts once.';

export const BARCODE_MESSAGES_DOC =
  'Every user-facing string: <code>qrLabel</code> / <code>barcodeLabel</code> (<code>{value}</code>, the symbol’s accessible name), <code>invalid</code> (<code>{type}</code>), <code>scannerLabel</code>, <code>start</code>, <code>stop</code>, <code>scanImage</code>, <code>scanning</code>, <code>unsupported</code>, <code>permission</code>, <code>noCamera</code>, <code>failed</code>, <code>detected</code> (<code>{value}</code>) and <code>nothingFound</code>. Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.barcode</code>).';

export const OGE_BARCODE_API: ApiSections = {
  properties: [
    {
      title: 'oge-barcode',
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
      ],
    },
    {
      title: 'oge-barcode-scanner',
      entries: [
        {
          name: 'active',
          type: 'boolean (model)',
          default: 'false',
          description:
            'Two-way: the camera is open and reading. A camera that cannot open sets it back to <code>false</code>.',
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
      entries: [
        {
          name: 'toSvg()',
          type: '() => string | null',
          description:
            'oge-barcode: the symbol as a standalone SVG document (for an <code>&lt;img&gt;</code>, a print, an e-mail).',
        },
        {
          name: 'download(fileName?)',
          type: '(fileName?: string) => void',
          description:
            "oge-barcode: saves the symbol as an SVG file (default <code>'barcode.svg'</code>).",
        },
        {
          name: 'start() / stop()',
          type: '() => void',
          description: 'oge-barcode-scanner: opens or closes the camera.',
        },
        {
          name: 'scanImage(image)',
          type: '(image: Blob) => Promise<readonly OgeBarcodeResult[]>',
          description:
            'oge-barcode-scanner: reads a picked or pasted image; every barcode found is also emitted.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'activeChange',
          type: 'boolean',
          description: 'The banana half of <code>[(active)]</code>.',
        },
        {
          name: 'detected',
          type: 'OgeBarcodeResult',
          description:
            '<code>{ value, format }</code> — <code>format</code> as the Shape Detection API names it (<code>qr_code</code>, <code>code_128</code>, <code>ean_13</code>, …).',
        },
        {
          name: 'statusChange',
          type: 'OgeBarcodeScannerStatus',
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
            'A standalone SVG of a drawing (<code>ogeBarcodeDrawing</code> lays a symbol out) — for servers and workers.',
        },
        {
          name: 'ogeNativeBarcodeDecoder',
          type: '(formats?) => OgeBarcodeDecoder | null',
          description:
            'The browser’s <code>BarcodeDetector</code> as a decoder, or <code>null</code> where there is none.',
        },
      ],
    },
    {
      title: 'Behavior building blocks (@oge-ui/behavior)',
      entries: [
        {
          name: 'ogeEncodeQr / OgeQrCode / OgeQrOptions',
          type: '(text, { errorCorrection?, minVersion?, mask? }) => OgeQrCode',
          description:
            'The QR encoder: <code>{ version, size, errorCorrection, mask, mode, modules }</code>; <code>minVersion</code> keeps a series of codes one size.',
        },
        {
          name: 'ogeEncodeCode128 / ogeEncodeEan13 / ogeEan13CheckDigit / OgeLinearBarcode',
          type: '(text) => { modules, text }',
          description: 'The linear encoders and the EAN-13 check digit.',
        },
        {
          name: 'ogeBarcodeDrawing / OgeBarcodeDrawing / OgeBarcodeDrawingOptions / OGE_BARCODE_TEXT_HEIGHT',
          type: '(symbol, { quietZone?, barHeight?, showText? }) => OgeBarcodeDrawing',
          description:
            'A symbol laid out in module units: one path of merged dark runs, and the text line.',
        },
        {
          name: 'OgeBarcodeScannerCore / OgeBarcodeScannerCoreOptions / OGE_BARCODE_FORMATS',
          type: 'class',
          description:
            'The scanner’s framework-free half: camera stream, frame loop, decoder and repeat filter; the Shape Detection API names of the three symbologies.',
        },
        {
          name: 'OgeBarcodeSymbol / OgeBarcodeEncodeOptions',
          type: 'types',
          description: 'What <code>ogeEncodeBarcode</code> takes and returns.',
        },
      ],
    },
  ],
};

export const OGE_BARCODE_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeBarcodeConfig()',
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
            'Default QR error correction. Pass a function for a live config.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'provideOgeBarcodeConfig',
          type: '(config: OgeBarcodeConfigInput | (() => OgeBarcodeConfigInput)) => Provider',
          description:
            'Application- or component-scoped defaults; a function makes the config live.',
        },
        {
          name: 'OGE_BARCODE_CONFIG',
          type: 'InjectionToken<OgeBarcodeConfig>',
          description:
            'The resolved config the barcode and the scanner inject.',
        },
        {
          name: 'OGE_DEFAULT_BARCODE_CONFIG',
          type: 'OgeBarcodeConfig',
          description: 'The defaults (from <code>&#64;oge-ui/behavior</code>).',
        },
        {
          name: 'OGE_DEFAULT_BARCODE_MESSAGES',
          type: 'OgeBarcodeMessages',
          description: 'The English catalog.',
        },
        {
          name: 'resolveOgeBarcodeConfig',
          type: '(input?, base?) => OgeBarcodeConfig',
          description: 'Merges a partial config over a base (the defaults).',
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
